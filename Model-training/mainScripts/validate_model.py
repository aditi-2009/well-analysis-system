from pathlib import Path
import numpy as np
from ultralytics import YOLO


def main():
    weights = r"runs\detect\well_finetune\weights\best.pt"
    data = r"D:\path\to\data.yaml"
    imgsz = 320

    if not Path(weights).exists():
        raise SystemExit(f"[ERROR] Weights not found: {weights}")
    if not Path(data).exists():
        raise SystemExit(f"[ERROR] data.yaml not found: {data}")

    model = YOLO(weights)

    for split in ("val", "test"):
        m = model.val(data=data, split=split, imgsz=imgsz, batch=8,
                      conf=0.001, iou=0.5, plots=True, name=f"well_{split}")

        p, r = m.box.mp, m.box.mr
        f1 = 2 * p * r / (p + r + 1e-9)
        print(f"\n[{split.upper()}] Precision={p:.3f}  Recall={r:.3f}  F1={f1:.3f}  "
              f"mAP50={m.box.map50:.3f}  mAP50-95={m.box.map:.3f}")

        # best confidence threshold = the one that maximises F1 on this split
        f1_curve = np.array(m.box.f1_curve).squeeze()
        conf_axis = np.linspace(0, 1, f1_curve.shape[-1])
        best_i = int(np.argmax(f1_curve))
        print(f"[{split.upper()}] Best F1 = {f1_curve[best_i]:.3f} at conf = {conf_axis[best_i]:.2f}")


if __name__ == "__main__":
    main()