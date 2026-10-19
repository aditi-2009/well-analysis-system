r"""
Quick dataset viewer - shows a grid of random crops (with YOLO boxes drawn)
from the generated well_focused_dataset, so you can eyeball dataset quality
without opening thousands of files one by one.

Run:
    python visualize_samples.py --dataset "D:\well detection training\well_focused_dataset" --split train --n 16
"""
import argparse
import random
from pathlib import Path

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def draw_boxes(img, label_path):
    h, w = img.shape[:2]
    if not label_path.exists():
        return img
    with open(label_path) as f:
        for line in f:
            parts = line.split()
            if len(parts) != 5:
                continue
            _, xc, yc, bw, bh = map(float, parts)
            x1 = int((xc - bw / 2) * w)
            y1 = int((yc - bh / 2) * h)
            x2 = int((xc + bw / 2) * w)
            y2 = int((yc + bh / 2) * h)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True, help="Path to well_focused_dataset folder")
    ap.add_argument("--split", default="train", choices=["train", "val", "test"])
    ap.add_argument("--n", type=int, default=16, help="Number of random samples to show")
    args = ap.parse_args()

    img_dir = Path(args.dataset, "images", args.split)
    lbl_dir = Path(args.dataset, "labels", args.split)

    all_imgs = sorted(img_dir.glob("*.jpg"))
    if not all_imgs:
        print(f"No images found in {img_dir}")
        return

    sample = random.sample(all_imgs, min(args.n, len(all_imgs)))
    cols = 4
    rows = (len(sample) + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 3, rows * 3))
    axes = axes.flatten() if rows * cols > 1 else [axes]

    for ax, img_path in zip(axes, sample):
        img = cv2.imread(str(img_path))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        lbl_path = lbl_dir / (img_path.stem + ".txt")
        img = draw_boxes(img, lbl_path)
        ax.imshow(img)
        ax.set_title(img_path.stem, fontsize=8)
        ax.axis("off")

    for ax in axes[len(sample):]:
        ax.axis("off")

    plt.tight_layout()
    out_path = Path(args.dataset, f"sample_grid_{args.split}.png")
    plt.savefig(out_path, dpi=120)
    print(f"Saved sample grid: {out_path}")


if __name__ == "__main__":
    main()
