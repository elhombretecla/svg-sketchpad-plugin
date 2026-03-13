import type { Tool, CanvasPointerEvent } from "./BaseTool";
import type { Point, BoundingBox } from "../editor/Geometry";
import { shapeIntersectsRect, hitTestShape, shapeBoundingBox, moveShape, scaleShape } from "../editor/Shape";
import type { Shape } from "../editor/Shape";
import { editorStore } from "../ui/state/editorStore";
import type { PanZoomState } from "../canvas/PanZoom";

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectPhase = "idle" | "rubber-band" | "moving" | "resizing";

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

const CORNER_HANDLES: HandleId[] = ["nw", "ne", "se", "sw"];

/** Pixel radius for handle hit testing (screen space). */
const HANDLE_HIT_RADIUS = 8;

// ─── SelectTool ───────────────────────────────────────────────────────────────

export class SelectTool implements Tool {
  readonly type = "select" as const;

  private phase: SelectPhase = "idle";

  // Shared drag state
  private dragOrigin: Point = { x: 0, y: 0 };

  // Moving state
  private initialShapes: Shape[] = [];

  // Resizing state
  private activeHandle: HandleId = "se";
  private initialSelBB: BoundingBox = { x: 0, y: 0, width: 0, height: 0 };

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  activate(): void {
    this.phase = "idle";
  }

  deactivate(): void {
    this.phase = "idle";
    const state = editorStore.getState();
    state.setRubberBand(null);
    state.setCursor("default");
  }

  // ─── Pointer events ─────────────────────────────────────────────────────────

  onPointerDown(event: CanvasPointerEvent): void {
    if (event.button !== 0) return;

    const state = editorStore.getState();

    // 1. Check resize handles (only when something is selected, no shift)
    if (!event.shiftKey && state.selection.length > 0) {
      const selBB = this.computeSelectionBB();
      if (selBB && selBB.width > 0 && selBB.height > 0) {
        const handle = this.hitTestHandle(event.screenPoint, selBB, state.panZoom);
        if (handle) {
          this.phase = "resizing";
          this.activeHandle = handle;
          this.dragOrigin = event.canvasPoint;
          this.initialSelBB = { ...selBB };
          this.initialShapes = this.snapshotSelected();
          state.setCursor(HANDLE_CURSORS[handle]);
          return;
        }
      }
    }

    // 2. Hit test shapes
    const hitId = this.hitTest(event.canvasPoint);

    if (hitId) {
      if (event.shiftKey) {
        // Shift: toggle selection only, no drag
        const sel = state.selection;
        if (sel.includes(hitId)) {
          state.setSelection(sel.filter((id) => id !== hitId));
        } else {
          state.setSelection([...sel, hitId]);
        }
        return;
      }

      // Ensure the clicked shape is selected
      if (!state.selection.includes(hitId)) {
        state.setSelection([hitId]);
      }

      // Start moving
      this.phase = "moving";
      this.dragOrigin = event.canvasPoint;
      this.initialShapes = this.snapshotSelected();
      state.setCursor("grabbing");
      return;
    }

    // 3. Clicked empty space — start rubber-band
    if (!event.shiftKey) {
      state.setSelection([]);
    }
    this.phase = "rubber-band";
    this.dragOrigin = event.canvasPoint;
    state.setRubberBand(null);
  }

  onPointerMove(event: CanvasPointerEvent): void {
    switch (this.phase) {
      case "rubber-band":
        this.updateRubberBand(event.canvasPoint);
        break;

      case "moving":
        this.applyMove(event.canvasPoint);
        break;

      case "resizing":
        this.applyResize(event.canvasPoint, event.shiftKey);
        break;

      case "idle":
        this.updateHoverCursor(event.canvasPoint, event.screenPoint);
        break;
    }
  }

  onPointerUp(event: CanvasPointerEvent): void {
    if (this.phase === "rubber-band") {
      this.finalizeRubberBand(event.shiftKey);
    }

    this.phase = "idle";
    // Recompute cursor for idle position
    this.updateHoverCursor(event.canvasPoint, event.screenPoint);
  }

  // ─── Keyboard ───────────────────────────────────────────────────────────────

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Delete" || event.key === "Backspace") {
      this.deleteSelected();
    }
    if (event.key === "a" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.selectAll();
    }
    if (event.key === "Escape") {
      editorStore.getState().setSelection([]);
    }
  }

  // ─── Rubber-band ────────────────────────────────────────────────────────────

  private updateRubberBand(canvasPoint: Point): void {
    const x = Math.min(this.dragOrigin.x, canvasPoint.x);
    const y = Math.min(this.dragOrigin.y, canvasPoint.y);
    const w = Math.abs(canvasPoint.x - this.dragOrigin.x);
    const h = Math.abs(canvasPoint.y - this.dragOrigin.y);
    editorStore.getState().setRubberBand({ x, y, width: w, height: h });
  }

  private finalizeRubberBand(shiftKey: boolean): void {
    const state = editorStore.getState();
    const rect = state.rubberBand;

    if (rect && rect.width > 2 && rect.height > 2) {
      const ids = state.document.shapes
        .filter((shape) => shapeIntersectsRect(shape, rect))
        .map((s) => s.id);

      if (shiftKey) {
        const combined = new Set([...state.selection, ...ids]);
        state.setSelection([...combined]);
      } else {
        state.setSelection(ids);
      }
    }

    state.setRubberBand(null);
  }

  // ─── Moving ─────────────────────────────────────────────────────────────────

  private applyMove(canvasPoint: Point): void {
    const dx = canvasPoint.x - this.dragOrigin.x;
    const dy = canvasPoint.y - this.dragOrigin.y;

    const updated = this.initialShapes.map((s) => moveShape(s, dx, dy));
    this.commitShapeUpdates(updated);
  }

  // ─── Resizing ───────────────────────────────────────────────────────────────

  private applyResize(canvasPoint: Point, shiftKey: boolean): void {
    const newBB = this.computeNewBB(canvasPoint, shiftKey);
    if (newBB.width < 1 || newBB.height < 1) return;

    const updated = this.initialShapes.map((s) =>
      scaleShape(s, this.initialSelBB, newBB)
    );
    this.commitShapeUpdates(updated);
  }

  /**
   * Compute the new selection bounding box given the current pointer position,
   * active handle, and whether shift (proportional) is held.
   */
  private computeNewBB(canvasPoint: Point, shiftKey: boolean): BoundingBox {
    const dx = canvasPoint.x - this.dragOrigin.x;
    const dy = canvasPoint.y - this.dragOrigin.y;
    const ib = this.initialSelBB;

    let x = ib.x;
    let y = ib.y;
    let w = ib.width;
    let h = ib.height;

    switch (this.activeHandle) {
      case "nw": x += dx; y += dy; w -= dx; h -= dy; break;
      case "n":              y += dy;          h -= dy; break;
      case "ne":       y += dy; w += dx; h -= dy; break;
      case "e":                 w += dx;         break;
      case "se":                w += dx; h += dy; break;
      case "s":                          h += dy; break;
      case "sw": x += dx;    w -= dx; h += dy; break;
      case "w":  x += dx;    w -= dx;         break;
    }

    // Clamp to minimum size
    w = Math.max(1, w);
    h = Math.max(1, h);

    // Proportional resize for corners when shift is held
    if (shiftKey && CORNER_HANDLES.includes(this.activeHandle)) {
      const aspect = ib.width / ib.height;
      const scaleX = w / ib.width;
      const scaleY = h / ib.height;
      const scale = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;

      const newW = Math.max(1, ib.width * scale);
      const newH = Math.max(1, newW / aspect);

      switch (this.activeHandle) {
        case "nw":
          x = ib.x + ib.width - newW;
          y = ib.y + ib.height - newH;
          break;
        case "ne":
          x = ib.x;
          y = ib.y + ib.height - newH;
          break;
        case "se":
          x = ib.x;
          y = ib.y;
          break;
        case "sw":
          x = ib.x + ib.width - newW;
          y = ib.y;
          break;
      }

      w = newW;
      h = newH;
    }

    return { x, y, width: w, height: h };
  }

  // ─── Cursor ─────────────────────────────────────────────────────────────────

  private updateHoverCursor(canvasPoint: Point, screenPoint: Point): void {
    const state = editorStore.getState();

    if (state.selection.length > 0) {
      const selBB = this.computeSelectionBB();
      if (selBB && selBB.width > 0 && selBB.height > 0) {
        const handle = this.hitTestHandle(screenPoint, selBB, state.panZoom);
        if (handle) {
          state.setCursor(HANDLE_CURSORS[handle]);
          return;
        }
      }
    }

    const hitId = this.hitTest(canvasPoint);
    if (hitId && state.selection.includes(hitId)) {
      state.setCursor("move");
      return;
    }

    state.setCursor("default");
  }

  // ─── Handle hit testing ─────────────────────────────────────────────────────

  /**
   * Returns which handle (if any) the given screen-space point is over.
   * Handle positions are computed from the canvas-space selection BB.
   */
  private hitTestHandle(
    screenPoint: Point,
    selBB: BoundingBox,
    panZoom: PanZoomState
  ): HandleId | null {
    const positions = this.handleScreenPositions(selBB, panZoom);
    const r2 = HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS;

    for (const [id, pos] of Object.entries(positions) as [HandleId, Point][]) {
      const dx = screenPoint.x - pos.x;
      const dy = screenPoint.y - pos.y;
      if (dx * dx + dy * dy <= r2) return id;
    }
    return null;
  }

  /**
   * Compute the 8 handle positions in screen space for a given BB.
   */
  handleScreenPositions(
    selBB: BoundingBox,
    panZoom: PanZoomState
  ): Record<HandleId, Point> {
    const s = (cx: number, cy: number): Point => ({
      x: cx * panZoom.zoom + panZoom.offset.x,
      y: cy * panZoom.zoom + panZoom.offset.y,
    });
    const { x, y, width: w, height: h } = selBB;
    return {
      nw: s(x, y),
      n:  s(x + w / 2, y),
      ne: s(x + w, y),
      e:  s(x + w, y + h / 2),
      se: s(x + w, y + h),
      s:  s(x + w / 2, y + h),
      sw: s(x, y + h),
      w:  s(x, y + h / 2),
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private hitTest(canvasPoint: Point): string | null {
    const state = editorStore.getState();
    const { shapes } = state.document;
    const tolerance = 4 / state.panZoom.zoom;

    for (let i = shapes.length - 1; i >= 0; i--) {
      if (hitTestShape(canvasPoint, shapes[i], tolerance)) {
        return shapes[i].id;
      }
    }
    return null;
  }

  /** Compute the combined bounding box of all currently selected shapes. */
  computeSelectionBB(): BoundingBox | null {
    const state = editorStore.getState();
    if (state.selection.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const id of state.selection) {
      const shape = state.document.shapes.find((s) => s.id === id);
      if (!shape) continue;
      const bb = shapeBoundingBox(shape);
      if (!bb) continue;
      if (bb.x < minX) minX = bb.x;
      if (bb.y < minY) minY = bb.y;
      if (bb.x + bb.width > maxX) maxX = bb.x + bb.width;
      if (bb.y + bb.height > maxY) maxY = bb.y + bb.height;
    }

    if (minX === Infinity) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /** Snapshot the current state of all selected shapes. */
  private snapshotSelected(): Shape[] {
    const state = editorStore.getState();
    const selSet = new Set(state.selection);
    return state.document.shapes
      .filter((s) => selSet.has(s.id))
      .map((s) => ({ ...s } as Shape));
  }

  /** Replace selected shapes in the document with updated versions. */
  private commitShapeUpdates(updated: Shape[]): void {
    const state = editorStore.getState();
    const updatedMap = new Map(updated.map((s) => [s.id, s]));
    state.setDocument({
      ...state.document,
      shapes: state.document.shapes.map((s) =>
        updatedMap.has(s.id) ? updatedMap.get(s.id)! : s
      ),
    });
  }

  private deleteSelected(): void {
    const state = editorStore.getState();
    if (state.selection.length === 0) return;

    const selSet = new Set(state.selection);
    state.setDocument({
      ...state.document,
      shapes: state.document.shapes.filter((s) => !selSet.has(s.id)),
    });
    state.setSelection([]);
  }

  private selectAll(): void {
    const state = editorStore.getState();
    state.setSelection(state.document.shapes.map((s) => s.id));
  }
}
