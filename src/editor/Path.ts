import type { PathNode } from "./Node";
import type { BoundingBox } from "./Geometry";
import { boundingBoxFromPoints } from "./Geometry";

export interface PathStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export const DEFAULT_PATH_STYLE: PathStyle = {
  fill: "none",
  stroke: "#000000",
  strokeWidth: 2,
  opacity: 1,
};

export interface EditorPath {
  id: string;
  nodes: PathNode[];
  closed: boolean;
  style: PathStyle;
}

let nextId = 1;

export function createPath(style?: Partial<PathStyle>): EditorPath {
  return {
    id: `path-${nextId++}`,
    nodes: [],
    closed: false,
    style: { ...DEFAULT_PATH_STYLE, ...style },
  };
}

export function pathBoundingBox(path: EditorPath): BoundingBox | null {
  return boundingBoxFromPoints(path.nodes.map((n) => n.position));
}

export function pathToSvgD(path: EditorPath): string {
  const { nodes, closed } = path;
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
