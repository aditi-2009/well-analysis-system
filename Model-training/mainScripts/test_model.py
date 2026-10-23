from pathlib import Path
import numpy as np
from ultralytics import YOLO

WEIGHTS = r"runs\detect\well_finetune\weights\best.pt"
TEST_IMAGES = r"D:\path\to\test\images"
TEST_LABELS = r"D:\path\to\test\labels"
DATA_YAML = r"D:\path\to\data.yaml"
IMGSZ = 320
CONF = 0.25          # use the threshold chosen on the VALIDATION split
IOU_MATCH = 0.5
IMG_EXT = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}


def iou(a, b):
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def load_gt(label_path, w, h):
    boxes = []
    if label_path.exists():
        for line in label_path.read_text().splitlines():
            p = line.split()
            if len(p) >= 5:
                _, xc, yc, bw, bh = map(float, p[:5])
                boxes.append([(xc - bw / 2) * w, (yc - bh / 2) * h,
                              (xc + bw / 2) * w, (yc + bh / 2) * h])
    return boxes


def main():
    for p in (WEIGHTS, TEST_IMAGES, TEST_LABELS, DATA_YAML):
        if not Path(p).exists():
            raise SystemExit(f"[ERROR] Not found: {p}")

    model = YOLO(WEIGHTS)

    # ---- official metrics on the test split ----
    m = model.val(data=DATA_YAML, split="test", imgsz=IMGSZ, conf=CONF,
                  iou=IOU_MATCH, plots=True, name="well_test")
    p, r = m.box.mp, m.box.mr
    f1 = 2 * p * r / (p + r + 1e-9)
    print(f"\n[TEST] P={p:.3f}  R={r:.3f}  F1={f1:.3f}  "
          f"mAP50={m.box.map50:.3f}  mAP50-95={m.box.map:.3f}")

    # ---- TP / FP / FN counting + saved prediction images ----
    images = sorted(f for f in Path(TEST_IMAGES).iterdir() if f.suffix.lower() in IMG_EXT)
    if not images:
        raise SystemExit("[ERROR] No images found in the test folder")

    TP = FP = FN = 0
    results = model.predict(source=[str(f) for f in images], imgsz=IMGSZ, conf=CONF,
                            save=True, name="well_test_pred", stream=True, verbose=False)

    for img_path, res in zip(images, results):
        h, w = res.orig_shape
        gt = load_gt(Path(TEST_LABELS) / f"{img_path.stem}.txt", w, h)
        preds = res.boxes.xyxy.cpu().numpy().tolist() if res.boxes is not None else []
        confs = res.boxes.conf.cpu().numpy().tolist() if res.boxes is not None else []

        matched = set()
        for pb, _ in sorted(zip(preds, confs), key=lambda x: -x[1]):
            best_j, best_iou = -1, 0.0
            for j, g in enumerate(gt):
                if j in matched:
                    continue
                v = iou(pb, g)
                if v > best_iou:
                    best_iou, best_j = v, j
            if best_iou >= IOU_MATCH:
                TP += 1
                matched.add(best_j)
            else:
                FP += 1
        FN += len(gt) - len(matched)

    prec = TP / (TP + FP) if TP + FP else 0.0
    rec = TP / (TP + FN) if TP + FN else 0.0
    f1c = 2 * prec * rec / (prec + rec) if prec + rec else 0.0

    print("\n========== TEST COUNTS ==========")
    print(f"Images tested : {len(images)}")
    print(f"TP (correct)  : {TP}")
    print(f"FP (false)    : {FP}")
    print(f"FN (missed)   : {FN}")
    print(f"Precision={prec:.3f}  Recall={rec:.3f}  F1={f1c:.3f}")
    print("=================================")
    print("Annotated images: runs\\detect\\well_test_pred")


if __name__ == "__main__":
    main()