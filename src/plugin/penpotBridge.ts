/**
 * Message types exchanged between plugin backend and UI iframe.
 */

export type PluginMessageType =
  | "ready"
  | "insert-svg"
  | "themechange"
  | "viewport-info"
  | "insert-result"
  | "close";

export interface PluginMessage {
  source: "penpot" | "plugin-ui";
  type: PluginMessageType;
  payload?: unknown;
}

export interface InsertSvgPayload {
  svg: string;
  width: number;
  height: number;
}

export interface ViewportInfoPayload {
  centerX: number;
  centerY: number;
}

export interface InsertResultPayload {
  success: boolean;
  error?: string;
}

/**
 * Send a typed message from the UI to the plugin backend.
 */
export function sendToPlugin(type: PluginMessageType, payload?: unknown): void {
  const message: PluginMessage = {
    source: "plugin-ui",
    type,
    payload,
  };
  parent.postMessage(message, "*");
}

/**
 * Listen for messages from the plugin backend in the UI context.
 */
export function onPluginMessage(
  handler: (msg: PluginMessage) => void
): () => void {
  const listener = (event: MessageEvent) => {
    const data = event.data;
    if (data && data.source === "penpot") {
      handler(data as PluginMessage);
    }
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
