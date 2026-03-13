import { useEffect, useState } from "preact/hooks";
import { Icon } from "../icons/Icon";
import {
  ICON_UNDO,
  ICON_SNAP,
  ICON_ALIGN_NODES,
  ICON_DISTRIBUTE_NODES,
  ICON_ZOOM_IN,
  ICON_ZOOM_OUT,
  ICON_FIT,
} from "../icons/icons";
import { editorStore } from "../state/editorStore";
import { SnapMenu } from "./SnapMenu";
import { AlignBar } from "./AlignBar";

export function Toolbar() {
  const [zoom, setZoom] = useState(100);
  const [showSnap, setShowSnap] = useState(false);
  const [showAlign, setShowAlign] = useState(false);

  useEffect(() => {
    return editorStore.subscribe((state) => {
      setZoom(Math.round(state.panZoom.zoom * 100));
      setShowSnap(state.showSnapMenu);
      setShowAlign(state.showAlignBar);
    });
  }, []);

  const handleUndo = () => {
    // TODO: implement undo
  };

  const handleRedo = () => {
    // TODO: implement redo
  };

  const toggleSnap = () => {
    const s = editorStore.getState();
    s.setShowSnapMenu(!s.showSnapMenu);
    s.setShowAlignBar(false);
  };

  const toggleAlign = () => {
    const s = editorStore.getState();
    s.setShowAlignBar(!s.showAlignBar);
    s.setShowSnapMenu(false);
  };

  const handleDistribute = () => {
    // TODO: implement distribute nodes
  };

  return (
    <div class="toolbar-wrapper">
      <div class="toolbar-pill">
        <button class="toolbar-btn" onClick={handleUndo} title="Undo (Ctrl+Z)">
          <Icon icon={ICON_UNDO} />
        </button>
        <button class="toolbar-btn" onClick={handleRedo} title="Redo (Ctrl+Shift+Z)">
          <Icon icon={ICON_UNDO} flip="horizontal" />
        </button>

        <span class="toolbar-sep" />

        <button
          class={`toolbar-btn ${showSnap ? "active" : ""}`}
          onClick={toggleSnap}
          title="Snap options"
        >
          <Icon icon={ICON_SNAP} />
        </button>
        <button
          class={`toolbar-btn ${showAlign ? "active" : ""}`}
          onClick={toggleAlign}
          title="Align nodes"
        >
          <Icon icon={ICON_ALIGN_NODES} />
        </button>
        <button class="toolbar-btn" onClick={handleDistribute} title="Distribute nodes">
          <Icon icon={ICON_DISTRIBUTE_NODES} />
        </button>

        <span class="toolbar-sep" />

        <button
          class="toolbar-btn"
          onClick={() => editorStore.getState().zoomIn()}
          title="Zoom in"
        >
          <Icon icon={ICON_ZOOM_IN} />
        </button>
        <span class="toolbar-zoom body-s">{zoom}%</span>
        <button
          class="toolbar-btn"
          onClick={() => editorStore.getState().zoomOut()}
          title="Zoom out"
        >
          <Icon icon={ICON_ZOOM_OUT} />
        </button>
        <button
          class="toolbar-btn"
          onClick={() => editorStore.getState().fitCanvas()}
          title="Fit canvas"
        >
          <Icon icon={ICON_FIT} />
        </button>
      </div>

      {showSnap && <SnapMenu />}
      {showAlign && <AlignBar />}
    </div>
  );
}
