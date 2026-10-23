"""
continue_training.py
Fine-tune an already trained YOLO11m well detector (starts from best.pt).

- Mode "finetune": new run initialised from your trained best.pt (use this when
  training finished normally and you want a better model).
- Mode "resume": continue an interrupted run from last.pt (same run, same settings).
"""

import argparse
import sys
from pathlib import Path

from ultralytics import YOLO


def check_inputs(weights, data_yaml):
    if not Path(weights).exists():
        sys.exit(f"[ERROR] Weights not found: {weights}")
    if not Path(data_yaml).exists():
        sys.exit(f"[ERROR] data.yaml not found: {data_yaml}")

    text = Path(data_yaml).read_text()
    for key in ("train:", "val:", "names", "nc:"):
        if key not in text:
            print(f"[WARN] '{key}' not found in data.yaml - check the file "
                  f"(it needs nc and names, e.g. nc: 1 / names: ['well'])")

    # verify the image folders really exist (paths are relative to the yaml file)
    base = Path(data_yaml).parent
    for line in text.splitlines():
        line = line.strip()
        if line.startswith(("train:", "val:", "test:")):
            rel = line.split(":", 1)[1].strip().strip("'\"")
            p = (base / rel).resolve()
            status = "OK" if p.exists() else "MISSING"
            n = len(list(p.glob("*"))) if p.exists() else 0
            print(f"[CHECK] {line.split(':')[0]:5s} -> {p}  [{status}, {n} files]")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["finetune", "resume"], default="finetune")
    ap.add_argument("--weights", required=True,
                    help="finetune: path to best.pt | resume: path to last.pt")
    ap.add_argument("--data", required=True, help="Path to data.yaml")
    ap.add_argument("--epochs", type=int, default=100)
    ap.add_argument("--imgsz", type=int, default=320)
    ap.add_argument("--batch", type=int, default=8)
    ap.add_argument("--lr0", type=float, default=0.001, help="Lower than default (0.01) for fine-tuning")
    ap.add_argument("--patience", type=int, default=30)
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--project", default="runs/detect")
    ap.add_argument("--name", default="well_finetune")
    args = ap.parse_args()

    check_inputs(args.weights, args.data)
    model = YOLO(args.weights)

    if args.mode == "resume":
        # continues the interrupted run with its original settings
        model.train(resume=True)
    else:
        model.train(
            data=args.data,
            epochs=args.epochs,
            imgsz=args.imgsz,          # use the same size as the first training (or larger, e.g. 416/512)
            batch=args.batch,          # lower this if you get CUDA out-of-memory
            workers=args.workers,
            device=0,
            project=args.project,
            name=args.name,
            exist_ok=False,

            # --- fine-tuning settings ---
            optimizer="AdamW",
            lr0=args.lr0,              # small learning rate so good weights are not destroyed
            lrf=0.01,
            cos_lr=True,
            warmup_epochs=1,
            patience=args.patience,    # early stop if no improvement
            close_mosaic=15,           # last 15 epochs without mosaic
            amp=True,
            cache=False,

            # --- augmentation for top-down satellite images ---
            fliplr=0.5,
            flipud=0.5,
            degrees=10,
            hsv_h=0.015,
            hsv_s=0.5,
            hsv_v=0.3,
            scale=0.3,
            mosaic=1.0,
            mixup=0.0,
            plots=True,
        )

    # ---- final evaluation on val and test ----
    best = Path(model.trainer.save_dir) / "weights" / "best.pt"
    print(f"\n[INFO] Best weights: {best}")
    final = YOLO(str(best))
    for split in ("val", "test"):
        try:
            m = final.val(data=args.data, split=split, imgsz=args.imgsz, conf=0.25, plots=True)
            print(f"[{split.upper()}] P={m.box.mp:.3f}  R={m.box.mr:.3f}  "
                  f"mAP50={m.box.map50:.3f}  mAP50-95={m.box.map:.3f}")
        except Exception as e:
            print(f"[WARN] Could not evaluate '{split}' split: {e}")


if __name__ == "__main__":
    main()   # the main() guard is required on Windows for dataloader workers