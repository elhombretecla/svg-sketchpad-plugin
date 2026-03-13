import type { Point } from "./Geometry";
import {
  splitCubicBezier,
  lineToCubic,
  nearestTOnCubic,
} from "./Geometry";
import type { PathNode } from "./Node";
import { createNodeWithHandles } from "./Node";
import type { PathShape } from "./Shape";

// ============================================================
// Segment helpers
// ============================================================

/**
 * Get the cubic Bézier control points for the segment between
 * nodes[i] and nodes[i+1] (or back to nodes[0] if closed).
 *
 * Straight-line segments (null handles) are promoted to cubic
 * so all operations work uniformly on cubics.
 */
export function segmentControlPoints(
  from: PathNode,
  to: PathNode
): [Point, Point, Point, Point] {
  const p0 = from.position;
  const p3 = to.position;
  const p1 = from.handleOut ?? p0;
  const p2 = to.handleIn ?? p3;

  // If both handles are at node positions, it's a straight line → promote
  if (!from.handleOut && !to.handleIn) {
    return lineToCubic(p0, p3);
  }

  return [p0, p1, p2, p3];
}

// ============================================================
// addNode – insert a node on a path by splitting a segment
// ============================================================

/**
 * Insert a new node on the segment between `segmentIndex` and `segmentIndex+1`
 * at parameter `t` ∈ (0, 1).
 *
 * Uses de Casteljau splitting so the path geometry is preserved exactly.
 *
 * Returns a new nodes array with the inserted node.
 */
export function addNodeAtSegment(
  nodes: PathNode[],
  segmentIndex: number,
  t: number,
  closed: boolean
): PathNode[] {
  const fromIdx = segmentIndex;
  const toIdx = closed
    ? (segmentIndex + 1) % nodes.length
    : segmentIndex + 1;

  if (toIdx >= nodes.length && !closed) return [...nodes];

  const from = nodes[fromIdx];
  const to = nodes[toIdx];

  const [p0, p1, p2, p3] = segmentControlPoints(from, to);
  const [[, l1, l2, mid], [, r1, r2]] = splitCubicBezier(p0, p1, p2, p3, t);

  // Determine if handles are meaningful (not collapsed onto position)
  const isLine = !from.handleOut && !to.handleIn;

  // Update the "from" node: keep position, update handleOut
  const updatedFrom: PathNode = {
    ...from,
    handleOut: isLine ? null : l1,
  };

  // The new mid node
  const newNode = createNodeWithHandles(
    mid,
    isLine ? null : l2,
    isLine ? null : r1,
    "smooth"
  );

  // Update the "to" node: keep position, update handleIn
  const updatedTo: PathNode = {
    ...to,
    handleIn: isLine ? null : r2,
  };

  // Build new array
  const result = [...nodes];
  result[fromIdx] = updatedFrom;
  result[toIdx] = updatedTo;

  // Insert the new node after fromIdx
  if (closed && toIdx < fromIdx) {
    // Closing segment: insert at end
    result.push(newNode);
  } else {
    result.splice(fromIdx + 1, 0, newNode);
  }

  return result;
}

/**
 * Insert a node at the nearest point on any segment of the path.
 *
 * Returns `{ nodes, insertedIndex }` or null if no suitable segment found.
 */
export function addNodeAtPoint(
  shape: PathShape,
  point: Point,
  tolerance: number = 10
): { nodes: PathNode[]; insertedIndex: number } | null {
  const { nodes, closed } = shape;
  if (nodes.length < 2) return null;

  const segCount = closed ? nodes.length : nodes.length - 1;

  let bestSegment = -1;
  let bestT = 0.5;
  let bestDist = Infinity;

  for (let i = 0; i < segCount; i++) {
    const toIdx = (i + 1) % nodes.length;
    const from = nodes[i];
    const to = nodes[toIdx];

    const [p0, p1, p2, p3] = segmentControlPoints(from, to);
    const result = nearestTOnCubic(p0, p1, p2, p3, point);

    if (result.distance < bestDist) {
      bestDist = result.distance;
      bestT = result.t;
      bestSegment = i;
    }
  }

  if (bestSegment < 0 || bestDist > tolerance) return null;

  // Clamp t away from endpoints to avoid degenerate splits
  const t = Math.max(0.01, Math.min(0.99, bestT));

  const newNodes = addNodeAtSegment(nodes, bestSegment, t, closed);
  return {
    nodes: newNodes,
    insertedIndex: bestSegment + 1,
  };
}

// ============================================================
// deleteNode – remove a node and reconnect the path
// ============================================================

/**
 * Remove a node from a path's node array.
 *
 * If the path is open and the deleted node is at the start or end,
 * simply remove it. Otherwise, reconnect the neighbors with a
 * straight line (handles cleared on the connecting side).
 *
 * Returns the new nodes array, or null if the path should be deleted
 * (fewer than 2 nodes remaining for open paths, fewer than 3 for closed).
 */
export function deleteNode(
  nodes: PathNode[],
  nodeIndex: number,
  closed: boolean
): PathNode[] | null {
  if (nodeIndex < 0 || nodeIndex >= nodes.length) return [...nodes];

  const minNodes = closed ? 3 : 2;
  if (nodes.length <= minNodes) return null;

  const result = [...nodes];
  result.splice(nodeIndex, 1);

  if (!closed) {
    // Open path: if we removed first node, clear handleIn of new first
    if (nodeIndex === 0 && result.length > 0) {
      result[0] = { ...result[0], handleIn: null };
    }
    // If we removed last node, clear handleOut of new last
    if (nodeIndex >= result.length && result.length > 0) {
      const lastIdx = result.length - 1;
      result[lastIdx] = { ...result[lastIdx], handleOut: null };
    }
    // If we removed a middle node, clear connecting handles
    if (nodeIndex > 0 && nodeIndex < result.length) {
      const prevIdx = nodeIndex - 1;
      result[prevIdx] = { ...result[prevIdx], handleOut: null };
      result[nodeIndex] = { ...result[nodeIndex], handleIn: null };
    }
  } else {
    // Closed path: clear handles on the two neighbors that now connect
    const prevIdx = (nodeIndex - 1 + result.length) % result.length;
    const nextIdx = nodeIndex % result.length;
    result[prevIdx] = { ...result[prevIdx], handleOut: null };
    result[nextIdx] = { ...result[nextIdx], handleIn: null };
  }

  return result;
}

/**
 * Remove multiple nodes from a path by their indices.
 * Indices are processed in descending order to maintain correct positions.
 *
 * Returns the new nodes array, or null if too few nodes remain.
 */
export function deleteNodes(
  nodes: PathNode[],
  indices: number[],
  closed: boolean
): PathNode[] | null {
  // Sort descending so removals don't shift later indices
  const sorted = [...indices].sort((a, b) => b - a);

  let current: PathNode[] | null = [...nodes];
  for (const idx of sorted) {
    if (!current) return null;
    current = deleteNode(current, idx, closed);
  }

  return current;
}
