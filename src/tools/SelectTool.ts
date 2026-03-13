import type { Tool, CanvasPointerEvent } from "./BaseTool";
import type { Point, BoundingBox } from "../editor/Geometry";
import { shapeIntersectsRect, hitTestShape } from "../editor/Shape";
import { editorStore } from "../ui/state/editorStore";

type SelectPhase = "idle" | "rubber-band" | "dragging";

export class SelectTool implements Tool {
  readonly type = "select" as const;

  private phase: SelectPhase = "idle";
  private dragOrigin: Point = { x: 0, y: 0 };

  activate(): void {
    this.phase = "idle";
  }

  deactivate(): void {
    this.phase = "idle";
    editorStore.getState().setRubberBand(null);
  }

  onPointerDown(event: CanvasPointerEvent): void {
    if (event.button !== 0) return;

    const state = editorStore.getState();
    const hitId = this.hitTest(event.canvasPoint);

    if (hitId) {
      // Clicked on a shape
      if (event.shiftKey) {
        // Toggle selection
        const sel = state.selection;
        if (sel.includes(hitId)) {
          state.setSelection(sel.filter((id) => id !== hitId));
        } else {
          state.setSelection([...sel, hitId]);
        }
      } else {
        // If not already selected, replace selection
        if (!state.selection.includes(hitId)) {
          state.setSelection([hitId]);
        }
        // Start dragging (for future move support)
        this.phase = "dragging";
        this.dragOrigin = event.canvasPoint;
      }
    } else {
      // Clicked on empty space — start rubber-band
      if (!event.shiftKey) {
        state.setSelection([]);
      }
      this.phase = "rubber-band";
      this.dragOrigin = event.canvasPoint;
      state.setRubberBand(null);
    }
  }

  onPointerMove(event: CanvasPointerEvent): void {
    if (this.phase === "rubber-band") {
      const x = Math.min(this.dragOrigin.x, event.canvasPoint.x);
      const y = Math.min(this.dragOrigin.y, event.canvasPoint.y);
      const w = Math.abs(event.canvasPoint.x - this.dragOrigin.x);
      const h = Math.abs(event.canvasPoint.y - this.dragOrigin.y);

      const rect: BoundingBox = { x, y, width: w, height: h };
      editorStore.getState().setRubberBand(rect);
    }
    // "dragging" phase (move) will be implemented with editing tools
  }

  onPointerUp(_event: CanvasPointerEvent): void {
    if (this.phase === "rubber-band") {
      const state = editorStore.getState();
      const rect = state.rubberBand;

      if (rect && rect.width > 2 && rect.height > 2) {
        // Select all shapes intersecting the rubber-band
        const ids = state.document.shapes
          .filter((shape) => shapeIntersectsRect(shape, rect))
          .map((s) => s.id);

        if (_event.shiftKey) {
          // Add to existing selection
          const combined = new Set([...state.selection, ...ids]);
          state.setSelection([...combined]);
        } else {
          state.setSelection(ids);
        }
      }

      state.setRubberBand(null);
    }

    this.phase = "idle";
  }

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

  private hitTest(canvasPoint: Point): string | null {
    const state = editorStore.getState();
    const { shapes } = state.document;

    const tolerance = 4 / state.panZoom.zoom;

    // Test top-to-bottom
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (hitTestShape(canvasPoint, shapes[i], tolerance)) {
        return shapes[i].id;
      }
    }
    return null;
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
