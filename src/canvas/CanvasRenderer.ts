import type { EditorDocument } from "../editor/Document";
import type { Shape, PathShape } from "../editor/Shape";
import { shapeToSvgD, shapeBoundingBox, hitTestShape } from "../editor/Shape";
import type { BoundingBox, Point } from "../editor/Geometry";
import type { PanZoomState } from "./PanZoom";
import type { ToolType } from "../tools/BaseTool";
import type { PenState } from "../ui/state/editorStore";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
  }
  return el;
}

/**
 * High-performance SVG renderer for the editor canvas.
 *
 * Layer structure (bottom to top):
 *   1. Grid layer - background grid lines + document bounds
 *   2. Content layer - actual shapes (paths, rects, ellipses)
 *   3. Overlay layer - selection boxes, rubber-band rect
 */
export class CanvasRenderer {
  private svg: SVGSVGElement;
  private gridLayer: SVGGElement;
  private contentLayer: SVGGElement;
  private overlayLayer: SVGGElement;

  // DOM element cache keyed by shape id for efficient updates
  private shapeElements = new Map<string, SVGElement>();

  // Cached rubber-band rect element (reused)
  private rubberBandEl: SVGRectElement | null = null;

  constructor(container: HTMLElement) {
    this.svg = svgEl("svg", { width: "100%", height: "100%" });
    this.svg.style.display = "block";
    this.svg.style.userSelect = "none";

    this.gridLayer = svgEl("g", { class: "grid-layer" });
    this.contentLayer = svgEl("g", { class: "content-layer" });
    this.overlayLayer = svgEl("g", { class: "overlay-layer" });

    this.svg.append(this.gridLayer, this.contentLayer, this.overlayLayer);
    container.appendChild(this.svg);
  }

  get element(): SVGSVGElement {
    return this.svg;
  }

  // --- Main render ---

  render(
    doc: EditorDocument,
    panZoom: PanZoomState,
    selection: string[],
    rubberBand: BoundingBox | null,
    activeTool?: ToolType,
    nodeSelection?: number[],
    penState?: PenState | null,
    shapePreview?: Shape | null
  ): void {
    this.applyTransform(panZoom);
    this.renderGrid(doc, panZoom);
    this.syncShapes(doc);
    this.renderSelection(selection, doc, panZoom);
    this.renderRubberBand(rubberBand, panZoom);
    this.renderShapePreview(shapePreview ?? null, panZoom);
    this.renderPenPreview(penState ?? null, panZoom);
    this.renderNodeOverlay(
      activeTool ?? "select",
      nodeSelection ?? [],
      selection,
      doc,
      panZoom
    );
  }

  // --- Transform ---

  private applyTransform(pz: PanZoomState): void {
    const t = `translate(${pz.offset.x},${pz.offset.y}) scale(${pz.zoom})`;
    this.contentLayer.setAttribute("transform", t);
  }

  // --- Grid ---

  private renderGrid(doc: EditorDocument, pz: PanZoomState): void {
    this.gridLayer.innerHTML = "";
    if (pz.zoom < 0.3) return;

    const rect = this.svg.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    const gridSize = pz.zoom >= 2 ? 10 : 50;
    const color = "var(--foreground-secondary)";

    const startX =
      Math.floor(-pz.offset.x / pz.zoom / gridSize) * gridSize;
    const startY =
      Math.floor(-pz.offset.y / pz.zoom / gridSize) * gridSize;
    const endX = startX + w / pz.zoom + gridSize;
    const endY = startY + h / pz.zoom + gridSize;

    const parts: string[] = [];
    for (let x = startX; x <= endX; x += gridSize) {
      const sx = x * pz.zoom + pz.offset.x;
      parts.push(`M${sx} 0V${h}`);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      const sy = y * pz.zoom + pz.offset.y;
      parts.push(`M0 ${sy}H${w}`);
    }

    this.gridLayer.appendChild(
      svgEl("path", {
        d: parts.join(""),
        stroke: color,
        "stroke-width": "0.5",
        opacity: "0.12",
        fill: "none",
      })
    );

    // Document bounds
    this.gridLayer.appendChild(
      svgEl("rect", {
        x: String(pz.offset.x),
        y: String(pz.offset.y),
        width: String(doc.width * pz.zoom),
        height: String(doc.height * pz.zoom),
        fill: "none",
        stroke: color,
        "stroke-width": "1",
        opacity: "0.25",
        "stroke-dasharray": "4 4",
      })
    );
  }

  // --- Shape sync (DOM diffing) ---

  private syncShapes(doc: EditorDocument): void {
    const existingIds = new Set(this.shapeElements.keys());
    const docIds = new Set(doc.shapes.map((s) => s.id));

    // Remove shapes no longer in document
    for (const id of existingIds) {
      if (!docIds.has(id)) {
        this.shapeElements.get(id)?.remove();
        this.shapeElements.delete(id);
      }
    }

    // Add/update shapes
    for (const shape of doc.shapes) {
      let el = this.shapeElements.get(shape.id);
      if (el) {
        this.updateShapeElement(el, shape);
      } else {
        const newEl = this.createShapeElement(shape);
        if (newEl) {
          el = newEl;
          this.contentLayer.appendChild(el);
          this.shapeElements.set(shape.id, el);
        }
      }
    }

    // Ensure DOM order matches shape order
    for (const shape of doc.shapes) {
      const el = this.shapeElements.get(shape.id);
      if (el) this.contentLayer.appendChild(el);
    }
  }

  private createShapeElement(shape: Shape): SVGElement | null {
    switch (shape.type) {
      case "path": {
        const d = shapeToSvgD(shape);
        if (!d) return null;
        return svgEl("path", {
          d,
          ...this.styleAttrs(shape),
          ...this.transformAttr(shape),
          "data-shape-id": shape.id,
        });
      }
      case "rectangle":
        return svgEl("rect", {
          x: String(shape.transform.x),
          y: String(shape.transform.y),
          width: String(shape.width),
          height: String(shape.height),
          ...this.styleAttrs(shape),
          ...this.rotationAttr(shape),
          "data-shape-id": shape.id,
        });
      case "ellipse":
        return svgEl("ellipse", {
          cx: String(shape.transform.x),
          cy: String(shape.transform.y),
          rx: String(shape.rx),
          ry: String(shape.ry),
          ...this.styleAttrs(shape),
          ...this.rotationAttr(shape),
          "data-shape-id": shape.id,
        });
    }
  }

  private updateShapeElement(el: SVGElement, shape: Shape): void {
    // Update style attrs
    el.setAttribute("fill", shape.style.fill);
    el.setAttribute("stroke", shape.style.stroke);
    el.setAttribute("stroke-width", String(shape.style.strokeWidth));
    el.setAttribute("opacity", String(shape.style.opacity));

    switch (shape.type) {
      case "path": {
        const d = shapeToSvgD(shape);
        el.setAttribute("d", d);
        const tObj = this.transformAttr(shape);
        if (tObj.transform) {
          el.setAttribute("transform", tObj.transform);
        } else {
          el.removeAttribute("transform");
        }
        break;
      }
      case "rectangle":
        el.setAttribute("x", String(shape.transform.x));
        el.setAttribute("y", String(shape.transform.y));
        el.setAttribute("width", String(shape.width));
        el.setAttribute("height", String(shape.height));
        break;
      case "ellipse":
        el.setAttribute("cx", String(shape.transform.x));
        el.setAttribute("cy", String(shape.transform.y));
        el.setAttribute("rx", String(shape.rx));
        el.setAttribute("ry", String(shape.ry));
        break;
    }
  }

  private styleAttrs(shape: Shape): Record<string, string> {
    return {
      fill: shape.style.fill,
      stroke: shape.style.stroke,
      "stroke-width": String(shape.style.strokeWidth),
      opacity: String(shape.style.opacity),
    };
  }

  private transformAttr(shape: Shape): Record<string, string> {
    const { x, y } = shape.transform;
    if (x === 0 && y === 0) return {};
    return { transform: `translate(${x},${y})` };
  }

  private rotationAttr(shape: Shape): Record<string, string> {
    if (shape.transform.rotation === 0) return {};
    const bb = shapeBoundingBox(shape);
    if (!bb) return {};
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;
    return { transform: `rotate(${shape.transform.rotation},${cx},${cy})` };
  }

  // --- Selection overlays ---

  private renderSelection(
    selectedIds: string[],
    doc: EditorDocument,
    panZoom: PanZoomState
  ): void {
    // Remove previous selection rects from overlay
    const existing = this.overlayLayer.querySelectorAll(".selection-box");
    existing.forEach((el) => el.remove());

    if (selectedIds.length === 0) return;

    const accentColor = "var(--accent-primary)";

    // Individual shape bounding boxes
    for (const id of selectedIds) {
      const shape = doc.shapes.find((s) => s.id === id);
      if (!shape) continue;

      const bb = shapeBoundingBox(shape);
      if (!bb) continue;

      const screenBB = this.toScreenBB(bb, panZoom);
      const rect = svgEl("rect", {
        class: "selection-box",
        x: String(screenBB.x),
        y: String(screenBB.y),
        width: String(screenBB.width),
        height: String(screenBB.height),
        fill: "none",
        stroke: accentColor,
        "stroke-width": "1",
        "pointer-events": "none",
      });
      this.overlayLayer.appendChild(rect);

      // Corner handles
      const handleSize = 6;
      const corners: Point[] = [
        { x: screenBB.x, y: screenBB.y },
        { x: screenBB.x + screenBB.width, y: screenBB.y },
        { x: screenBB.x + screenBB.width, y: screenBB.y + screenBB.height },
        { x: screenBB.x, y: screenBB.y + screenBB.height },
      ];
      for (const corner of corners) {
        this.overlayLayer.appendChild(
          svgEl("rect", {
            class: "selection-box",
            x: String(corner.x - handleSize / 2),
            y: String(corner.y - handleSize / 2),
            width: String(handleSize),
            height: String(handleSize),
            fill: "var(--background-primary)",
            stroke: accentColor,
            "stroke-width": "1",
            "pointer-events": "none",
          })
        );
      }
    }

    // Multi-selection combined bounding box
    if (selectedIds.length > 1) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const id of selectedIds) {
        const shape = doc.shapes.find((s) => s.id === id);
        if (!shape) continue;
        const bb = shapeBoundingBox(shape);
        if (!bb) continue;
        if (bb.x < minX) minX = bb.x;
        if (bb.y < minY) minY = bb.y;
        if (bb.x + bb.width > maxX) maxX = bb.x + bb.width;
        if (bb.y + bb.height > maxY) maxY = bb.y + bb.height;
      }
      if (minX !== Infinity) {
        const combinedBB = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        const screenBB = this.toScreenBB(combinedBB, panZoom);
        this.overlayLayer.appendChild(
          svgEl("rect", {
            class: "selection-box",
            x: String(screenBB.x),
            y: String(screenBB.y),
            width: String(screenBB.width),
            height: String(screenBB.height),
            fill: "none",
            stroke: accentColor,
            "stroke-width": "1",
            "stroke-dasharray": "3 3",
            "pointer-events": "none",
          })
        );
      }
    }
  }

  // --- Rubber-band (marquee selection) ---

  private renderRubberBand(
    rect: BoundingBox | null,
    panZoom: PanZoomState
  ): void {
    if (!rect) {
      this.rubberBandEl?.remove();
      this.rubberBandEl = null;
      return;
    }

    const screenBB = this.toScreenBB(rect, panZoom);

    if (!this.rubberBandEl) {
      this.rubberBandEl = svgEl("rect", {
        class: "rubber-band",
        fill: "var(--accent-primary)",
        "fill-opacity": "0.08",
        stroke: "var(--accent-primary)",
        "stroke-width": "1",
        "stroke-dasharray": "4 2",
        "pointer-events": "none",
      });
      this.overlayLayer.appendChild(this.rubberBandEl);
    }

    this.rubberBandEl.setAttribute("x", String(screenBB.x));
    this.rubberBandEl.setAttribute("y", String(screenBB.y));
    this.rubberBandEl.setAttribute("width", String(screenBB.width));
    this.rubberBandEl.setAttribute("height", String(screenBB.height));
  }

  // --- Shape preview (rect/ellipse drag preview) ---

  private renderShapePreview(
    shape: Shape | null,
    panZoom: PanZoomState
  ): void {
    const existing = this.overlayLayer.querySelectorAll(".shape-preview");
    existing.forEach((el) => el.remove());

    if (!shape) return;

    const accent = "var(--accent-primary)";

    switch (shape.type) {
      case "rectangle": {
        const { x, y } = shape.transform;
        this.overlayLayer.appendChild(
          svgEl("rect", {
            class: "shape-preview",
            x: String(x * panZoom.zoom + panZoom.offset.x),
            y: String(y * panZoom.zoom + panZoom.offset.y),
            width: String(shape.width * panZoom.zoom),
            height: String(shape.height * panZoom.zoom),
            fill: "none",
            stroke: accent,
            "stroke-width": "1",
            "stroke-dasharray": "4 4",
            "pointer-events": "none",
          })
        );
        break;
      }
      case "ellipse": {
        const cx = shape.transform.x * panZoom.zoom + panZoom.offset.x;
        const cy = shape.transform.y * panZoom.zoom + panZoom.offset.y;
        this.overlayLayer.appendChild(
          svgEl("ellipse", {
            class: "shape-preview",
            cx: String(cx),
            cy: String(cy),
            rx: String(shape.rx * panZoom.zoom),
            ry: String(shape.ry * panZoom.zoom),
            fill: "none",
            stroke: accent,
            "stroke-width": "1",
            "stroke-dasharray": "4 4",
            "pointer-events": "none",
          })
        );
        break;
      }
    }
  }

  // --- Pen preview (in-progress path) ---

  private renderPenPreview(
    penState: PenState | null,
    panZoom: PanZoomState
  ): void {
    const existing = this.overlayLayer.querySelectorAll(".pen-preview");
    existing.forEach((el) => el.remove());

    if (!penState || penState.nodes.length === 0) return;

    const accent = "var(--accent-primary)";
    const pz = panZoom;
    const toScreen = (p: Point) => ({
      x: p.x * pz.zoom + pz.offset.x,
      y: p.y * pz.zoom + pz.offset.y,
    });

    const nodes = penState.nodes;

    // Draw existing segments
    if (nodes.length >= 2) {
      const parts: string[] = [];
      const first = toScreen(nodes[0].position);
      parts.push(`M ${first.x} ${first.y}`);

      for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1];
        const curr = nodes[i];

        if (prev.handleOut && curr.handleIn) {
          const h1 = toScreen(prev.handleOut);
          const h2 = toScreen(curr.handleIn);
          const p = toScreen(curr.position);
          parts.push(`C ${h1.x} ${h1.y} ${h2.x} ${h2.y} ${p.x} ${p.y}`);
        } else {
          const p = toScreen(curr.position);
          parts.push(`L ${p.x} ${p.y}`);
        }
      }

      this.overlayLayer.appendChild(
        svgEl("path", {
          class: "pen-preview",
          d: parts.join(" "),
          fill: "none",
          stroke: accent,
          "stroke-width": "1.5",
          "pointer-events": "none",
        })
      );
    }

    // Rubber-band line from last node to cursor
    if (penState.cursorPos && nodes.length >= 1) {
      const last = nodes[nodes.length - 1];
      const from = toScreen(last.position);
      const to = toScreen(penState.cursorPos);
      this.overlayLayer.appendChild(
        svgEl("line", {
          class: "pen-preview",
          x1: String(from.x),
          y1: String(from.y),
          x2: String(to.x),
          y2: String(to.y),
          stroke: accent,
          "stroke-width": "1",
          "stroke-dasharray": "3 3",
          opacity: "0.6",
          "pointer-events": "none",
        })
      );
    }

    // Handle drag lines
    if (penState.currentHandle) {
      const last = nodes[nodes.length - 1];
      const pos = toScreen(last.position);
      const handle = toScreen(penState.currentHandle);

      // Handle line
      this.overlayLayer.appendChild(
        svgEl("line", {
          class: "pen-preview",
          x1: String(pos.x),
          y1: String(pos.y),
          x2: String(handle.x),
          y2: String(handle.y),
          stroke: accent,
          "stroke-width": "1",
          opacity: "0.5",
          "pointer-events": "none",
        })
      );

      // Mirrored handle line
      const mx = 2 * pos.x - handle.x;
      const my = 2 * pos.y - handle.y;
      this.overlayLayer.appendChild(
        svgEl("line", {
          class: "pen-preview",
          x1: String(pos.x),
          y1: String(pos.y),
          x2: String(mx),
          y2: String(my),
          stroke: accent,
          "stroke-width": "1",
          opacity: "0.5",
          "pointer-events": "none",
        })
      );

      // Handle dot
      this.overlayLayer.appendChild(
        svgEl("circle", {
          class: "pen-preview",
          cx: String(handle.x),
          cy: String(handle.y),
          r: "3",
          fill: accent,
          "pointer-events": "none",
        })
      );

      // Mirror dot
      this.overlayLayer.appendChild(
        svgEl("circle", {
          class: "pen-preview",
          cx: String(mx),
          cy: String(my),
          r: "3",
          fill: accent,
          "pointer-events": "none",
        })
      );
    }

    // Node dots
    for (let i = 0; i < nodes.length; i++) {
      const p = toScreen(nodes[i].position);
      this.overlayLayer.appendChild(
        svgEl("circle", {
          class: "pen-preview",
          cx: String(p.x),
          cy: String(p.y),
          r: "4",
          fill: i === 0 && nodes.length >= 3 ? accent : "white",
          stroke: accent,
          "stroke-width": "1.5",
          "pointer-events": "none",
        })
      );
    }
  }

  // --- Node overlay (node tool editing) ---

  private renderNodeOverlay(
    activeTool: ToolType,
    nodeSelection: number[],
    selection: string[],
    doc: EditorDocument,
    panZoom: PanZoomState
  ): void {
    const existing = this.overlayLayer.querySelectorAll(".node-overlay");
    existing.forEach((el) => el.remove());

    if (activeTool !== "node" || selection.length !== 1) return;

    const shape = doc.shapes.find((s) => s.id === selection[0]);
    if (!shape || shape.type !== "path") return;

    const pathShape = shape as PathShape;
    const { nodes } = pathShape;
    const ox = shape.transform.x;
    const oy = shape.transform.y;

    if (nodes.length === 0) return;

    const pz = panZoom;
    const accent = "var(--accent-primary)";
    const toScreen = (p: Point) => ({
      x: (p.x + ox) * pz.zoom + pz.offset.x,
      y: (p.y + oy) * pz.zoom + pz.offset.y,
    });

    const selectedSet = new Set(nodeSelection);

    // Draw handle lines and handle circles
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const sp = toScreen(node.position);

      if (node.handleIn) {
        const sh = toScreen(node.handleIn);
        this.overlayLayer.appendChild(
          svgEl("line", {
            class: "node-overlay",
            x1: String(sp.x),
            y1: String(sp.y),
            x2: String(sh.x),
            y2: String(sh.y),
            stroke: accent,
            "stroke-width": "1",
            opacity: "0.5",
            "pointer-events": "none",
          })
        );
        this.overlayLayer.appendChild(
          svgEl("circle", {
            class: "node-overlay",
            cx: String(sh.x),
            cy: String(sh.y),
            r: "3",
            fill: "white",
            stroke: accent,
            "stroke-width": "1",
            "pointer-events": "none",
          })
        );
      }

      if (node.handleOut) {
        const sh = toScreen(node.handleOut);
        this.overlayLayer.appendChild(
          svgEl("line", {
            class: "node-overlay",
            x1: String(sp.x),
            y1: String(sp.y),
            x2: String(sh.x),
            y2: String(sh.y),
            stroke: accent,
            "stroke-width": "1",
            opacity: "0.5",
            "pointer-events": "none",
          })
        );
        this.overlayLayer.appendChild(
          svgEl("circle", {
            class: "node-overlay",
            cx: String(sh.x),
            cy: String(sh.y),
            r: "3",
            fill: "white",
            stroke: accent,
            "stroke-width": "1",
            "pointer-events": "none",
          })
        );
      }
    }

    // Draw node dots (on top of handle lines)
    for (let i = 0; i < nodes.length; i++) {
      const sp = toScreen(nodes[i].position);
      const isSelected = selectedSet.has(i);

      this.overlayLayer.appendChild(
        svgEl("rect", {
          class: "node-overlay",
          x: String(sp.x - 4),
          y: String(sp.y - 4),
          width: "8",
          height: "8",
          rx: "1",
          fill: isSelected ? accent : "white",
          stroke: accent,
          "stroke-width": "1.5",
          "pointer-events": "none",
        })
      );
    }
  }

  // --- Coordinate helpers ---

  private toScreenBB(bb: BoundingBox, pz: PanZoomState): BoundingBox {
    return {
      x: bb.x * pz.zoom + pz.offset.x,
      y: bb.y * pz.zoom + pz.offset.y,
      width: bb.width * pz.zoom,
      height: bb.height * pz.zoom,
    };
  }

  /**
   * Find the topmost shape at a screen point.
   * Returns the shape id or null.
   */
  hitTestAtScreen(
    screenPoint: Point,
    doc: EditorDocument,
    panZoom: PanZoomState
  ): string | null {
    // Convert screen -> canvas
    const canvasPoint: Point = {
      x: (screenPoint.x - panZoom.offset.x) / panZoom.zoom,
      y: (screenPoint.y - panZoom.offset.y) / panZoom.zoom,
    };

    const tolerance = 4 / panZoom.zoom;

    // Iterate top-to-bottom (last in array = topmost rendered)
    for (let i = doc.shapes.length - 1; i >= 0; i--) {
      const shape = doc.shapes[i];
      if (hitTestShape(canvasPoint, shape, tolerance)) {
        return shape.id;
      }
    }
    return null;
  }

  destroy(): void {
    this.shapeElements.clear();
    this.svg.remove();
  }
}
