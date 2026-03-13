import type { Tool, ToolType, CanvasPointerEvent } from "./BaseTool";
import { SelectTool } from "./SelectTool";
import { PenTool } from "./PenTool";
import { NodeTool } from "./NodeTool";
import { RectangleTool, EllipseTool } from "./ShapeTools";
import { editorStore } from "../ui/state/editorStore";

/**
 * Manages tool instances and delegates pointer/keyboard events
 * to the currently active tool.
 */
export class ToolController {
  private tools: Map<ToolType, Tool>;
  private currentTool: Tool;
  private unsubscribe: () => void;

  constructor() {
    this.tools = new Map<ToolType, Tool>([
      ["select", new SelectTool()],
      ["pen", new PenTool()],
      ["node", new NodeTool()],
      ["rectangle", new RectangleTool()],
      ["ellipse", new EllipseTool()],
    ]);

    this.currentTool = this.tools.get("select")!;
    this.currentTool.activate?.();

    // Subscribe to tool changes
    this.unsubscribe = editorStore.subscribe((state, prev) => {
      if (state.activeTool !== prev.activeTool) {
        this.switchTool(state.activeTool);
      }
    });
  }

  private switchTool(type: ToolType): void {
    this.currentTool.deactivate?.();
    const next = this.tools.get(type);
    if (next) {
      this.currentTool = next;
      this.currentTool.activate?.();
    }
  }

  onPointerDown(event: CanvasPointerEvent): void {
    this.currentTool.onPointerDown?.(event);
  }

  onPointerMove(event: CanvasPointerEvent): void {
    this.currentTool.onPointerMove?.(event);
  }

  onPointerUp(event: CanvasPointerEvent): void {
    this.currentTool.onPointerUp?.(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.currentTool.onKeyDown?.(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.currentTool.onKeyUp?.(event);
  }

  destroy(): void {
    this.unsubscribe();
    this.currentTool.deactivate?.();
  }
}
