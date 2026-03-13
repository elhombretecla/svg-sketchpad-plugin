import type { Tool, CanvasPointerEvent } from "./BaseTool";
import type { Point } from "../editor/Geometry";
import { distance, nearestTOnCubic, dragSegment } from "../editor/Geometry";
import { moveNode, moveHandle, convertNodeType } from "../editor/Node";
import type { PathShape } from "../editor/Shape";
import { hitTestShape } from "../editor/Shape";
import { updateShape, getShape } from "../editor/Document";
import { deleteNodes, segmentControlPoints } from "../editor/PathOps";
import { editorStore } from "../ui/state/editorStore";

type NodeState =
  | "idle"
  | "dragging-node"
  | "dragging-handle"
  | "dragging-segment";

interface HandleHit {
  nodeIndex: number;
  which: "in" | "out";
}

interface SegmentHit {
  segmentIndex: number;
  t: number;
}

const HIT_TOLERANCE = 8; // screen pixels

export class NodeTool implements Tool {
  readonly type = "node" as const;

  private state: NodeState = "idle";
  private lastCanvasPoint: Point = { x: 0, y: 0 };
  private dragHandle: HandleHit | null = null;
  private dragSegmentInfo: SegmentHit | null = null;

  activate(): void {
    this.state = "idle";
    editorStore.getState().setNodeSelection([]);
  }

  deactivate(): void {
    this.state = "idle";
    editorStore.getState().setNodeSelection([]);
  }

  onPointerDown(event: CanvasPointerEvent): void {
    this.lastCanvasPoint = event.canvasPoint;
    const store = editorStore.getState();
    const shape = this.getSelectedPath();

    if (!shape) {
      // Try to select a shape
      this.hitTestAndSelect(event);
      return;
    }

    const tolerance = HIT_TOLERANCE / store.panZoom.zoom;
    const pos = event.canvasPoint;

    // 1. Hit-test nodes
    const nodeIdx = this.hitTestNode(shape, pos, tolerance);
    if (nodeIdx >= 0) {
      if (event.shiftKey) {
        // Toggle multi-select
        const sel = store.nodeSelection;
        if (sel.includes(nodeIdx)) {
          store.setNodeSelection(sel.filter((i) => i !== nodeIdx));
        } else {
          store.setNodeSelection([...sel, nodeIdx]);
        }
      } else {
        if (!store.nodeSelection.includes(nodeIdx)) {
          store.setNodeSelection([nodeIdx]);
        }
      }
      this.state = "dragging-node";
      return;
    }

    // 2. Hit-test handles
    const handleHit = this.hitTestHandle(shape, pos, tolerance);
    if (handleHit) {
      this.dragHandle = handleHit;
      this.state = "dragging-handle";
      return;
    }

    // 3. Hit-test segments
    const segHit = this.hitTestSegment(shape, pos, tolerance);
    if (segHit) {
      this.dragSegmentInfo = segHit;
      this.state = "dragging-segment";
      return;
    }

    // 4. Nothing hit on path — try other shapes or clear
    this.hitTestAndSelect(event);
  }

  onPointerMove(event: CanvasPointerEvent): void {
    const pos = event.canvasPoint;
    const dx = pos.x - this.lastCanvasPoint.x;
    const dy = pos.y - this.lastCanvasPoint.y;

    if (this.state === "dragging-node") {
      this.moveSelectedNodes(dx, dy);
    } else if (this.state === "dragging-handle" && this.dragHandle) {
      this.moveSelectedHandle(pos);
    } else if (this.state === "dragging-segment" && this.dragSegmentInfo) {
      this.moveSelectedSegment(pos);
    }

    this.lastCanvasPoint = pos;
  }

  onPointerUp(_event: CanvasPointerEvent): void {
    this.state = "idle";
    this.dragHandle = null;
    this.dragSegmentInfo = null;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Delete" || event.key === "Backspace") {
      this.deleteSelectedNodes();
      return;
    }

    if (event.key === "1" || event.key === "2" || event.key === "3") {
      const typeMap: Record<string, "corner" | "smooth" | "symmetric"> = {
        "1": "corner",
        "2": "smooth",
        "3": "symmetric",
      };
      this.convertSelectedNodes(typeMap[event.key]);
    }
  }

  // --- Hit testing ---

  private getSelectedPath(): PathShape | null {
    const store = editorStore.getState();
    if (store.selection.length !== 1) return null;
    const shape = getShape(store.document, store.selection[0]);
    if (!shape || shape.type !== "path") return null;
    return shape;
  }

  private hitTestNode(shape: PathShape, pos: Point, tolerance: number): number {
    const ox = shape.transform.x;
    const oy = shape.transform.y;

    for (let i = 0; i < shape.nodes.length; i++) {
      const np = shape.nodes[i].position;
      const d = distance(pos, { x: np.x + ox, y: np.y + oy });
      if (d <= tolerance) return i;
    }
    return -1;
  }

  private hitTestHandle(
    shape: PathShape,
    pos: Point,
    tolerance: number
  ): HandleHit | null {
    const ox = shape.transform.x;
    const oy = shape.transform.y;

    for (let i = 0; i < shape.nodes.length; i++) {
      const node = shape.nodes[i];
      if (node.handleIn) {
        const d = distance(pos, { x: node.handleIn.x + ox, y: node.handleIn.y + oy });
        if (d <= tolerance) return { nodeIndex: i, which: "in" };
      }
      if (node.handleOut) {
        const d = distance(pos, { x: node.handleOut.x + ox, y: node.handleOut.y + oy });
        if (d <= tolerance) return { nodeIndex: i, which: "out" };
      }
    }
    return null;
  }

  private hitTestSegment(
    shape: PathShape,
    pos: Point,
    tolerance: number
  ): SegmentHit | null {
    const { nodes, closed } = shape;
    const ox = shape.transform.x;
    const oy = shape.transform.y;
    const segCount = closed ? nodes.length : nodes.length - 1;

    let bestDist = Infinity;
    let bestSeg = -1;
    let bestT = 0.5;

    for (let i = 0; i < segCount; i++) {
      const toIdx = (i + 1) % nodes.length;
      const from = nodes[i];
      const to = nodes[toIdx];

      const [p0, p1, p2, p3] = segmentControlPoints(from, to);
      // Offset control points by transform
      const op0 = { x: p0.x + ox, y: p0.y + oy };
      const op1 = { x: p1.x + ox, y: p1.y + oy };
      const op2 = { x: p2.x + ox, y: p2.y + oy };
      const op3 = { x: p3.x + ox, y: p3.y + oy };

      const result = nearestTOnCubic(op0, op1, op2, op3, pos);
      if (result.distance < bestDist) {
        bestDist = result.distance;
        bestT = result.t;
        bestSeg = i;
      }
    }

    if (bestSeg >= 0 && bestDist <= tolerance) {
      return { segmentIndex: bestSeg, t: bestT };
    }
    return null;
  }

  private hitTestAndSelect(event: CanvasPointerEvent): void {
    const store = editorStore.getState();
    const { document: doc, panZoom } = store;
    const tolerance = 4 / panZoom.zoom;

    const canvasPoint = event.canvasPoint;

    for (let i = doc.shapes.length - 1; i >= 0; i--) {
      if (hitTestShape(canvasPoint, doc.shapes[i], tolerance)) {
        store.setSelection([doc.shapes[i].id]);
        store.setNodeSelection([]);
        return;
      }
    }

    store.setSelection([]);
    store.setNodeSelection([]);
  }

  // --- Mutations ---

  private moveSelectedNodes(dx: number, dy: number): void {
    const store = editorStore.getState();
    const shape = this.getSelectedPath();
    if (!shape) return;

    const nodeIndices = store.nodeSelection;
    if (nodeIndices.length === 0) return;

    store.setDocument(
      updateShape(store.document, shape.id, (s) => {
        if (s.type !== "path") return s;
        const newNodes = [...s.nodes];
        for (const idx of nodeIndices) {
          if (idx >= 0 && idx < newNodes.length) {
            const node = newNodes[idx];
            newNodes[idx] = moveNode(node, {
              x: node.position.x + dx,
              y: node.position.y + dy,
            });
          }
        }
        return { ...s, nodes: newNodes };
      })
    );
  }

  private moveSelectedHandle(pos: Point): void {
    if (!this.dragHandle) return;
    const store = editorStore.getState();
    const shape = this.getSelectedPath();
    if (!shape) return;

    const { nodeIndex, which } = this.dragHandle;
    const ox = shape.transform.x;
    const oy = shape.transform.y;

    // Convert canvas pos to shape-local coordinates
    const localPos = { x: pos.x - ox, y: pos.y - oy };

    store.setDocument(
      updateShape(store.document, shape.id, (s) => {
        if (s.type !== "path") return s;
        const newNodes = [...s.nodes];
        newNodes[nodeIndex] = moveHandle(newNodes[nodeIndex], which, localPos);
        return { ...s, nodes: newNodes };
      })
    );
  }

  private moveSelectedSegment(pos: Point): void {
    if (!this.dragSegmentInfo) return;
    const store = editorStore.getState();
    const shape = this.getSelectedPath();
    if (!shape) return;

    const { segmentIndex, t } = this.dragSegmentInfo;
    const { nodes, closed } = shape;
    const ox = shape.transform.x;
    const oy = shape.transform.y;

    const fromIdx = segmentIndex;
    const toIdx = closed
      ? (segmentIndex + 1) % nodes.length
      : segmentIndex + 1;

    if (toIdx >= nodes.length && !closed) return;

    const from = nodes[fromIdx];
    const to = nodes[toIdx];
    const [p0, p1, p2, p3] = segmentControlPoints(from, to);

    // Target in local space
    const target = { x: pos.x - ox, y: pos.y - oy };
    const result = dragSegment(p0, p1, p2, p3, t, target);

    store.setDocument(
      updateShape(store.document, shape.id, (s) => {
        if (s.type !== "path") return s;
        const newNodes = [...s.nodes];
        newNodes[fromIdx] = { ...newNodes[fromIdx], handleOut: result.handleOut };
        newNodes[toIdx] = { ...newNodes[toIdx], handleIn: result.handleIn };
        return { ...s, nodes: newNodes };
      })
    );
  }

  private deleteSelectedNodes(): void {
    const store = editorStore.getState();
    const shape = this.getSelectedPath();
    if (!shape) return;

    const indices = store.nodeSelection;
    if (indices.length === 0) return;

    const result = deleteNodes(shape.nodes, indices, shape.closed);

    if (result === null) {
      // Too few nodes remain — remove the shape
      store.setDocument({
        ...store.document,
        shapes: store.document.shapes.filter((s) => s.id !== shape.id),
      });
      store.setSelection([]);
      store.setNodeSelection([]);
    } else {
      store.setDocument(
        updateShape(store.document, shape.id, (s) => {
          if (s.type !== "path") return s;
          return { ...s, nodes: result };
        })
      );
      store.setNodeSelection([]);
    }
  }

  private convertSelectedNodes(nodeType: "corner" | "smooth" | "symmetric"): void {
    const store = editorStore.getState();
    const shape = this.getSelectedPath();
    if (!shape) return;

    const indices = store.nodeSelection;
    if (indices.length === 0) return;

    store.setDocument(
      updateShape(store.document, shape.id, (s) => {
        if (s.type !== "path") return s;
        const newNodes = [...s.nodes];
        for (const idx of indices) {
          if (idx >= 0 && idx < newNodes.length) {
            newNodes[idx] = convertNodeType(newNodes[idx], nodeType);
          }
        }
        return { ...s, nodes: newNodes };
      })
    );
  }
}
