import { Toolbar } from "./Toolbar";
import { ToolsPanel } from "./ToolsPanel";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { Footer } from "./Footer";
import { NodeToolbar } from "./NodeToolbar";

export function EditorLayout() {
  return (
    <div class="editor-layout">
      <ToolsPanel />
      <div class="editor-main">
        <Toolbar />
        <NodeToolbar />
        <Canvas />
        <Footer />
      </div>
      <Inspector />
    </div>
  );
}
