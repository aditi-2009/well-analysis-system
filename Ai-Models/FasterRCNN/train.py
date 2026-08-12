import os
import torch
from PIL import Image
from torch.utils.data import Dataset, DataLoader
import torchvision
from torchvision.transforms import functional as F

# -----------------------
# Dataset
# -----------------------


class WellDataset(Dataset):
    def __init__(self, images_dir, labels_dir):
        self.images_dir = images_dir
        self.labels_dir = labels_dir

        self.images = sorted([
            f for f in os.listdir(images_dir)
            if f.endswith((".jpg", ".png", ".jpeg"))
        ])

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):

        image_name = self.images[idx]

        image_path = os.path.join(self.images_dir, image_name)
        label_path = os.path.join(
            self.labels_dir,
            os.path.splitext(image_name)[0] + ".txt"
        )

        image = Image.open(image_path).convert("RGB")

        w, h = image.size

        boxes = []
        labels = []

        if os.path.exists(label_path):
            with open(label_path) as f:
                for line in f.readlines():

                    cls, xc, yc, bw, bh = map(float, line.split())

                    xmin = (xc - bw / 2) * w
                    ymin = (yc - bh / 2) * h
                    xmax = (xc + bw / 2) * w
                    ymax = (yc + bh / 2) * h

                    boxes.append([xmin, ymin, xmax, ymax])
                    labels.append(1)

        boxes = torch.as_tensor(boxes, dtype=torch.float32)
        labels = torch.as_tensor(labels, dtype=torch.int64)

        target = {
            "boxes": boxes,
            "labels": labels
        }

        image = F.to_tensor(image)

        return image, target


# -----------------------
# Collate Function
# -----------------------

def collate_fn(batch):
    return tuple(zip(*batch))


# -----------------------
# Dataset Paths
# -----------------------

train_dataset = WellDataset(
    "../dataset/images/train",
    "../dataset/labels/train"
)

val_dataset = WellDataset(
    "../dataset/images/val",
    "../dataset/labels/val"
)

train_loader = DataLoader(
    train_dataset,
    batch_size=2,
    shuffle=True,
    collate_fn=collate_fn
)

val_loader = DataLoader(
    val_dataset,
    batch_size=2,
    shuffle=False,
    collate_fn=collate_fn
)

# -----------------------
# Model
# -----------------------

model = torchvision.models.detection.fasterrcnn_resnet50_fpn(
    weights="DEFAULT"
)

num_classes = 2

in_features = model.roi_heads.box_predictor.cls_score.in_features

model.roi_heads.box_predictor = \
torchvision.models.detection.faster_rcnn.FastRCNNPredictor(
    in_features,
    num_classes
)

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

model.to(device)

# -----------------------
# Optimizer
# -----------------------

optimizer = torch.optim.SGD(
    model.parameters(),
    lr=0.005,
    momentum=0.9,
    weight_decay=0.0005
)

# -----------------------
# Training
# -----------------------

epochs = 10

for epoch in range(epochs):

    model.train()

    total_loss = 0

    for images, targets in train_loader:

        images = [img.to(device) for img in images]

        targets = [
            {
                k: v.to(device)
                for k, v in t.items()
            }
            for t in targets
        ]

        loss_dict = model(images, targets)

        losses = sum(loss for loss in loss_dict.values())

        optimizer.zero_grad()

        losses.backward()

        optimizer.step()

        total_loss += losses.item()

    print(
        f"Epoch {epoch+1}/{epochs}  Loss: {total_loss:.4f}"
    )

torch.save(model.state_dict(), "best_fasterrcnn.pth")

print("Training Complete.")