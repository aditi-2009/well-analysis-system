import os
import random
import shutil

# -----------------------------
# PATHS
# -----------------------------
IMAGE_DIR = r"tiles/images"
LABEL_DIR = r"tiles/labels"

DATASET_DIR = r"dataset"

TRAIN_RATIO = 0.7
VAL_RATIO = 0.2
TEST_RATIO = 0.1

# -----------------------------

# Create folders
for folder in [
    "images/train",
    "images/val",
    "images/test",
    "labels/train",
    "labels/val",
    "labels/test"
]:
    os.makedirs(os.path.join(DATASET_DIR, folder), exist_ok=True)

# Get images
images = [f for f in os.listdir(IMAGE_DIR) if f.endswith(".tif")]

random.seed(42)
random.shuffle(images)

total = len(images)

train_end = int(total * TRAIN_RATIO)
val_end = train_end + int(total * VAL_RATIO)

train_images = images[:train_end]
val_images = images[train_end:val_end]
test_images = images[val_end:]

print("Total Images:", total)
print("Train:", len(train_images))
print("Validation:", len(val_images))
print("Test:", len(test_images))


def copy_files(image_list, split):

    for image in image_list:

        label = image.replace(".tif", ".txt")

        src_img = os.path.join(IMAGE_DIR, image)
        src_lbl = os.path.join(LABEL_DIR, label)

        dst_img = os.path.join(DATASET_DIR, "images", split, image)
        dst_lbl = os.path.join(DATASET_DIR, "labels", split, label)

        shutil.copy(src_img, dst_img)

        if os.path.exists(src_lbl):
            shutil.copy(src_lbl, dst_lbl)


copy_files(train_images, "train")
copy_files(val_images, "val")
copy_files(test_images, "test")

print("\nDataset split completed successfully!")
