# VESTRA Design Studio

VESTRA is a front-end-only 3D apparel design studio built with React + Vite and React Three Fiber (R3F). It provides a garment stage where you can add text and images, position them, rotate the garment via buttons, and export a JSON snapshot of the design.

## Features

- 3D garment viewer (Three.js + @react-three/fiber + @react-three/drei)
- Garment picker: Shirt / Hoodie / Basketball Jacket
- Garment color picker
- Add Text (transparent background)
- Upload Image (local file → image overlay)
- Rotate via small buttons (no mouse-driven rotation)
- Select overlays and nudge position (up/down/left/right) + delete
- Save Design: download JSON

## Stack

- React 18
- Vite 7
- MUI (Material UI)
- Tailwind

## Requirements

- Node.js 20.19+ (or 22.12+) recommended (Vite 7 requirement)
- npm

## Setup

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview the build:

```bash
npm run preview
```

## Required 3D Assets

Place these model files in `public/` (filenames must match exactly):

- `public/shirt_baked.glb`
- `public/hoodie.glb`
- `public/basketball_jacket.glb`

If a model is missing or fails to load, you may see a simple fallback box.

## Usage

1. Open the Design Studio.
2. Drag a garment icon (or click it) to load a garment.
3. Pick a garment color.
4. Click **Add Text** to create a text overlay.
5. Click **Upload Image** to add an image overlay.
6. Click an overlay to select it.
7. Use the arrow buttons to move it, or the trash button to delete it.
8. Use the rotation buttons to rotate the garment.
9. Click **Save Design** to download a JSON snapshot.

## Notes & Limitations

- Front-end only: no backend persistence.
- Upload Image uses the browser file picker; images are loaded locally into the canvas (this app does not upload them anywhere).
- Save exports JSON (not a PNG render).

## Troubleshooting

- **Node/Vite version warning**: upgrade Node to 20.19+ (or 22.12+).
- **Garment shows as a box**: verify the `.glb` exists in `public/` and the name matches exactly.
- **Canvas looks empty**: confirm the page layout provides height for the canvas area.
