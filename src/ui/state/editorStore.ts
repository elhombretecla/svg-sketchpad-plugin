import { createStore } from "zustand/vanilla";
import type { EditorDocument } from "../../editor/Document";
import { createDocument } from "../../editor/Document";
import type { PathStyle } from "../../editor/Path";
import { DEFAULT_PATH_STYLE } from "../../editor/Path";
import type { ToolType } from "../../tools/BaseTool";
import type { PanZoomState } from "../../canvas/PanZoom";
import { createPanZoomState } from "../../canvas/PanZoom";
import type { BoundingBox, Point } from "../../editor/Geometry";
import type { PathNode } from "../../editor/Node";
import type { Shape } from "../../editor/Shape";

export type SnapMode = "pixels" | "grid" | "nodes" | "disabled";

export type StrokePosition = "center" | "inside" | "outside";

export type StrokeType = "solid" | "dashed" | "dotted";

export interface PenState {
  nodes: PathNode[];
  currentHandle: Point | null;
  cursorPos: Point | null;
}

export interface EditorState {
  document: EditorDocument;
  selection: string[];
  activeTool: ToolType;
  style: PathStyle;
  snapMode: SnapMode;
  panZoom: PanZoomState;
  theme: "light" | "dark";
  strokePosition: StrokePosition;
  strokeType: StrokeType;
  fillEnabled: boolean;
  fillColor: string;
  fillOpacity: number;
  strokeOpacity: number;
  showAlignBar: boolean;
  showSnapMenu: boolean;
  footerMode: "idle" | "confirm";
  rubberBand: BoundingBox | null;
  nodeSelection: number[];
  penState: PenState | null;
  shapePreview: Shape | null;
}

export interface EditorActions {
  setDocument: (doc: EditorDocument) => void;
  setSelection: (ids: string[]) => void;
  setActiveTool: (tool: ToolType) => void;
  setStyle: (style: Partial<PathStyle>) => void;
  setSnapMode: (mode: SnapMode) => void;
  setPanZoom: (panZoom: PanZoomState) => void;
  setTheme: (theme: "light" | "dark") => void;
  setStrokePosition: (pos: StrokePosition) => void;
  setStrokeType: (type: StrokeType) => void;
  setFillEnabled: (enabled: boolean) => void;
  setFillColor: (color: string) => void;
  setFillOpacity: (opacity: number) => void;
  setStrokeOpacity: (opacity: number) => void;
  setShowAlignBar: (show: boolean) => void;
  setShowSnapMenu: (show: boolean) => void;
  setFooterMode: (mode: "idle" | "confirm") => void;
  setRubberBand: (rect: BoundingBox | null) => void;
  setNodeSelection: (indices: number[]) => void;
  setPenState: (state: PenState | null) => void;
  setShapePreview: (shape: Shape | null) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
  fitCanvas: () => void;
}

export type EditorStore = EditorState & EditorActions;

export const editorStore = createStore<EditorStore>((set) => ({
  document: createDocument(),
  selection: [],
  activeTool: "select",
  style: { ...DEFAULT_PATH_STYLE },
  snapMode: "pixels",
  panZoom: createPanZoomState(),
  theme: "light",
  strokePosition: "inside",
  strokeType: "solid",
  fillEnabled: true,
  fillColor: "#FABADA",
  fillOpacity: 100,
  strokeOpacity: 100,
  showAlignBar: false,
  showSnapMenu: false,
  footerMode: "idle",
  rubberBand: null,
  nodeSelection: [],
  penState: null,
  shapePreview: null,

  setDocument: (document) => set({ document }),
  setSelection: (selection) => set({ selection }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setStyle: (partial) =>
    set((state) => ({ style: { ...state.style, ...partial } })),
  setSnapMode: (snapMode) => set({ snapMode }),
  setPanZoom: (panZoom) => set({ panZoom }),
  setTheme: (theme) => set({ theme }),
  setStrokePosition: (strokePosition) => set({ strokePosition }),
  setStrokeType: (strokeType) => set({ strokeType }),
  setFillEnabled: (fillEnabled) => set({ fillEnabled }),
  setFillColor: (fillColor) => set({ fillColor }),
  setFillOpacity: (fillOpacity) => set({ fillOpacity }),
  setStrokeOpacity: (strokeOpacity) => set({ strokeOpacity }),
  setShowAlignBar: (showAlignBar) => set({ showAlignBar }),
  setShowSnapMenu: (showSnapMenu) => set({ showSnapMenu }),
  setFooterMode: (footerMode) => set({ footerMode }),
  setRubberBand: (rubberBand) => set({ rubberBand }),
  setNodeSelection: (nodeSelection) => set({ nodeSelection }),
  setPenState: (penState) => set({ penState }),
  setShapePreview: (shapePreview) => set({ shapePreview }),

  zoomIn: () =>
    set((state) => ({
      panZoom: {
        ...state.panZoom,
        zoom: Math.min(32, state.panZoom.zoom * 1.25),
      },
    })),

  zoomOut: () =>
    set((state) => ({
      panZoom: {
        ...state.panZoom,
        zoom: Math.max(0.1, state.panZoom.zoom / 1.25),
      },
    })),

  zoomTo: (zoom: number) =>
    set((state) => ({
      panZoom: {
        ...state.panZoom,
        zoom: Math.min(32, Math.max(0.1, zoom)),
      },
    })),

  fitCanvas: () =>
    set((state) => {
      const doc = state.document;
      // Reset to center with zoom 1
      return {
        panZoom: {
          offset: { x: 0, y: 0 },
          zoom: Math.min(
            1,
            Math.min(
              window.innerWidth / doc.width,
              window.innerHeight / doc.height
            ) * 0.8
          ),
        },
      };
    }),
}));
