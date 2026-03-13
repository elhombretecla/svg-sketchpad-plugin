import type { Tool, CanvasPointerEvent } from "./BaseTool";
import type { ToolType } from "./BaseTool";
import type { Point } from "../editor/Geometry";
import { createRectShape, createEllipseShape } from "../editor/Shape";
import type { ShapeStyle } from "../editor/Shape";
import { addShape } from "../editor/Document";
import { editorStore } from "../ui/state/editorStore";

type ShapeState = "idle" | "dragging";

abstract class ShapeTool implements Tool {
  abstract readonly type: ToolType;

  private state: ShapeState = "idle";
  private startPoint: Point = { x: 0, y: 0 };

  activate(): void {
    // crosshair cursor handled by CSS
  }

  deactivate(): void {
    this.state = "idle";
    editorStore.getState().setShapePreview(null);
  }

  onPointerDown(event: CanvasPointerEvent): void {
    this.state = "dragging";
    this.startPoint = event.canvasPoint;
  }

  onPointerMove(event: CanvasPointerEvent): void {
    if (this.state !== "dragging") return;

    const preview = this.buildShape(this.startPoint, event.canvasPoint, event.shiftKey);
    editorStore.getState().setShapePreview(preview);
  }

  onPointerUp(event: CanvasPointerEvent): void {
    if (this.state !== "dragging") return;
    this.state = "idle";

    const shape = this.buildShape(this.startPoint, event.canvasPoint, event.shiftKey);
    editorStore.getState().setShapePreview(null);

    // Don't create zero-size shapes
    if (this.isZeroSize(shape)) return;

    const store = editorStore.getState();
    store.setDocument(addShape(store.document, shape));
    store.setSelection([shape.id]);
    store.setActiveTool("select");
  }

  private getStyle(): ShapeStyle {
    const s = editorStore.getState();
    return {
      fill: s.fillEnabled ? s.fillColor : "none",
      stroke: s.style.stroke,
      strokeWidth: s.style.strokeWidth,
      opacity: s.style.opacity,
    };
  }

  protected abstract buildShape(
    start: Point,
    end: Point,
    constrain: boolean
  ): ReturnType<typeof createRectShape> | ReturnType<typeof createEllipseShape>;

  protected getStyleForBuild(): ShapeStyle {
    return this.getStyle();
  }

  private isZeroSize(shape: { type: string }): boolean {
    if (shape.type === "rectangle") {
      const r = shape as ReturnType<typeof createRectShape>;
      return r.width < 1 && r.height < 1;
    }
    if (shape.type === "ellipse") {
      const e = shape as ReturnType<typeof createEllipseShape>;
      return e.rx < 1 && e.ry < 1;
    }
    return false;
  }
}

export class RectangleTool extends ShapeTool {
  readonly type = "rectangle" as const;

  protected buildShape(start: Point, end: Point, constrain: boolean) {
    let x = Math.min(start.x, end.x);
    let y = Math.min(start.y, end.y);
    let w = Math.abs(end.x - start.x);
    let h = Math.abs(end.y - start.y);

    if (constrain) {
      const side = Math.max(w, h);
      w = side;
      h = side;
      // Expand from start point direction
      if (end.x < start.x) x = start.x - side;
      else x = start.x;
      if (end.y < start.y) y = start.y - side;
      else y = start.y;
    }

    return createRectShape(x, y, w, h, this.getStyleForBuild());
  }
}

export class EllipseTool extends ShapeTool {
  readonly type = "ellipse" as const;

  protected buildShape(start: Point, end: Point, constrain: boolean) {
    let w = Math.abs(end.x - start.x);
    let h = Math.abs(end.y - start.y);

    if (constrain) {
      const side = Math.max(w, h);
      w = side;
      h = side;
    }

    const rx = w / 2;
    const ry = h / 2;

    let cx: number, cy: number;
    if (constrain) {
      const side = Math.max(w, h);
      cx = end.x >= start.x ? start.x + side / 2 : start.x - side / 2;
      cy = end.y >= start.y ? start.y + side / 2 : start.y - side / 2;
    } else {
      cx = Math.min(start.x, end.x) + rx;
      cy = Math.min(start.y, end.y) + ry;
    }

    return createEllipseShape(cx, cy, rx, ry, this.getStyleForBuild());
  }
}
