import { useEffect, useState } from "preact/hooks";
import { editorStore } from "../state/editorStore";
import { convertNodeType } from "../../editor/Node";
import { updateShape, getShape } from "../../editor/Document";
import { deleteNodes } from "../../editor/PathOps";
import type { PathShape } from "../../editor/Shape";

export function NodeToolbar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const s = editorStore.getState();
      const show =
        s.activeTool === "node" && s.nodeSelection.length > 0;
      setVisible(show);
    };

    update();
    return editorStore.subscribe(update);
  }, []);

  if (!visible) return null;

  const handleConvert = (type: "corner" | "smooth" | "symmetric") => {
    const store = editorStore.getState();
    if (store.selection.length !== 1) return;
    const shape = getShape(store.document, store.selection[0]);
    if (!shape || shape.type !== "path") return;

    store.setDocument(
      updateShape(store.document, shape.id, (s) => {
        if (s.type !== "path") return s;
        const newNodes = [...s.nodes];
        for (const idx of store.nodeSelection) {
          if (idx >= 0 && idx < newNodes.length) {
            newNodes[idx] = convertNodeType(newNodes[idx], type);
          }
        }
        return { ...s, nodes: newNodes };
      })
    );
  };

  const handleDelete = () => {
    const store = editorStore.getState();
    if (store.selection.length !== 1) return;
    const shape = getShape(store.document, store.selection[0]) as PathShape | undefined;
    if (!shape || shape.type !== "path") return;

    const result = deleteNodes(shape.nodes, store.nodeSelection, shape.closed);
    if (result === null) {
      store.setDocument({
        ...store.document,
        shapes: store.document.shapes.filter((s) => s.id !== shape.id),
      });
      store.setSelection([]);
    } else {
      store.setDocument(
        updateShape(store.document, shape.id, (s) => {
          if (s.type !== "path") return s;
          return { ...s, nodes: result };
        })
      );
    }
    store.setNodeSelection([]);
  };

  return (
    <div class="node-toolbar">
      <button
        class="node-toolbar-btn"
        onClick={() => handleConvert("corner")}
        title="Corner (1)"
      >
        Corner
      </button>
      <button
        class="node-toolbar-btn"
        onClick={() => handleConvert("smooth")}
        title="Smooth (2)"
      >
        Smooth
      </button>
      <button
        class="node-toolbar-btn"
        onClick={() => handleConvert("symmetric")}
        title="Symmetric (3)"
      >
        Symmetric
      </button>
      <span class="node-toolbar-sep" />
      <button
        class="node-toolbar-btn node-toolbar-delete"
        onClick={handleDelete}
        title="Delete node"
      >
        Delete
      </button>
    </div>
  );
}
