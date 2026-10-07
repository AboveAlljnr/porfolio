import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.python-deps'))
import cv2
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
cap = cv2.VideoCapture(str(root / 'public/character.mp4'))
n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
print(json.dumps({'frames': n, 'fps': fps, 'seconds': n/fps, 'width': cap.get(3), 'height': cap.get(4)}), flush=True)
indices = np.linspace(0, n-1, 80).astype(int)
sheet = Image.new('RGB', (1200, 8*180), '#ffffff')
draw = ImageDraw.Draw(sheet)
selected = {int(i):j for j,i in enumerate(indices)}
for i in range(n):
    ok, frame = cap.read()
    if not ok: break
    if i not in selected: continue
    j = selected[i]
    im = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    im.thumbnail((150, 154))
    x, y = (j%8)*150, (j//8)*144
    sheet.paste(im, (x,y))
    draw.text((x+4,y+124), f'{i} / {i/fps:.2f}s', fill='black')
sheet.save(root / 'contact-sheet.jpg')
