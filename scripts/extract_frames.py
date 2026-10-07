"""Offline-only OpenCV extraction. Run: python scripts/extract_frames.py.

Frame numbers are zero-based and visually calibrated from contact-sheet.jpg.
Output index 0 points RIGHT; indices increase clockwise in screen coordinates.
The source ends at neutral rather than completing a perfect circular loop.
The final upper-left-to-up segment uses the nearest available upward poses.
"""
import sys, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.python-deps'))
import cv2
import numpy as np
from PIL import Image

cap = cv2.VideoCapture(str(root / 'public/character.mp4'))
count, fps = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)), cap.get(cv2.CAP_PROP_FPS)
source = []
while True:
    ok, frame = cap.read()
    if not ok: break
    source.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
cap.release()
assert len(source) == count == 240, 'Reinspect and recalibrate if the source changes.'
poses = {'UP':24,'UP-RIGHT':48,'RIGHT':75,'DOWN-RIGHT':96,'DOWN':121,
         'DOWN-LEFT':148,'LEFT':175,'UP-LEFT':200,'CENTER':239}
corners = np.concatenate([im[30:250,30:300].reshape(-1,3) for im in source[::24]])
colors, frequencies = np.unique(corners, axis=0, return_counts=True)
rgb = colors[np.argmax(frequencies)]
bg = '#' + ''.join(f'{int(v):02x}' for v in rgb)

def flatten(im):
    r,g,b = (im[:,:,i].astype(np.int16) for i in range(3))
    foreground = np.uint8(~((r > 110) & (g < 65) & (b < 65) & (r > 3*g)))
    # Remove the tiny pale marks in the source background, keeping the person.
    n, labels, stats, _ = cv2.connectedComponentsWithStats(foreground)
    largest = 1 + np.argmax(stats[1:,cv2.CC_STAT_AREA])
    mask = np.uint8(labels == largest)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(mask, contours, -1, 1, thickness=cv2.FILLED)
    result = im.copy()
    result[mask == 0] = rgb
    return result

# Keep each complete pose intact; splicing in a neutral torso creates seams.
out = root / 'public/frames'
out.mkdir(exist_ok=True)

def save(im, name):
    im = flatten(im)
    # Preserve the full scene for viewport-cover rendering at every aspect ratio.
    im = cv2.resize(im, (1280,720), interpolation=cv2.INTER_AREA)
    Image.fromarray(im).save(out / name, 'WEBP', quality=90, method=4)

anchors = [75,96,121,148,175,200,24,48,75]
mapping = []
for i in range(64):
    segment, step = divmod(i,8)
    if segment == 5:
        # Use late upward poses, skipping the ending's return to neutral.
        frame = round(200 + step / 7 * 18)
    else:
        frame = round(anchors[segment] + (anchors[segment+1]-anchors[segment])*step/8)
    mapping.append(frame)
    save(source[frame], f'{i:02d}.webp')
save(source[239], 'center.webp')
manifest = {'source': {'frames':count,'fps':fps,'duration':count/fps},
    'background':bg,'backgroundRGB':rgb.tolist(),'poses':poses,
    'frameMap':mapping,'dimensions':[1280,720],'faceCenter':[.5,.43],
    'note':'Source is not a closed loop; UP-LEFT to UP uses the nearest available poses.'}
(out / 'manifest.json').write_text(json.dumps(manifest,indent=2))
(root / 'src/portrait.css').write_text(f':root{{--portrait-bg:{bg};--portrait-ratio:1;}}\n')
print(json.dumps(manifest,indent=2), flush=True)
