import sys, time, random
sys.path.insert(0, 'src/data')
import pandas as pd
import numpy as np

print('Loading model...')
t0 = time.time()
from earthquake_risk_inference import load_default_model
model = load_default_model('.')
print(f'Model loaded in {time.time()-t0:.1f}s')

grid = pd.read_csv('results/earthquake_risk_predictions.csv')
print(f'Grid: {len(grid)} rows')

random.seed(42)
sample_idx = sorted(random.sample(range(len(grid)), 20))
sample = grid.iloc[sample_idx].reset_index(drop=True)

diffs = []
cls_matches = []
for _, row in sample.iterrows():
    r = model.predict_location(row['latitude'], row['longitude'])
    d = r['risk_probability'] - row['risk_probability']
    m = r['risk_class'] == int(row['risk_class'])
    diffs.append(abs(d))
    cls_matches.append(m)
    print(f"  {row['latitude']:.4f},{row['longitude']:.4f} grid={row['risk_probability']:.6f} inf={r['risk_probability']:.6f} diff={d:+.6f} cls={'OK' if m else 'MISMATCH'}")

print(f"\nMax diff: {max(diffs):.6f}  Mean diff: {np.mean(diffs):.6f}")
print(f"Class matches: {sum(cls_matches)}/{len(cls_matches)}")

cities = [('Delhi',28.6139,77.2090),('Mumbai',19.0760,72.8777),('Bengaluru',12.9716,77.5946),('Guwahati',26.1445,91.7362),('Srinagar',34.0837,74.7973)]
print()
for name,lat,lon in cities:
    r = model.predict_location(lat,lon)
    print(f"  {name}: prob={r['risk_probability']:.6f} class={r['risk_class']}")
