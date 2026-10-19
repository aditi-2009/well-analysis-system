"""
train.py — Train YOLOv11m for well detection
"""

from ultralytics import YOLO
import os

# -----------------------------
# Config
# -----------------------------
DATA_YAML = "data/dataset/data.yaml"   # adjust if your yaml is elsewhere
IMG_SIZE = 640
EPOCHS = 150
BATCH_SIZE = 16
PROJECT_DIR = "runs/train"
RUN_NAME = "wells_yolo11m"

TRUE_FROM_SCRATCH = False  # True = random init (no pretrained weights)
                            # False = fine-tune from yolo11m.pt (recommended)

# -----------------------------
# Model init
# -----------------------------
if TRUE_FROM_SCRATCH:
    # Loads architecture only, random-initialized weights
    model = YOLO("yolo11m.yaml")
else:
    # Loads COCO-pretrained weights for transfer learning
    model = YOLO("yolo11m.pt")

# -----------------------------
# Train
# -----------------------------
results = model.train(
    data=DATA_YAML,
    imgsz=IMG_SIZE,
    epochs=EPOCHS,
    batch=BATCH_SIZE,
    project=PROJECT_DIR,
    name=RUN_NAME,
    patience=0,          # early stopping if val metrics plateau
    save=True,
    save_period=10,       # checkpoint every 10 epochs
    device="cpu",           # GPU index; use 'cpu' if no GPU
    workers=4,
    optimizer="auto",
    seed=42,
    verbose=True,
    # Augmentation — mild defaults, adjust based on your imagery
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,
    degrees=0.0,
    translate=0.1,
    scale=0.5,
    fliplr=0.5,
    flipud=0.0,
    mosaic=1.0,
)

# -----------------------------
# Validate on test set after training
# -----------------------------
metrics = model.val(data=DATA_YAML, split="test")
print(metrics)