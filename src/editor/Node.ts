import type { Point } from "./Geometry";
import {
  subtractPoints,
  addPoints,
  magnitude,
  normalize,
  negatePoint,
  scalePoint,
} from "./Geometry";

// ============================================================
// Types
// ============================================================

/**
 * Node types control how handles behave when one is moved:
 *
 * - **corner**: handles move independently.
 * - **smooth**: handles remain collinear (opposite directions)
 *   but may have different lengths.
 * - **symmetric**: handles remain collinear AND have equal length.
 */
export type NodeType = "corner" | "smooth" | "symmetric";

/**
 * A node (anchor point) on a path.
 *
 * `handleIn` and `handleOut` are **absolute** positions, not offsets.
 * If null, the segment to/from this node is a straight line
 * (internally promoted to cubic with handles at 1/3 and 2/3).
 */
export interface PathNode {
  position: Point;
  handleIn: Point | null;
  handleOut: Point | null;
  type: NodeType;
}

// ============================================================
// Factory
// ============================================================

export function createNode(
  x: number,
  y: number,
  type: NodeType = "corner"
): PathNode {
  return {
    position: { x, y },
    handleIn: null,
    handleOut: null,
    type,
  };
}

export function createNodeWithHandles(
  position: Point,
  handleIn: Point | null,
  handleOut: Point | null,
  type: NodeType = "smooth"
): PathNode {
  return { position: { ...position }, handleIn, handleOut, type };
}

// ============================================================
// Move node (position changes, handles follow)
// ============================================================

/**
 * Move a node to a new position. Handles maintain their offset
 * relative to the node position.
 */
export function moveNode(node: PathNode, newPosition: Point): PathNode {
  const dx = newPosition.x - node.position.x;
  const dy = newPosition.y - node.position.y;

  return {
    ...node,
    position: { ...newPosition },
    handleIn: node.handleIn
      ? { x: node.handleIn.x + dx, y: node.handleIn.y + dy }
      : null,
    handleOut: node.handleOut
      ? { x: node.handleOut.x + dx, y: node.handleOut.y + dy }
      : null,
  };
}

// ============================================================
// Move handle (respects node type constraint)
// ============================================================

/**
 * Move one handle of a node to a new position.
 * The opposite handle is adjusted according to the node type:
 *
 * - **corner**: opposite handle is not changed.
 * - **smooth**: opposite handle is rotated to stay collinear,
 *   keeping its original length.
 * - **symmetric**: opposite handle mirrors exactly (collinear + same length).
 */
export function moveHandle(
  node: PathNode,
  which: "in" | "out",
  newHandlePos: Point
): PathNode {
  const moved = which === "in" ? "handleIn" : "handleOut";
  const other = which === "in" ? "handleOut" : "handleIn";

  const result: PathNode = {
    ...node,
    [moved]: { ...newHandlePos },
  };

  const otherHandle = node[other];

  if (node.type === "corner" || !otherHandle) {
    // No constraint — just set the moved handle.
    return result;
  }

  // Vector from position to the moved handle
  const movedVec = subtractPoints(newHandlePos, node.position);
  const movedLen = magnitude(movedVec);

  if (movedLen < 1e-10) {
    // Handle collapsed onto position — can't determine direction.
    return result;
  }

  if (node.type === "symmetric") {
    // Opposite handle mirrors exactly: same length, opposite direction.
    const mirrored = addPoints(node.position, negatePoint(movedVec));
    result[other] = mirrored;
  } else {
    // smooth: opposite handle stays collinear, keeps its own length.
    const otherVec = subtractPoints(otherHandle, node.position);
    const otherLen = magnitude(otherVec);

    if (otherLen < 1e-10) {
      return result;
    }

    const direction = normalize(negatePoint(movedVec));
    const newOtherHandle = addPoints(
      node.position,
      scalePoint(direction, otherLen)
    );
    result[other] = newOtherHandle;
  }

  return result;
}

// ============================================================
// Convert node type (Inkscape behavior)
// ============================================================

/**
 * Convert a node to a different type.
 *
 * **Critical**: this must NOT change the existing curve geometry.
 * The type flag is changed, but handles stay exactly where they are.
 * The constraint (smooth/symmetric) will only be enforced the next
 * time the user moves a handle, via `moveHandle()`.
 *
 * This matches Inkscape's behavior.
 */
export function convertNodeType(node: PathNode, newType: NodeType): PathNode {
  return { ...node, type: newType };
}

// ============================================================
// Handle utilities
// ============================================================

/**
 * Get the offset vector from node position to a handle.
 * Returns {0,0} if handle is null.
 */
export function handleOffset(node: PathNode, which: "in" | "out"): Point {
  const handle = which === "in" ? node.handleIn : node.handleOut;
  if (!handle) return { x: 0, y: 0 };
  return subtractPoints(handle, node.position);
}

/**
 * Check if a node has any handles (is curved).
 */
export function isCurved(node: PathNode): boolean {
  return node.handleIn !== null || node.handleOut !== null;
}

/**
 * Remove both handles from a node, making it a corner with straight segments.
 */
export function flattenNode(node: PathNode): PathNode {
  return {
    ...node,
    handleIn: null,
    handleOut: null,
    type: "corner",
  };
}

/**
 * Ensure handles are collinear (used when forcibly smoothing).
 * Adjusts handleIn to be collinear with handleOut through the position,
 * keeping handleIn's length.
 */
export function makeSmooth(node: PathNode): PathNode {
  if (!node.handleIn || !node.handleOut) return node;

  const outVec = subtractPoints(node.handleOut, node.position);
  const outLen = magnitude(outVec);
  if (outLen < 1e-10) return node;

  const inLen = magnitude(subtractPoints(node.handleIn, node.position));
  const dir = normalize(negatePoint(outVec));

  return {
    ...node,
    handleIn: addPoints(node.position, scalePoint(dir, inLen)),
    type: "smooth",
  };
}

/**
 * Make handles symmetric (collinear + equal length).
 * Uses the average length, direction from handleOut.
 */
export function makeSymmetric(node: PathNode): PathNode {
  if (!node.handleIn || !node.handleOut) return node;

  const outVec = subtractPoints(node.handleOut, node.position);
  const inVec = subtractPoints(node.handleIn, node.position);
  const outLen = magnitude(outVec);
  const inLen = magnitude(inVec);

  if (outLen < 1e-10 && inLen < 1e-10) return node;

  const avgLen = (outLen + inLen) / 2;

  // Use handleOut direction as reference
  const dir = outLen > 1e-10 ? normalize(outVec) : normalize(negatePoint(inVec));

  return {
    ...node,
    handleOut: addPoints(node.position, scalePoint(dir, avgLen)),
    handleIn: addPoints(node.position, scalePoint(negatePoint(dir), avgLen)),
    type: "symmetric",
  };
}
