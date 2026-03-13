import type { Point } from "../editor/Geometry";

export interface PanZoomState {
  offset: Point;
  zoom: number;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 32;

export function createPanZoomState(): PanZoomState {
  return {
    offset: { x: 0, y: 0 },
    zoom: 1,
  };
}

export function screenToCanvas(
  screenPoint: Point,
  state: PanZoomState
): Point {
  return {
    x: (screenPoint.x - state.offset.x) / state.zoom,
    y: (screenPoint.y - state.offset.y) / state.zoom,
  };
}

export function canvasToScreen(
  canvasPoint: Point,
  state: PanZoomState
): Point {
  return {
    x: canvasPoint.x * state.zoom + state.offset.x,
    y: canvasPoint.y * state.zoom + state.offset.y,
  };
}

export function applyZoom(
  state: PanZoomState,
  delta: number,
  center: Point
): PanZoomState {
  const factor = delta > 0 ? 0.9 : 1.1;
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom * factor));

  const newOffset = {
    x: center.x - (center.x - state.offset.x) * (newZoom / state.zoom),
    y: center.y - (center.y - state.offset.y) * (newZoom / state.zoom),
  };

  return { offset: newOffset, zoom: newZoom };
}

export function applyPan(state: PanZoomState, dx: number, dy: number): PanZoomState {
  return {
    ...state,
    offset: {
      x: state.offset.x + dx,
      y: state.offset.y + dy,
    },
  };
}
