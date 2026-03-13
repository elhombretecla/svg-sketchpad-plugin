import type { Shape } from "./Shape";
import { shapeToSvgD, shapeBoundingBox } from "./Shape";
import type { BoundingBox } from "./Geometry";

export interface EditorDocument {
  shapes: Shape[];
  width: number;
  height: number;
}

export function createDocument(
  width: number = 512,
  height: number = 512
): EditorDocument {
  return {
    shapes: [],
    width,
    height,
  };
}

export function addShape(doc: EditorDocument, shape: Shape): EditorDocument {
  return {
    ...doc,
    shapes: [...doc.shapes, shape],
  };
}

export function removeShape(
  doc: EditorDocument,
  shapeId: string
): EditorDocument {
  return {
    ...doc,
    shapes: doc.shapes.filter((s) => s.id !== shapeId),
  };
}

export function updateShape(
  doc: EditorDocument,
  shapeId: string,
  updater: (shape: Shape) => Shape
): EditorDocument {
  return {
    ...doc,
    shapes: doc.shapes.map((s) => (s.id === shapeId ? updater(s) : s)),
  };
}

export function getShape(
  doc: EditorDocument,
  shapeId: string
): Shape | undefined {
  return doc.shapes.find((s) => s.id === shapeId);
}

export function documentBoundingBox(doc: EditorDocument): BoundingBox | null {
  if (doc.shapes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of doc.shapes) {
    const bb = shapeBoundingBox(shape);
    if (!bb) continue;
    if (bb.x < minX) minX = bb.x;
    if (bb.y < minY) minY = bb.y;
    if (bb.x + bb.width > maxX) maxX = bb.x + bb.width;
    if (bb.y + bb.height > maxY) maxY = bb.y + bb.height;
  }

  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function documentToSvg(doc: EditorDocument): string {
  const elements = doc.shapes
    .map((shape) => {
      const { fill, stroke, strokeWidth, opacity } = shape.style;
      const styleAttrs = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"`;

      switch (shape.type) {
        case "path": {
          const d = shapeToSvgD(shape);
          if (!d) return "";
          const tx = shape.transform.x;
          const ty = shape.transform.y;
          const transform =
            tx !== 0 || ty !== 0 ? ` transform="translate(${tx},${ty})"` : "";
          return `<path d="${d}" ${styleAttrs}${transform} />`;
        }
        case "rectangle": {
          const { x, y, rotation } = shape.transform;
          const rotAttr =
            rotation !== 0
              ? ` transform="rotate(${rotation},${x + shape.width / 2},${y + shape.height / 2})"`
              : "";
          return `<rect x="${x}" y="${y}" width="${shape.width}" height="${shape.height}" ${styleAttrs}${rotAttr} />`;
        }
        case "ellipse": {
          const { x: cx, y: cy, rotation } = shape.transform;
          const rotAttr =
            rotation !== 0
              ? ` transform="rotate(${rotation},${cx},${cy})"`
              : "";
          return `<ellipse cx="${cx}" cy="${cy}" rx="${shape.rx}" ry="${shape.ry}" ${styleAttrs}${rotAttr} />`;
        }
      }
    })
    .filter(Boolean)
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">\n  ${elements}\n</svg>`;
}
