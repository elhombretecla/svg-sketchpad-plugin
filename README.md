# SVG Sketchpad — Penpot Plugin

A lightweight vector drawing editor that runs inside Penpot as a plugin. Draw paths, rectangles, and ellipses with full Bézier curve support, then insert the illustration directly into your Penpot canvas with a single click.

---

## Features

### Drawing Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| Select | `V` | Click to select shapes, drag to move, rubber-band marquee for multi-select |
| Pen | `P` | Click to place corner nodes, click+drag to create smooth Bézier handles. Click the first node (≥ 3 nodes) to close the path. `Enter` finalizes as open path, `Escape` discards |
| Node | `A` | Edit individual path nodes and control handles — select, drag, reshape |
| Rectangle | `R` | Drag to create. Hold `Shift` to constrain to a square |
| Ellipse | `E` | Drag to create. Hold `Shift` to constrain to a circle |

### Node Editing (Node tool)

- **Click** a node to select it; **Shift+click** for multi-select
- **Drag** a selected node to reposition it (handles follow)
- **Drag** a control handle to reshape the Bézier curve — smooth/symmetric constraints enforced automatically
- **Drag** a segment directly to push the curve while keeping both endpoints fixed
- **Delete / Backspace** removes selected nodes; path is auto-deleted if too few nodes remain
- **1 / 2 / 3** converts selected nodes to Corner / Smooth / Symmetric
- **Node toolbar** (appears when nodes are selected): Corner, Smooth, Symmetric, and Delete buttons

### Convert to Path

The **Convert to Path** button (⇒) transforms:
- **Rectangles** → 4-corner closed path
- **Ellipses** → 4-node smooth closed path with mathematically correct kappa handles (k ≈ 0.5523)

After conversion the shape is selected and the Node tool is activated automatically for immediate editing.

### Style Inspector (right panel)

- **Fill**: color picker + hex input + opacity; can be toggled off for stroke-only shapes
- **Stroke**: color picker, width, type (solid / dashed / dotted), position (center / inside / outside), opacity

### Canvas Controls

- **Zoom**: mouse wheel or `+` / `-` buttons in the toolbar
- **Pan**: hold `Space` + drag, or middle mouse drag
- **Fit canvas**: fit button in the toolbar
- **Grid**: toggles between 50 px and 10 px grid based on zoom level
- **Snap**: pixel, grid, node, or disabled — configurable from the toolbar
- **Alignment**: align/distribute selected shapes (left, center, right, top, middle, bottom, distribute H/V)

### Penpot Integration

- **Insert into Penpot**: click the arrow-up button → confirm → the illustration is serialized as SVG and inserted into the current Penpot page via `penpot.createShapeFromSvg()`, centered on the viewport
- After a successful insert the plugin closes automatically
- Error messages are shown inline if the document is empty or if insertion fails

---

## Architecture

```
src/
├── plugin.ts              # Plugin backend — runs in Penpot context
├── main.tsx               # UI entry point (Preact app)
├── plugin/
│   ├── penpotBridge.ts    # Typed message-passing between UI ↔ plugin backend
│   └── insertSvg.ts       # Calls penpot.createShapeFromSvg(), positions shape
├── editor/
│   ├── Geometry.ts        # Point math, cubic Bézier evaluation, drag-segment
│   ├── Node.ts            # PathNode types, moveNode, moveHandle, convertNodeType
│   ├── PathOps.ts         # addNodeAtSegment, addNodeAtPoint, deleteNodes
│   ├── Shape.ts           # Shape types, factory functions, SVG path data, hit-testing
│   ├── Document.ts        # EditorDocument, addShape, updateShape, documentToSvg
│   └── ConvertToPath.ts   # rect/ellipse → PathShape conversion
├── canvas/
│   ├── CanvasRenderer.ts  # SVG renderer: grid, shapes, selection, pen/node/preview overlays
│   └── PanZoom.ts         # Viewport transform helpers
├── tools/
│   ├── BaseTool.ts        # Tool interface + CanvasPointerEvent
│   ├── ToolController.ts  # Manages active tool, routes events
│   ├── SelectTool.ts      # Click select, drag move, rubber-band
│   ├── PenTool.ts         # Path creation state machine
│   ├── NodeTool.ts        # Node/handle/segment editing state machine
│   └── ShapeTools.ts      # RectangleTool + EllipseTool
└── ui/
    ├── state/editorStore.ts   # Zustand store (document, selection, tool, style, …)
    └── components/
        ├── EditorLayout.tsx
        ├── Canvas.tsx
        ├── Toolbar.tsx
        ├── ToolsPanel.tsx
        ├── Inspector.tsx
        ├── NodeToolbar.tsx
        └── Footer.tsx
```

**Tech stack**: Preact · Zustand · TypeScript · Vite · `@penpot/plugin-types`

**Rendering**: Pure SVG with DOM diffing — three layers (grid / content / overlay). No Canvas 2D, no WebGL.

---

## Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- A running Penpot instance (cloud or self-hosted)

### Install

```bash
git clone <your-repo-url>
cd <project-name>
npm install
```

### Development

```bash
npm run dev
```

Starts Vite in watch mode. The plugin UI is served at `http://localhost:4400`.

### Load in Penpot

1. Open any Penpot file
2. Press `Ctrl + Alt + P` to open the Plugin Manager
3. Paste the manifest URL: `http://localhost:4400/manifest.json`
4. Click **Install** — the plugin appears in your plugin list

> The plugin requires `content:read` and `content:write` permissions to insert shapes.

### Production Build

```bash
npm run build
```

Output goes to `dist/`. Deploy the contents of `dist/` to any static hosting (Netlify, Vercel, GitHub Pages, etc.) and register the hosted `manifest.json` URL in Penpot.

---

## Message Protocol

Communication between the Preact UI (iframe) and the plugin backend (`plugin.ts`) uses typed postMessage:

| Direction | Message type | Payload | Description |
|-----------|-------------|---------|-------------|
| UI → Plugin | `ready` | — | UI loaded and ready |
| Plugin → UI | `viewport-info` | `{ centerX, centerY }` | Viewport center for positioning |
| UI → Plugin | `insert-svg` | `{ svg, width, height }` | Insert SVG into canvas |
| Plugin → UI | `insert-result` | `{ success, error? }` | Result of insertion |
| UI → Plugin | `close` | — | Close the plugin |
| Plugin → UI | `themechange` | `"light" \| "dark"` | Penpot theme changed |

---

## Keyboard Reference

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `P` | Pen tool |
| `A` | Node tool |
| `R` | Rectangle tool |
| `E` | Ellipse tool |
| `Shift` + drag | Constrain shape to square/circle |
| `Enter` | Finalize open path (Pen tool) |
| `Escape` | Cancel path / deselect |
| `Delete` / `Backspace` | Delete selected nodes or shapes |
| `1` | Convert node(s) to Corner |
| `2` | Convert node(s) to Smooth |
| `3` | Convert node(s) to Symmetric |
| `Space` + drag | Pan canvas |
| Mouse wheel | Zoom |

---

## License

MIT
