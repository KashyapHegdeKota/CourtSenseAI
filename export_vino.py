# export_openvino.py
from ultralytics import YOLO

CHECKPOINT = "/scratch/kkota3/CourtSenseAI/runs/detect/sports_intelligence/soccernet_detector-2/weights/best.pt"

print(f"Loading trained weights from {CHECKPOINT}...")
model = YOLO(CHECKPOINT)

print("Exporting model to OpenVINO FP16...")
export_path = model.export(format="openvino", half=True, imgsz=640)
print(f"Export successful! Engine directory: {export_path}")