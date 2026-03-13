// ============================================================
// Point & BoundingBox primitives
// ============================================================

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- Point arithmetic ---

export function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtractPoints(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scalePoint(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

export function negatePoint(p: Point): Point {
  return { x: -p.x, y: -p.y };
}

export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSq(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

export function magnitude(p: Point): number {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

export function normalize(p: Point): Point {
  const m = magnitude(p);
  if (m === 0) return { x: 0, y: 0 };
  return { x: p.x / m, y: p.y / m };
}

export function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function dotProduct(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function crossProduct(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

export function rotatePoint(p: Point, angle: number, origin: Point = { x: 0, y: 0 }): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function pointsEqual(a: Point, b: Point, epsilon: number = 1e-6): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

// --- Bounding box ---

export function boundingBoxFromPoints(points: Point[]): BoundingBox | null {
  if (points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function pointInBoundingBox(p: Point, bb: BoundingBox): boolean {
  return (
    p.x >= bb.x &&
    p.x <= bb.x + bb.width &&
    p.y >= bb.y &&
    p.y <= bb.y + bb.height
  );
}

export function mergeBoundingBoxes(a: BoundingBox, b: BoundingBox): BoundingBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
}

// --- Line segment distance ---

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return distance(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function nearestPointOnSegment(p: Point, a: Point, b: Point): { point: Point; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return { point: { ...a }, t: 0 };

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    point: { x: a.x + t * dx, y: a.y + t * dy },
    t,
  };
}

// --- Point-in-polygon ---

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}


// ============================================================
// Cubic Bézier math
// ============================================================

/**
 * Evaluate a cubic Bézier at parameter t ∈ [0, 1].
 *
 *   B(t) = (1-t)³·p0 + 3(1-t)²t·p1 + 3(1-t)t²·p2 + t³·p3
 */
export function cubicBezierPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/**
 * First derivative (tangent) of a cubic Bézier at parameter t.
 *
 *   B'(t) = 3(1-t)²(p1-p0) + 6(1-t)t(p2-p1) + 3t²(p3-p2)
 */
export function cubicBezierDerivative(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const u = 1 - t;
  const uu = u * u;
  const ut = u * t;
  const tt = t * t;

  return {
    x:
      3 * uu * (p1.x - p0.x) +
      6 * ut * (p2.x - p1.x) +
      3 * tt * (p3.x - p2.x),
    y:
      3 * uu * (p1.y - p0.y) +
      6 * ut * (p2.y - p1.y) +
      3 * tt * (p3.y - p2.y),
  };
}

/**
 * Unit tangent vector at parameter t on a cubic Bézier.
 */
export function cubicBezierTangent(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  return normalize(cubicBezierDerivative(p0, p1, p2, p3, t));
}

/**
 * Split a cubic Bézier at parameter t using de Casteljau's algorithm.
 * Returns two sets of 4 control points: [left, right].
 */
export function splitCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): [
  [Point, Point, Point, Point],
  [Point, Point, Point, Point],
] {
  const p01 = lerp(p0, p1, t);
  const p12 = lerp(p1, p2, t);
  const p23 = lerp(p2, p3, t);
  const p012 = lerp(p01, p12, t);
  const p123 = lerp(p12, p23, t);
  const p0123 = lerp(p012, p123, t);

  return [
    [p0, p01, p012, p0123],
    [p0123, p123, p23, p3],
  ];
}

/**
 * Compute an approximate bounding box for a cubic Bézier
 * by sampling + extrema estimation via control-point hull.
 */
export function cubicBezierBoundingBox(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): BoundingBox {
  // Control-point convex hull gives a guaranteed outer bound.
  // For tighter bounds, find extrema via derivative roots.
  const xs = [p0.x, p3.x];
  const ys = [p0.y, p3.y];

  // Find t values where derivative is zero for x and y.
  for (const roots of [
    quadraticRoots(
      3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x),
      6 * (p0.x - 2 * p1.x + p2.x),
      3 * (p1.x - p0.x)
    ),
    quadraticRoots(
      3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y),
      6 * (p0.y - 2 * p1.y + p2.y),
      3 * (p1.y - p0.y)
    ),
  ]) {
    for (const t of roots) {
      if (t > 0 && t < 1) {
        const pt = cubicBezierPoint(p0, p1, p2, p3, t);
        xs.push(pt.x);
        ys.push(pt.y);
      }
    }
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Find the nearest t on a cubic Bézier to a given point.
 * Uses iterative refinement (Newton-like) on a coarse sample.
 */
export function nearestTOnCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  target: Point,
  samples: number = 20
): { t: number; point: Point; distance: number } {
  // Coarse sampling
  let bestT = 0;
  let bestDist = Infinity;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = cubicBezierPoint(p0, p1, p2, p3, t);
    const d = distanceSq(pt, target);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
    }
  }

  // Refine with binary-style subdivision (3 iterations)
  let step = 1 / samples / 2;
  for (let iter = 0; iter < 4; iter++) {
    for (const dir of [-1, 1]) {
      const t = Math.max(0, Math.min(1, bestT + dir * step));
      const pt = cubicBezierPoint(p0, p1, p2, p3, t);
      const d = distanceSq(pt, target);
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
      }
    }
    step /= 2;
  }

  const bestPoint = cubicBezierPoint(p0, p1, p2, p3, bestT);
  return { t: bestT, point: bestPoint, distance: Math.sqrt(bestDist) };
}

/**
 * Distance from a point to a cubic Bézier curve.
 */
export function distanceToCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  target: Point
): number {
  return nearestTOnCubic(p0, p1, p2, p3, target).distance;
}

/**
 * Promote a straight line segment (a → b) to cubic Bézier control points.
 * Returns [p0, p1, p2, p3] where p1 and p2 lie at 1/3 and 2/3 of the line.
 */
export function lineToCubic(
  a: Point,
  b: Point
): [Point, Point, Point, Point] {
  return [a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b];
}


// ============================================================
// Segment dragging
// ============================================================

/**
 * Adjust the control points of a cubic Bézier so that the curve
 * passes through `target` at parameter `t`.
 *
 * This modifies ONLY the inner control points p1 and p2 (the handles)
 * while keeping p0 and p3 (the node positions) fixed.
 *
 * Algorithm: given the current point B(t) and desired point T,
 * compute the delta and distribute it to p1 and p2 weighted by
 * their influence at parameter t.
 *
 * Returns [newP1, newP2].
 */
/**
 * Adjust the control points of a cubic Bézier so that the curve
 * passes through `target` at parameter `t`.
 *
 * Modifies ONLY p1 and p2 (handles), keeping p0 and p3 (node positions) fixed.
 *
 * Derivation: delta = target - B(t). We need w1·d1 + w2·d2 = delta where
 * w1 = 3(1-t)²t, w2 = 3(1-t)t². Choosing d1 = d2 = delta/(w1+w2) gives the
 * simplest solution that distributes the correction equally to both handles.
 *
 * Returns the new handleOut (for the start node) and handleIn (for the end node).
 */
export function dragSegment(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
  target: Point
): { handleOut: Point; handleIn: Point } {
  const current = cubicBezierPoint(p0, p1, p2, p3, t);
  const dx = target.x - current.x;
  const dy = target.y - current.y;

  const u = 1 - t;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const wSum = w1 + w2;

  if (wSum < 1e-10) {
    return { handleOut: p1, handleIn: p2 };
  }

  const scale = 1 / wSum;

  return {
    handleOut: { x: p1.x + dx * scale, y: p1.y + dy * scale },
    handleIn: { x: p2.x + dx * scale, y: p2.y + dy * scale },
  };
}


// ============================================================
// Node alignment & distribution
// ============================================================

/**
 * Align a set of node positions along an axis.
 * Returns new positions (same array order).
 */
export function alignNodesLeft(positions: Point[]): Point[] {
  if (positions.length <= 1) return positions.map((p) => ({ ...p }));
  const minX = Math.min(...positions.map((p) => p.x));
  return positions.map((p) => ({ x: minX, y: p.y }));
}

export function alignNodesRight(positions: Point[]): Point[] {
  if (positions.length <= 1) return positions.map((p) => ({ ...p }));
  const maxX = Math.max(...positions.map((p) => p.x));
  return positions.map((p) => ({ x: maxX, y: p.y }));
}

export function alignNodesCenterH(positions: Point[]): Point[] {
  if (positions.length <= 1) return positions.map((p) => ({ ...p }));
  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const center = (minX + maxX) / 2;
  return positions.map((p) => ({ x: center, y: p.y }));
}

export function alignNodesTop(positions: Point[]): Point[] {
  if (positions.length <= 1) return positions.map((p) => ({ ...p }));
  const minY = Math.min(...positions.map((p) => p.y));
  return positions.map((p) => ({ x: p.x, y: minY }));
}

export function alignNodesBottom(positions: Point[]): Point[] {
  if (positions.length <= 1) return positions.map((p) => ({ ...p }));
  const maxY = Math.max(...positions.map((p) => p.y));
  return positions.map((p) => ({ x: p.x, y: maxY }));
}

export function alignNodesMiddle(positions: Point[]): Point[] {
  if (positions.length <= 1) return positions.map((p) => ({ ...p }));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));
  const center = (minY + maxY) / 2;
  return positions.map((p) => ({ x: p.x, y: center }));
}

export function distributeNodesHorizontally(positions: Point[]): Point[] {
  if (positions.length <= 2) return positions.map((p) => ({ ...p }));

  // Sort by x to determine distribution order
  const indexed = positions.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p.x - b.p.x);

  const minX = indexed[0].p.x;
  const maxX = indexed[indexed.length - 1].p.x;
  const step = (maxX - minX) / (indexed.length - 1);

  const result = positions.map((p) => ({ ...p }));
  for (let i = 0; i < indexed.length; i++) {
    result[indexed[i].i] = { x: minX + step * i, y: indexed[i].p.y };
  }
  return result;
}

export function distributeNodesVertically(positions: Point[]): Point[] {
  if (positions.length <= 2) return positions.map((p) => ({ ...p }));

  const indexed = positions.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p.y - b.p.y);

  const minY = indexed[0].p.y;
  const maxY = indexed[indexed.length - 1].p.y;
  const step = (maxY - minY) / (indexed.length - 1);

  const result = positions.map((p) => ({ ...p }));
  for (let i = 0; i < indexed.length; i++) {
    result[indexed[i].i] = { x: indexed[i].p.x, y: minY + step * i };
  }
  return result;
}


// ============================================================
// Internal helpers
// ============================================================

/**
 * Solve at² + bt + c = 0. Returns real roots in [0, 1].
 */
function quadraticRoots(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-12) {
    // Linear: bt + c = 0
    if (Math.abs(b) < 1e-12) return [];
    const t = -c / b;
    return t >= 0 && t <= 1 ? [t] : [];
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  const sqrtD = Math.sqrt(discriminant);
  const roots: number[] = [];
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  if (t1 >= 0 && t1 <= 1) roots.push(t1);
  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-12) roots.push(t2);

  return roots;
}
