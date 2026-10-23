# Look at results.csv from training run
import pandas as pd
df = pd.read_csv('runs/detect/wells_detection/wells_run1/results.csv')
print(df[['epoch', 'train/box_loss', 'val/box_loss', 'metrics/mAP50(B)']].tail(20))