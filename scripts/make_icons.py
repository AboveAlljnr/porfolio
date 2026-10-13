"""Generate the raster favicon set from the brand mark.

Google Search does not accept SVG favicons, so the site needs pixel-format
icons (PNG/ICO) in addition to public/favicon.svg. This script rasterises the
same mark with Pillow only -- no browser or SVG renderer required.

Usage: python scripts/make_icons.py
Pillow is picked up from the system install or the local .python-deps folder.
"""
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / ".python-deps"))
from PIL import Image, ImageDraw  # noqa: E402

BRAND = (224, 9, 7, 255)   # #e00907
WHITE = (255, 255, 255, 255)
SUPERSAMPLE = 8            # draw large, then downsample for smooth edges

# The "A" from public/favicon.svg, in its 64x64 viewBox coordinates.
OUTER = [(14, 47), (29, 17), (35, 17), (50, 47), (42, 47), (39, 40), (25, 40), (22, 47)]
COUNTER = [(28, 33), (36, 33), (32, 23)]


def render(size, rounded):
    """Render the mark at `size` px. `rounded` matches the tab favicon."""
    big = size * SUPERSAMPLE
    scale = big / 64
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if rounded:
        draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=16 * scale, fill=BRAND)
    else:
        draw.rectangle([0, 0, big, big], fill=BRAND)
    draw.polygon([(x * scale, y * scale) for x, y in OUTER], fill=WHITE)
    draw.polygon([(x * scale, y * scale) for x, y in COUNTER], fill=BRAND)
    return img.resize((size, size), Image.LANCZOS)


def main():
    out = root / "public"
    rounded = render(512, rounded=True)
    square = render(512, rounded=False)

    # Legacy browsers and Google's /favicon.ico fallback lookups.
    rounded.save(out / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for size in (16, 32, 96):
        rounded.resize((size, size), Image.LANCZOS).save(out / f"favicon-{size}x{size}.png")

    # Full-bleed variants: iOS/Android mask the corners themselves.
    square.resize((180, 180), Image.LANCZOS).save(out / "apple-touch-icon.png")
    square.resize((192, 192), Image.LANCZOS).save(out / "android-chrome-192x192.png")
    square.resize((512, 512), Image.LANCZOS).save(out / "android-chrome-512x512.png")

    ico = Image.open(out / "favicon.ico")
    print(f"PASS: favicon.ico {sorted(ico.ico.sizes())}, "
          f"PNG 16/32/96, apple-touch 180, android 192/512.")


if __name__ == "__main__":
    main()
