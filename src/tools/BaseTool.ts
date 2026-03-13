import type { Point } from "../editor/Geometry";

export type ToolType = "select" | "pen" | "node" | "rectangle" | "ellipse";

export interface CanvasPointerEvent {
  canvasPoint: Point;
  screenPoint: Point;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  button: number;
}

export interface Tool {
  readonly type: ToolType;
  onPointerDown?(event: CanvasPointerEvent): void;
  onPointerMove?(event: CanvasPointerEvent): void;
  onPointerUp?(event: CanvasPointerEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  onKeyUp?(event: KeyboardEvent): void;
  activate?(): void;
  deactivate?(): void;
}
