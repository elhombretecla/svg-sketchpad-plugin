import type { PluginMessage, InsertSvgPayload } from "./plugin/penpotBridge";
import { insertSvgIntoCanvas } from "./plugin/insertSvg";

penpot.ui.open("Vector Sketchpad", `?theme=${penpot.theme}`, {
  width: 900,
  height: 600,
});

penpot.ui.onMessage<PluginMessage>((message) => {
  if (!message || typeof message !== "object") return;

  switch (message.type) {
    case "ready":
      penpot.ui.sendMessage({
        source: "penpot",
        type: "viewport-info",
        payload: {
          centerX: penpot.viewport.center.x,
          centerY: penpot.viewport.center.y,
        },
      });
      break;

    case "insert-svg": {
      const result = insertSvgIntoCanvas(message.payload as InsertSvgPayload);
      penpot.ui.sendMessage({
        source: "penpot",
        type: "insert-result",
        payload: result,
      });
      break;
    }

    case "close":
      penpot.closePlugin();
      break;
  }
});

penpot.on("themechange", (theme) => {
  penpot.ui.sendMessage({
    source: "penpot",
    type: "themechange",
    payload: theme,
  });
});
