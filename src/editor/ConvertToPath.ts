import type { Shape, PathShape } from "./Shape";
import { createPathShape } from "./Shape";
import type { PathNode } from "./Node";
import { createNodeWithHandles } from "./Node";

// Kappa constant for approximating a circle with cubic Bézier curves
// 4 * (sqrt(2) - 1) / 3
const KAPPA = 0.5522847498;

/**
 * Convert a rectangle or ellipse shape to an equivalent PathShape.
 * Path shapes are returned as-is.
 */
export function convertToPath(shape: Shape): PathShape | null {
  switch (shape.type) {
    case "path":
      return shape;

    case "rectangle": {
      const { x, y } = shape.transform;
      const { width, height } = shape;

      const nodes: PathNode[] = [
        { position: { x, y }, handleIn: null, handleOut: null, type: "corner" },
        { position: { x: x + width, y }, handleIn: null, handleOut: null, type: "corner" },
        { position: { x: x + width, y: y + height }, handleIn: null, handleOut: null, type: "corner" },
        { position: { x, y: y + height }, handleIn: null, handleOut: null, type: "corner" },
      ];

      const path = createPathShape(nodes, true, shape.style);
      return { ...path, id: shape.id };
    }

    case "ellipse": {
      const cx = shape.transform.x;
      const cy = shape.transform.y;
      const { rx, ry } = shape;
      const kx = rx * KAPPA;
      const ky = ry * KAPPA;

      // 4 smooth nodes at cardinal points with kappa handles
      const nodes: PathNode[] = [
        createNodeWithHandles(
          { x: cx, y: cy - ry },
          { x: cx + kx, y: cy - ry },
          { x: cx - kx, y: cy - ry },
          "smooth"
        ),
        createNodeWithHandles(
          { x: cx - rx, y: cy },
          { x: cx - rx, y: cy - ky },
          { x: cx - rx, y: cy + ky },
          "smooth"
        ),
        createNodeWithHandles(
          { x: cx, y: cy + ry },
          { x: cx - kx, y: cy + ry },
          { x: cx + kx, y: cy + ry },
          "smooth"
        ),
        createNodeWithHandles(
          { x: cx + rx, y: cy },
          { x: cx + rx, y: cy + ky },
          { x: cx + rx, y: cy - ky },
          "smooth"
        ),
      ];

      const path = createPathShape(nodes, true, shape.style);
      return { ...path, id: shape.id };
    }
  }
}
