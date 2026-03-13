import type { Point, BoundingBox } from "./Geometry";
import type { PathNode } from "./Node";
import {
  boundingBoxFromPoints,
  distanceToSegment,
  pointInPolygon,
} from "./Geometry";

// --- Style ---

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export const DEFAULT_STYLE: ShapeStyle = {
  fill: "none",
  stroke: "#000000",
  strokeWidth: 2,
  opacity: 1,
};

// --- Transform ---

export interface ShapeTransform {
  x: number;
  y: number;
  rotation: number;
}

export function defaultTransform(): ShapeTransform {
  return { x: 0, y: 0, rotation: 0 };
}

// --- Shape variants ---

export interface PathShape {
  id: string;
  type: "path";
  nodes: PathNode[];
  closed: boolean;
  transform: ShapeTransform;
  style: ShapeStyle;
}

export interface RectShape {
  id: string;
  type: "rectangle";
  width: number;
  height: number;
  transform: ShapeTransform;
  style: ShapeStyle;
}

export interface EllipseShape {
  id: string;
  type: "ellipse";
  rx: number;
  ry: number;
  transform: ShapeTransform;
  style: ShapeStyle;
}

export type Shape = PathShape | RectShape | EllipseShape;

// --- ID generation ---

let _nextId = 1;

export function nextShapeId(prefix: string = "shape"): string {
  return `${prefix}-${_nextId++}`;
}

// --- Factory functions ---

export function createPathShape(
  nodes: PathNode[] = [],
  closed: boolean = false,
  style?: Partial<ShapeStyle>
): PathShape {
  return {
    id: nextShapeId("path"),
    type: "path",
    nodes,
    closed,
    transform: defaultTransform(),
    style: { ...DEFAULT_STYLE, ...style },
  };
}

export function createRectShape(
  x: number,
  y: number,
  width: number,
  height: number,
  style?: Partial<ShapeStyle>
): RectShape {
  return {
    id: nextShapeId("rect"),
    type: "rectangle",
    width,
    height,
    transform: { x, y, rotation: 0 },
    style: { ...DEFAULT_STYLE, ...style },
  };
}

export function createEllipseShape(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  style?: Partial<ShapeStyle>
): EllipseShape {
  return {
    id: nextShapeId("ellipse"),
    type: "ellipse",
    rx,
    ry,
    transform: { x: cx, y: cy, rotation: 0 },
    style: { ...DEFAULT_STYLE, ...style },
  };
}

// --- Bounding box ---

export function shapeBoundingBox(shape: Shape): BoundingBox | null {
  switch (shape.type) {
    case "path": {
      if (shape.nodes.length === 0) return null;
      const points = shape.nodes.map((n) => ({
        x: n.position.x + shape.transform.x,
        y: n.position.y + shape.transform.y,
      }));
      // Include handles for more accurate bounds
      for (const n of shape.nodes) {
        if (n.handleIn) {
          points.push({
            x: n.handleIn.x + shape.transform.x,
            y: n.handleIn.y + shape.transform.y,
          });
        }
        if (n.handleOut) {
          points.push({
            x: n.handleOut.x + shape.transform.x,
            y: n.handleOut.y + shape.transform.y,
          });
        }
      }
      return boundingBoxFromPoints(points);
    }
    case "rectangle":
      return {
        x: shape.transform.x,
        y: shape.transform.y,
        width: shape.width,
        height: shape.height,
      };
    case "ellipse":
      return {
        x: shape.transform.x - shape.rx,
        y: shape.transform.y - shape.ry,
        width: shape.rx * 2,
        height: shape.ry * 2,
      };
  }
}

// --- SVG path data generation ---

export function shapeToSvgD(shape: PathShape): string {
  const { nodes, closed } = shape;
  if (nodes.length === 0) return "";

  const parts: string[] = [];
  const first = nodes[0];
  parts.push(`M ${first.position.x} ${first.position.y}`);

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];

    if (prev.handleOut && curr.handleIn) {
      parts.push(
        `C ${prev.handleOut.x} ${prev.handleOut.y} ${curr.handleIn.x} ${curr.handleIn.y} ${curr.position.x} ${curr.position.y}`
      );
    } else if (prev.handleOut) {
      parts.push(
        `Q ${prev.handleOut.x} ${prev.handleOut.y} ${curr.position.x} ${curr.position.y}`
      );
    } else if (curr.handleIn) {
      parts.push(
        `Q ${curr.handleIn.x} ${curr.handleIn.y} ${curr.position.x} ${curr.position.y}`
      );
    } else {
      parts.push(`L ${curr.position.x} ${curr.position.y}`);
    }
  }

  if (closed && nodes.length > 1) {
    const last = nodes[nodes.length - 1];
    if (last.handleOut && first.handleIn) {
      parts.push(
        `C ${last.handleOut.x} ${last.handleOut.y} ${first.handleIn.x} ${first.handleIn.y} ${first.position.x} ${first.position.y}`
      );
    }
    parts.push("Z");
  }

  return parts.join(" ");
}

// --- Shape transforms ---

/**
 * Translate a shape by (dx, dy) in canvas coordinates.
 */
export function moveShape(shape: Shape, dx: number, dy: number): Shape {
  return {
    ...shape,
    transform: {
      ...shape.transform,
      x: shape.transform.x + dx,
      y: shape.transform.y + dy,
    },
  };
}

/**
 * Scale a shape from one bounding box to another.
 * The shape is repositioned and resized so it occupies the same relative
 * position within `toBB` as it did within `fromBB`.
 */
export function scaleShape(
  shape: Shape,
  fromBB: BoundingBox,
  toBB: BoundingBox
): Shape {
  const bb = shapeBoundingBox(shape);
  if (!bb) return shape;

  // Relative position/size within fromBB
  const relX = fromBB.width > 0 ? (bb.x - fromBB.x) / fromBB.width : 0;
  const relY = fromBB.height > 0 ? (bb.y - fromBB.y) / fromBB.height : 0;
  const relW = fromBB.width > 0 ? bb.width / fromBB.width : 1;
  const relH = fromBB.height > 0 ? bb.height / fromBB.height : 1;

  // Target bounding box for this shape
  const newX = toBB.x + relX * toBB.width;
  const newY = toBB.y + relY * toBB.height;
  const newW = Math.max(1, relW * toBB.width);
  const newH = Math.max(1, relH * toBB.height);

  const scaleX = bb.width > 0 ? newW / bb.width : 1;
  const scaleY = bb.height > 0 ? newH / bb.height : 1;

  switch (shape.type) {
    case "rectangle":
      return {
        ...shape,
        transform: { ...shape.transform, x: newX, y: newY },
        width: newW,
        height: newH,
      };

    case "ellipse":
      return {
        ...shape,
        transform: {
          ...shape.transform,
          x: newX + newW / 2,
          y: newY + newH / 2,
        },
        rx: newW / 2,
        ry: newH / 2,
      };

    case "path": {
      // Nodes are in local space relative to transform. Scale them in place,
      // then adjust transform so the resulting BB aligns with newX/newY.
      const localMinX = bb.x - shape.transform.x;
      const localMinY = bb.y - shape.transform.y;

      const scaledNodes = shape.nodes.map((node) => ({
        ...node,
        position: {
          x: node.position.x * scaleX,
          y: node.position.y * scaleY,
        },
        handleIn: node.handleIn
          ? { x: node.handleIn.x * scaleX, y: node.handleIn.y * scaleY }
          : null,
        handleOut: node.handleOut
          ? { x: node.handleOut.x * scaleX, y: node.handleOut.y * scaleY }
          : null,
      }));

      return {
        ...shape,
        transform: {
          ...shape.transform,
          x: newX - localMinX * scaleX,
          y: newY - localMinY * scaleY,
        },
        nodes: scaledNodes,
      };
    }
  }
}

// --- Hit testing ---

/**
 * Check if a point hits a shape. Uses geometric testing.
 * @param point Point in canvas coordinates
 * @param shape Shape to test against
 * @param tolerance Hit tolerance in canvas units (for strokes)
 */
export function hitTestShape(
  point: Point,
  shape: Shape,
  tolerance: number = 4
): boolean {
  switch (shape.type) {
    case "rectangle": {
      const { x, y } = shape.transform;
      const { width, height } = shape;
      const t = tolerance + shape.style.strokeWidth / 2;

      // Check if inside filled area
      if (shape.style.fill !== "none") {
        return (
          point.x >= x - t &&
          point.x <= x + width + t &&
          point.y >= y - t &&
          point.y <= y + height + t
        );
      }

      // Stroke-only: check proximity to edges
      return (
        point.x >= x - t &&
        point.x <= x + width + t &&
        point.y >= y - t &&
        point.y <= y + height + t &&
        !(
          point.x >= x + t &&
          point.x <= x + width - t &&
          point.y >= y + t &&
          point.y <= y + height - t
        )
      );
    }

    case "ellipse": {
      const cx = shape.transform.x;
      const cy = shape.transform.y;
      const { rx, ry } = shape;
      const t = tolerance + shape.style.strokeWidth / 2;

      // Normalized distance from center
      const dx = point.x - cx;
      const dy = point.y - cy;
      const normDist = (dx * dx) / ((rx + t) * (rx + t)) + (dy * dy) / ((ry + t) * (ry + t));

      if (shape.style.fill !== "none") {
        return normDist <= 1;
      }

      // Stroke-only: ring test
      const innerDist =
        rx > t && ry > t
          ? (dx * dx) / ((rx - t) * (rx - t)) + (dy * dy) / ((ry - t) * (ry - t))
          : 2; // Force outer test if radii too small
      return normDist <= 1 && innerDist >= 1;
    }

    case "path": {
      // For paths, test bounding box first then use per-segment distance
      const bb = shapeBoundingBox(shape);
      if (!bb) return false;
      const t = tolerance + shape.style.strokeWidth / 2;
      const expandedBB = {
        x: bb.x - t,
        y: bb.y - t,
        width: bb.width + t * 2,
        height: bb.height + t * 2,
      };

      if (
        point.x < expandedBB.x ||
        point.x > expandedBB.x + expandedBB.width ||
        point.y < expandedBB.y ||
        point.y > expandedBB.y + expandedBB.height
      ) {
        return false;
      }

      // Test each line segment of the path
      const ox = shape.transform.x;
      const oy = shape.transform.y;
      const nodes = shape.nodes;

      // If filled and closed, check if point is inside polygon
      if (shape.style.fill !== "none" && shape.closed && nodes.length >= 3) {
        if (pointInPolygon(point, nodes.map((n) => ({
          x: n.position.x + ox,
          y: n.position.y + oy,
        })))) {
          return true;
        }
      }

      // Check proximity to each segment
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = {
          x: nodes[i].position.x + ox,
          y: nodes[i].position.y + oy,
        };
        const b = {
          x: nodes[i + 1].position.x + ox,
          y: nodes[i + 1].position.y + oy,
        };
        if (distanceToSegment(point, a, b) <= t) return true;
      }

      // Check closing segment
      if (shape.closed && nodes.length > 1) {
        const a = {
          x: nodes[nodes.length - 1].position.x + ox,
          y: nodes[nodes.length - 1].position.y + oy,
        };
        const b = {
          x: nodes[0].position.x + ox,
          y: nodes[0].position.y + oy,
        };
        if (distanceToSegment(point, a, b) <= t) return true;
      }

      return false;
    }
  }
}

/**
 * Test if a shape's bounding box intersects with a selection rectangle.
 */
export function shapeIntersectsRect(
  shape: Shape,
  rect: BoundingBox
): boolean {
  const bb = shapeBoundingBox(shape);
  if (!bb) return false;

  return !(
    bb.x + bb.width < rect.x ||
    bb.x > rect.x + rect.width ||
    bb.y + bb.height < rect.y ||
    bb.y > rect.y + rect.height
  );
}

