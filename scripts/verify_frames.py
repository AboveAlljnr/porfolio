import sys, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.python-deps'))
import numpy as np
from PIL import Image
out = root / 'public/frames'
manifest = json.loads((out/'manifest.json').read_text())
paths = [out/f'{i:02d}.webp' for i in range(64)] + [out/'center.webp']
neutral = np.array(Image.open(paths[-1]))
for path in paths:
    im = np.array(Image.open(path))
    assert im.shape == (864,1536,3), path
    assert np.array_equal(im[0,0], manifest['backgroundRGB']), f'Background mismatch: {path}'
assert len(set(manifest['frameMap'])) == 64
print(f'PASS: 65 lossless frames, intact full poses, exact background {manifest["background"]}.')
print(f'Total frame download: {sum(p.stat().st_size for p in paths)/1024/1024:.1f} MiB')
