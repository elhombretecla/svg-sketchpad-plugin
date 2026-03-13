import type { InsertSvgPayload } from "./penpotBridge";

/**
 * Insert an SVG string into the Penpot canvas.
 * This runs in the plugin backend context where `penpot` global is available.
 */
export function insertSvgIntoCanvas(payload: InsertSvgPayload): {
  success: boolean;
  error?: string;
} {
  try {
    const { svg } = payload;

    const group = penpot.createShapeFromSvg(svg);

    if (!group) {
      return { success: false, error: "Failed to create shape from SVG" };
    }

    group.x = penpot.viewport.center.x - (group.width ?? 0) / 2;
    group.y = penpot.viewport.center.y - (group.height ?? 0) / 2;

    penpot.selection = [group];

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
