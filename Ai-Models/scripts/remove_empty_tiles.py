import os

IMAGE_FOLDER = r"tiles/images"
LABEL_FOLDER = r"tiles/labels"

deleted = 0
kept = 0

for label_file in os.listdir(LABEL_FOLDER):

    if not label_file.endswith(".txt"):
        continue

    label_path = os.path.join(LABEL_FOLDER, label_file)

    # Check if label file is empty
    if os.path.getsize(label_path) == 0:

        image_name = os.path.splitext(label_file)[0] + ".tif"
        image_path = os.path.join(IMAGE_FOLDER, image_name)

        # Delete label
        os.remove(label_path)

        # Delete corresponding image
        if os.path.exists(image_path):
            os.remove(image_path)

        deleted += 1
        print(f"Deleted: {image_name}")

    else:
        kept += 1

print("\nFinished!")
print("Tiles deleted:", deleted)
print("Tiles kept:", kept)