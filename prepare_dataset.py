# prepare_dataset_parallel.py
import os
import glob
import random
import configparser
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

NUM_WORKERS = 16  # Adjust based on CPU core availability

def process_single_sequence(seq_path, out_img_dir, out_lbl_dir):
    seq_name = os.path.basename(seq_path)
    gt_file = os.path.join(seq_path, "gt", "gt.txt")
    img_dir = os.path.join(seq_path, "img1")
    ini_file = os.path.join(seq_path, "seqinfo.ini")

    if not os.path.exists(gt_file) or not os.path.exists(ini_file):
        return seq_name, 0

    config = configparser.ConfigParser()
    config.read(ini_file)
    img_w = float(config['Sequence']['imWidth'])
    img_h = float(config['Sequence']['imHeight'])

    # Parse ground truth bounding boxes
    annotations = {}
    with open(gt_file, 'r') as f:
        for line in f:
            parts = line.strip().split(',')
            frame_id = int(parts[0])
            x, y, w, h = float(parts[2]), float(parts[3]), float(parts[4]), float(parts[5])
            
            if w <= 0 or h <= 0:
                continue

            # Convert MOT [left, top, w, h] to YOLO [x_center, y_center, w, h] normalized
            x_center = (x + w / 2.0) / img_w
            y_center = (y + h / 2.0) / img_h
            norm_w = w / img_w
            norm_h = h / img_h

            line_entry = f"0 {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}\n"
            annotations.setdefault(frame_id, []).append(line_entry)

    # Process all image frames for this sequence
    img_files = glob.glob(os.path.join(img_dir, "*.jpg"))
    for img_path in img_files:
        frame_num = int(os.path.splitext(os.path.basename(img_path))[0])
        base_name = f"{seq_name}_{frame_num:06d}"

        dst_img = os.path.join(out_img_dir, f"{base_name}.jpg")
        if not os.path.exists(dst_img):
            os.symlink(os.path.abspath(img_path), dst_img)

        if frame_num in annotations:
            lbl_file = os.path.join(out_lbl_dir, f"{base_name}.txt")
            with open(lbl_file, "w") as out_f:
                out_f.writelines(annotations[frame_num])

    return seq_name, len(img_files)

def build_splits_multithreaded(soccernet_dir="./SoccerNetData/tracking/train", output_dir="./soccernet_yolo", val_ratio=0.2):
    sequences = sorted([d for d in glob.glob(f"{soccernet_dir}/*") if os.path.isdir(d)])
    
    if not sequences:
        print(f"Error: No sequences found in {soccernet_dir}")
        return

    random.seed(42)
    random.shuffle(sequences)

    split_idx = int(len(sequences) * (1 - val_ratio))
    splits = {
        "train": sequences[:split_idx],
        "val": sequences[split_idx:]
    }

    print(f"Found {len(sequences)} total sequences.")
    print(f"Assigning {len(splits['train'])} to 'train' and {len(splits['val'])} to 'val'.")
    print(f"Launching processing across {NUM_WORKERS} parallel worker threads...\n")

    for split_name, seq_list in splits.items():
        img_dir = os.path.join(output_dir, split_name, "images")
        lbl_dir = os.path.join(output_dir, split_name, "labels")
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)

        with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            futures = {
                executor.submit(process_single_sequence, seq, img_dir, lbl_dir): seq 
                for seq in seq_list
            }
            
            with tqdm(total=len(futures), desc=f"Converting {split_name.upper()} split", unit="seq") as pbar:
                for future in as_completed(futures):
                    seq_name, frame_count = future.result()
                    pbar.update(1)

    # Generate YOLO configuration file
    yaml_content = f"""path: {os.path.abspath(output_dir)}
train: train/images
val: val/images
names:
  0: player
"""
    yaml_path = os.path.abspath("soccernet_data.yaml")
    with open(yaml_path, "w") as f:
        f.write(yaml_content)

    print(f"\nAll splits converted successfully!")
    print(f"YAML config saved to: {yaml_path}")

if __name__ == "__main__":
    build_splits_multithreaded()