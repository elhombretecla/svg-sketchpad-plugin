import { useEffect, useState } from "preact/hooks";
import { Icon } from "../icons/Icon";
import {
  ICON_SELECT,
  ICON_PEN,
  ICON_NODE,
  ICON_RECTANGLE,
  ICON_ELLIPSE,
  ICON_CONVERT_PATH,
  ICON_INSERT,
  ICON_EXIT,
} from "../icons/icons";
import { editorStore } from "../state/editorStore";
import type { ToolType } from "../../tools/BaseTool";
import type { IconDef } from "../icons/icons";
import { convertToPath } from "../../editor/ConvertToPath";
import { updateShape, getShape } from "../../editor/Document";
import { sendToPlugin } from "../../plugin/penpotBridge";

interface ToolDef {
  type: ToolType;
  icon: IconDef;
  label: string;
  shortcut: string;
  group: number;
}

const TOOLS: ToolDef[] = [
  { type: "select", icon: ICON_SELECT, label: "Select", shortcut: "V", group: 0 },
  { type: "pen", icon: ICON_PEN, label: "Pen tool", shortcut: "P", group: 1 },
  { type: "node", icon: ICON_NODE, label: "Node tool", shortcut: "A", group: 1 },
  { type: "rectangle", icon: ICON_RECTANGLE, label: "Rectangle", shortcut: "R", group: 2 },
  { type: "ellipse", icon: ICON_ELLIPSE, label: "Ellipse", shortcut: "E", group: 2 },
];

// Convert to path is a special action, not a regular tool
const CONVERT_TOOL = {
  icon: ICON_CONVERT_PATH,
  label: "Convert to path",
  shortcut: "",
  group: 3,
};

export function ToolsPanel() {
  const [activeTool, setActiveTool] = useState<ToolType>(
    editorStore.getState().activeTool
  );

  useEffect(() => {
    return editorStore.subscribe((state) => {
      setActiveTool(state.activeTool);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      const tool = TOOLS.find(
        (t) => t.shortcut.toLowerCase() === e.key.toLowerCase()
      );
      if (tool) {
        editorStore.getState().setActiveTool(tool.type);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToolClick = (type: ToolType) => {
    editorStore.getState().setActiveTool(type);
  };

  const handleConvert = () => {
    const store = editorStore.getState();
    if (store.selection.length !== 1) return;
    const shape = getShape(store.document, store.selection[0]);
    if (!shape) return;

    const pathShape = convertToPath(shape);
    if (!pathShape || pathShape === shape) return;

    // Replace shape in document
    store.setDocument(
      updateShape(store.document, shape.id, () => pathShape)
    );
    store.setSelection([pathShape.id]);
    store.setActiveTool("node");
  };

  const handleInsert = () => {
    editorStore.getState().setFooterMode("confirm");
  };

  const handleExit = () => {
    sendToPlugin("close");
  };

  // Group tools with separators
  let lastGroup = -1;

  return (
    <aside class="tools-panel">
      <div class="tools-top">
        {TOOLS.map((tool) => {
          const needsSep = lastGroup >= 0 && tool.group !== lastGroup;
          lastGroup = tool.group;
          return (
            <>
              {needsSep && <span class="tools-sep" />}
              <button
                key={tool.type}
                class={`tool-btn ${activeTool === tool.type ? "active" : ""}`}
                onClick={() => handleToolClick(tool.type)}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
              >
                <Icon icon={tool.icon} />
              </button>
            </>
          );
        })}
        <span class="tools-sep" />
        <button
          class="tool-btn"
          onClick={handleConvert}
          title={CONVERT_TOOL.label}
        >
          <Icon icon={CONVERT_TOOL.icon} />
        </button>
      </div>

      <div class="tools-bottom">
        <button class="tool-btn action-btn" onClick={handleInsert} title="Insert into Penpot">
          <Icon icon={ICON_INSERT} />
        </button>
        <button class="tool-btn exit-btn" onClick={handleExit} title="Cancel (close plugin)">
          <Icon icon={ICON_EXIT} />
        </button>
      </div>
    </aside>
  );
}
