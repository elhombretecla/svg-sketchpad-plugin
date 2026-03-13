import { render } from "preact";
import { App } from "./ui/components/App";
import { editorStore } from "./ui/state/editorStore";
import { onPluginMessage, sendToPlugin } from "./plugin/penpotBridge";
import type { InsertResultPayload } from "./plugin/penpotBridge";
import "./ui/styles/app.css";

// Initialize theme from URL params
const searchParams = new URLSearchParams(window.location.search);
const initialTheme = (searchParams.get("theme") as "light" | "dark") ?? "light";
document.body.dataset.theme = initialTheme;
editorStore.getState().setTheme(initialTheme);

// Listen for messages from plugin backend
onPluginMessage((msg) => {
  switch (msg.type) {
    case "themechange": {
      const theme = msg.payload as "light" | "dark";
      document.body.dataset.theme = theme;
      editorStore.getState().setTheme(theme);
      break;
    }
    case "insert-result": {
      const result = msg.payload as InsertResultPayload;
      if (result.success) {
        // Close the plugin after successful insertion
        sendToPlugin("close");
      } else {
        console.error("Insert failed:", result.error);
        // Dispatch a custom event so Footer can react
        window.dispatchEvent(
          new CustomEvent("insert-error", {
            detail: result.error ?? "Unknown error",
          })
        );
      }
      break;
    }
  }
});

// Mount app
const root = document.getElementById("app");
if (root) {
  render(<App />, root);
}

// Notify plugin backend that UI is ready
sendToPlugin("ready");
