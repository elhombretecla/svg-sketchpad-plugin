import { useEffect, useRef } from "preact/hooks";
import { CanvasRenderer } from "../../canvas/CanvasRenderer";
import { ToolController } from "../../tools/ToolController";
import { editorStore } from "../state/editorStore";
import { applyZoom, applyPan, screenToCanvas } from "../../canvas/PanZoom";
import type { CanvasPointerEvent } from "../../tools/BaseTool";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const toolCtrlRef = useRef<ToolController | null>(null);
  const isPanningRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Initialize renderer and tool controller
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const renderer = new CanvasRenderer(container);
    rendererRef.current = renderer;

    const toolCtrl = new ToolController();
    toolCtrlRef.current = toolCtrl;

    // Initial render
    const state = editorStore.getState();
    renderer.render(
      state.document, state.panZoom, state.selection, state.rubberBand,
      state.activeTool, state.nodeSelection, state.penState, state.shapePreview
    );
    container.style.cursor = state.cursor ?? "default";

    // Re-render on state changes and apply cursor
    const unsubscribe = editorStore.subscribe((state) => {
      renderer.render(
        state.document, state.panZoom, state.selection, state.rubberBand,
        state.activeTool, state.nodeSelection, state.penState, state.shapePreview
      );
      container.style.cursor = state.cursor ?? "default";
    });

    return () => {
      unsubscribe();
      toolCtrl.destroy();
      renderer.destroy();
    };
  }, []);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const state = editorStore.getState();
      const rect = el.getBoundingClientRect();
      const center = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      state.setPanZoom(applyZoom(state.panZoom, e.deltaY, center));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Space + drag panning & keyboard events for tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        spaceHeldRef.current = true;
        containerRef.current?.classList.add("panning");
        return;
      }

      toolCtrlRef.current?.onKeyDown(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        isPanningRef.current = false;
        containerRef.current?.classList.remove("panning");
        return;
      }

      toolCtrlRef.current?.onKeyUp(e);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const makeCanvasEvent = (e: PointerEvent): CanvasPointerEvent => {
    const rect = containerRef.current!.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const state = editorStore.getState();
    const canvasPoint = screenToCanvas(screenPoint, state.panZoom);

    return {
      canvasPoint,
      screenPoint,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      altKey: e.altKey,
      button: e.button,
    };
  };

  const handlePointerDown = (e: PointerEvent) => {
    // Panning: space + left click or middle mouse
    if (spaceHeldRef.current || e.button === 1) {
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    // Forward to tool
    if (e.button === 0) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      toolCtrlRef.current?.onPointerDown(makeCanvasEvent(e));
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const state = editorStore.getState();
      state.setPanZoom(applyPan(state.panZoom, dx, dy));
      return;
    }

    toolCtrlRef.current?.onPointerMove(makeCanvasEvent(e));
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    toolCtrlRef.current?.onPointerUp(makeCanvasEvent(e));
  };

  return (
    <div
      class="canvas-area"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
