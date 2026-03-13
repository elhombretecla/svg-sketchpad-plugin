import type { Tool, CanvasPointerEvent } from "./BaseTool";
import type { Point } from "../editor/Geometry";
import { distance, addPoints, negatePoint, subtractPoints } from "../editor/Geometry";
import type { PathNode } from "../editor/Node";
import { createPathShape } from "../editor/Shape";
import { addShape } from "../editor/Document";
import { editorStore } from "../ui/state/editorStore";

type PenState = "idle" | "placing" | "dragging-handle";

const CLOSE_THRESHOLD = 8;

export class PenTool implements Tool {
  readonly type = "pen" as const;

  private state: PenState = "idle";
  private nodes: PathNode[] = [];
  private dragStartPos: Point | null = null;

  activate(): void {
    this.state = "idle";
    this.nodes = [];
    editorStore.getState().setPenState(null);
  }

  deactivate(): void {
    if (this.nodes.length >= 2) {
      this.finalize(false);
    } else {
      this.cancel();
    }
  }

  onPointerDown(event: CanvasPointerEvent): void {
    const pos = event.canvasPoint;

    // Check if closing the path (click near first node with ≥3 nodes)
    if (this.nodes.length >= 3) {
      const firstPos = this.nodes[0].position;
      const pz = editorStore.getState().panZoom;
      if (distance(pos, firstPos) * pz.zoom < CLOSE_THRESHOLD) {
        this.finalize(true);
        return;
      }
    }

    // Add a new corner node
    const node: PathNode = {
      position: { ...pos },
      handleIn: null,
      handleOut: null,
      type: "corner",
    };

    this.nodes.push(node);
    this.state = "placing";
    this.dragStartPos = pos;

    this.updatePenState(pos);
  }

  onPointerMove(event: CanvasPointerEvent): void {
    const pos = event.canvasPoint;

    if (this.state === "placing" && this.dragStartPos) {
      const d = distance(pos, this.dragStartPos);
      if (d > 2) {
        this.state = "dragging-handle";
      }
    }

    if (this.state === "dragging-handle") {
      const lastIdx = this.nodes.length - 1;
      const last = this.nodes[lastIdx];

      // Set handleOut to cursor, handleIn to mirror
      const handleOut = { ...pos };
      const offset = subtractPoints(pos, last.position);
      const handleIn = addPoints(last.position, negatePoint(offset));

      this.nodes[lastIdx] = {
        ...last,
        handleOut,
        handleIn,
        type: "smooth",
      };

      const store = editorStore.getState();
      store.setPenState({
        nodes: [...this.nodes],
        currentHandle: handleOut,
        cursorPos: null,
      });
      return;
    }

    // Just update cursor position for rubber-band preview
    if (this.nodes.length > 0) {
      this.updatePenState(pos);
    }
  }

  onPointerUp(_event: CanvasPointerEvent): void {
    if (this.state === "dragging-handle") {
      // Handle placement is done, keep the handles
      this.state = "placing";
    }

    this.dragStartPos = null;

    // Update preview without handle drag indicator
    if (this.nodes.length > 0) {
      const store = editorStore.getState();
      store.setPenState({
        nodes: [...this.nodes],
        currentHandle: null,
        cursorPos: store.penState?.cursorPos ?? null,
      });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      this.cancel();
    }
    if (event.key === "Enter") {
      if (this.nodes.length >= 2) {
        this.finalize(false);
      } else {
        this.cancel();
      }
    }
  }

  private finalize(closed: boolean): void {
    if (this.nodes.length < 2) {
      this.cancel();
      return;
    }

    const store = editorStore.getState();
    const style = {
      fill: store.fillEnabled ? store.fillColor : "none",
      stroke: store.style.stroke,
      strokeWidth: store.style.strokeWidth,
      opacity: store.style.opacity,
    };

    const shape = createPathShape([...this.nodes], closed, style);
    store.setDocument(addShape(store.document, shape));
    store.setSelection([shape.id]);
    store.setPenState(null);

    this.nodes = [];
    this.state = "idle";
  }

  private cancel(): void {
    this.nodes = [];
    this.state = "idle";
    editorStore.getState().setPenState(null);
  }

  private updatePenState(cursorPos: Point): void {
    editorStore.getState().setPenState({
      nodes: [...this.nodes],
      currentHandle: null,
      cursorPos,
    });
  }
}
