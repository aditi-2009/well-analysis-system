"""Generate the wells.yaml dataset descriptor Ultralytics expects."""

import yaml
import config as C

def main():
    data = {
        "path": str(C.DATASET_ROOT.resolve()),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": C.CLASS_NAMES,
    }
    out_path = C.DATASET_ROOT / "wells.yaml"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False)
    print(f"Wrote {out_path}")

if __name__ == "__main__":
    main()
