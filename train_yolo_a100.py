# train_yolo_a100.py
import os
import torch
from ultralytics import YOLO

def train_sports_yolo():
    # Verify GPU availability
    if not torch.cuda.is_available():
        raise RuntimeError("No CUDA GPU detected. Ensure this is running on your A100 node.")

    print(f"Using GPU: {torch.cuda.get_device_name(0)}")
    
    # 1. Load pretrained baseline
    model = YOLO("yolo11s.pt")  # Use "yolo11x.pt" for maximum capacity

    # 2. Launch high-throughput training
    results = model.train(
        data="soccernet_data.yaml",
        epochs=60,
        imgsz=640,
        batch=64,               # A100 handles large batch sizes easily
        device=0,
        workers=16,             # Multithreaded PyTorch DataLoader workers
        amp=True,               # Automatic mixed precision
        optimizer="AdamW",
        lr0=1e-3,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=3.0,
        save=True,
        save_period=5,
        val=True,
        plots=True,
        project="sports_intelligence",
        name="soccernet_detector"
    )

    print(f"Training complete! Best weights saved to: {model.trainer.best}")

if __name__ == "__main__":
    train_sports_yolo()