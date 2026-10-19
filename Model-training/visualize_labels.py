"""
Visualize YOLO labels by drawing boxes on sample tiles.
Run this to confirm boxes land on real wells before training.
"""

import cv2
from pathlib import Path

def visualize_tile(img_path, lbl_path, output_path):
    """Draw YOLO-format labels on an image and save."""
    img = cv2.imread(str(img_path))
    h, w = img.shape[:2]
    
    if not lbl_path.exists():
        print(f"No label file: {lbl_path}")
        return
    
    with open(lbl_path) as f:
        lines = f.read().strip().split('\n')
    
    if not lines or lines[0] == '':
        print(f"Empty labels for {img_path.name}")
        return
    
    for line in lines:
        parts = line.split()
        if len(parts) < 5:
            continue
        class_id, x_c, y_c, bw, bh = map(float, parts)
        
        # Denormalize to pixel coordinates
        x_c_px = x_c * w
        y_c_px = y_c * h
        bw_px = bw * w
        bh_px = bh * h
        
        # Convert center to top-left
        x1 = int(x_c_px - bw_px / 2)
        y1 = int(y_c_px - bh_px / 2)
        x2 = int(x_c_px + bw_px / 2)
        y2 = int(y_c_px + bh_px / 2)
        
        # Draw box (green) and label
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(img, f"well", (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 
                    0.5, (0, 255, 0), 1)
    
    cv2.imwrite(str(output_path), img)
    print(f"Saved: {output_path}")

# Visualize a few samples from train split
train_img_dir = Path("data/dataset/train/images")
train_lbl_dir = Path("data/dataset/train/labels")
viz_dir = Path("data/viz_labeled")
viz_dir.mkdir(exist_ok=True)

# Get first 5 tiles with labels
sample_tiles = sorted(train_img_dir.glob("*.jpg"))[:10]

for img_path in sample_tiles:
    lbl_path = train_lbl_dir / img_path.stem / f"{img_path.stem}.txt"
    lbl_path = train_lbl_dir / f"{img_path.stem}.txt"  # Correct path
    output = viz_dir / f"{img_path.stem}_viz.jpg"
    
    print(f"Visualizing {img_path.name}...")
    visualize_tile(img_path, lbl_path, output)

print(f"\nVisualized tiles saved to: {viz_dir}")
print("Open these images in VS Code to verify boxes land on wells.")