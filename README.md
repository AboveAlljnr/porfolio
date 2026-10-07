# Interactive portfolio hero

Run `npm install`, then `npm run dev`. Build with `npm run build`.

The browser initially loads only the neutral image (~65 KB). On fine-pointer devices, mouse movement requests the selected pose and its two neighbours, with at most three concurrent requests. Queued obsolete requests are dropped. Touch users can drag horizontally across the hero to direct the portrait; vertical scrolling remains available and resets the pose. A short welcome glance plays once on touch devices after three poses load. Reduced-motion and data-saving users keep the static portrait. A normal image provides a fallback while the canvas initializes. It never loads, seeks,
or plays the MP4. The canvas replaces its entire opaque bitmap with exactly
one decoded frame when the selected pose changes. Shortest-path angular
interpolation uses 0.26 at 60 Hz, normalized for other refresh rates.

The canvas covers the viewport using an aspect-preserving cover crop of the
1280 × 720 scene, scaled to 70% and anchored at the bottom. Cursor direction is measured around the face at 50%
horizontal / 43% vertical in the source, including the crop offset.
The neutral deadzone is 12% of the shorter viewport dimension. Pointer exit,
window blur, and reduced-motion preferences also select the neutral frame.

## Offline extraction

Install Python dependencies with `python -m pip install opencv-python pillow`.
Run `python scripts/inspect_video.py` for the timeline and contact sheet, then
`python scripts/extract_frames.py` to rebuild the images. The script also
supports dependencies installed locally in `.python-deps`.

`public/frames/manifest.json` records exact zero-based directional frame
numbers, all 64 source selections, and the measured dominant background RGB.
The source background has shading and small artifacts; extraction flattens
the background to its measured modal color while preserving each complete head, neck, and torso pose before saving quality-90 WebP images. There is no runtime frame blending. All 65 optimized images total approximately 4.1 MiB; they are not downloaded up front.

The source ends in neutral, not a perfectly closed circular trajectory.
The upper-left-to-up wrap uses the nearest available upward poses and may
show a small source-pose discontinuity. Exact 0.26 angular smoothing has a
roughly 55 ms time constant at 60 Hz (about 128 ms to reach 90% of a step);
35 ms full settling and guaranteed zero lag are not physically accurate claims.

The floating navigation uses 20px backdrop blur. A separate magnetic cursor
follows fine pointers, attracts toward links, and enlarges its trailing aura
on hover. Touch and reduced-motion users retain the native cursor.

Portfolio content is adapted from the previous portfolio draft: Courage Agbavor / Above All, four selected projects, expertise, education, and contact links. Project data lives in src/content.jsx; screenshots live in public/projects.

The hero links to selected work instead of offering a sample resume. Add an actual resume PDF before introducing a download link. Live project destinations and background details are inherited from the old draft and should be reviewed before publication.


## Before publishing

Build command: `npm run build`; output directory: `dist`.

A branded 1200 × 630 PNG is included at `/social-preview.png`, with editable SVG source alongside it. Once the final site address is known, set `og:image` and `twitter:image` to its absolute HTTPS image URL and add `og:url` and a canonical URL. Do not use the localhost address.

Email copying, keyboard focus, internal targets, and mouse-triggered portrait loading were checked in the browser. A reliable phone-sized screenshot could not be captured with this browser session; verify 320–430 px widths on a phone before deployment. Confirm education, experience, and project stack details personally; supply an actual resume PDF before adding a download.
