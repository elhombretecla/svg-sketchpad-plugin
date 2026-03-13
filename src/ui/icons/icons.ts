/**
 * Icon path definitions extracted from ui-reference/icons/ SVGs.
 * Each icon is an array of path `d` strings.
 * All icons are 16x16 viewBox, stroke-based with currentColor.
 */

export interface IconDef {
  paths: string[];
  viewBox?: string;
  fillRule?: "evenodd" | "nonzero";
}

// Tools
export const ICON_SELECT: IconDef = {
  paths: ["m2 2 5.129 12.31 1.82-5.361 5.361-1.82Z"],
};

export const ICON_PEN: IconDef = {
  paths: [
    "M12.101 1.138c-.26-.26-.681-.256-.974-.034-1.724 1.308-4.125 1.403-5.183 1.372a.72.72 0 0 0-.707.48L1.755 13.402a.667.667 0 0 0 .843.843l10.446-3.482a.72.72 0 0 0 .48-.707c-.031-1.058.064-3.459 1.372-5.183.222-.293.226-.714-.034-.974ZM9.481 7.63a1.111 1.111 0 1 1-2.222 0 1.111 1.111 0 0 1 2.222 0ZM7.26 8.74 2 14",
  ],
};

export const ICON_NODE: IconDef = {
  paths: [
    "M14 1.333a1.334 1.334 0 1 1 0 2.665 1.334 1.334 0 0 1 0-2.665Zm-10.667 12C10 13.333 6 2.667 12.666 2.667M2 12c.713 0 1.296.561 1.332 1.265l.002.068A1.334 1.334 0 1 1 2 12Z",
  ],
};

export const ICON_RECTANGLE: IconDef = {
  paths: [
    "M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2Z",
  ],
};

export const ICON_ELLIPSE: IconDef = {
  paths: ["M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"],
};

export const ICON_CONVERT_PATH: IconDef = {
  paths: [
    "M7.528 10.357H2.815V5.643M15.542 8l-3.3-3.3a2.666 2.666 0 0 0-3.77 0l-5.657 5.657",
  ],
};

// Actions
export const ICON_UNDO: IconDef = {
  paths: [
    "m8.264 10.389 4.696.41.411-4.695M.486 7.343l3.575-3a2.667 2.667 0 0 1 3.757.328L12.96 10.8",
  ],
};

export const ICON_SNAP: IconDef = {
  paths: [
    "M2 11.177h3v2.656H2V8.144c0-3.301 2.686-5.977 6-5.977s6 2.676 6 5.977v5.689h-3v-2.656h3m-9 0V8.144a2.994 2.994 0 0 1 3-2.988c1.657 0 3 1.337 3 2.988v3.033",
  ],
};

export const ICON_ALIGN_NODES: IconDef = {
  paths: [
    "M4 13.333a2 2 0 1 0 0-4 2 2 0 0 0 0 4m8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4m-2-2H6M7.833.667v6.666m2.5-2.5-2.5 2.5-2.5-2.5",
  ],
};

export const ICON_DISTRIBUTE_NODES: IconDef = {
  paths: [
    "M8 2.502C8 5.54 6.538 8 3.5 8 6.538 8 8 10.461 8 13.498 8 10.46 9.462 8 12.5 8 9.462 8 8 5.539 8 2.502Z",
  ],
};

export const ICON_ZOOM_IN: IconDef = {
  paths: ["M8 3.333v9.334M3.333 8h9.334"],
};

export const ICON_ZOOM_OUT: IconDef = {
  paths: ["M4 7.997h8"],
};

export const ICON_FIT: IconDef = {
  paths: [
    "M13.5 5.5h-3m0 0v-3m0 3 4-4m-1 9h-3m0 0v3m0-3 4 4m-12-9h3m0 0v-3m0 3-4-4m1 9h3m0 0v3m0-3-4 4",
  ],
};

export const ICON_INSERT: IconDef = {
  paths: [
    "M14 10v2.667c0 .736-.597 1.333-1.333 1.333H3.333A1.334 1.334 0 0 1 2 12.667V10",
    "M4.667 5.33 8 1.997l3.333 3.333M8 1.997v8",
  ],
};

export const ICON_EXIT: IconDef = {
  paths: [
    "M6 14H3.333A1.333 1.333 0 0 1 2 12.667V3.333A1.333 1.333 0 0 1 3.333 2H6m4.667 9.333L14 8m0 0-3.333-3.333M14 8H6",
  ],
};

export const ICON_DELETE: IconDef = {
  paths: [
    "M2 4h12m-1.333 0v9.333c0 .737-.597 1.334-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4m2 0V2.667c0-.737.597-1.334 1.334-1.334h2.666c.737 0 1.334.597 1.334 1.334V4m-4 3.333v4m2.666-4v4",
  ],
};

export const ICON_ADD: IconDef = {
  paths: ["M8 3.333v9.334M3.333 8h9.334"],
};

export const ICON_STROKE_WIDTH: IconDef = {
  paths: [
    "M11.25 7.25h-6.5a.25.25 0 1 0 0 .5h6.5a.25.25 0 1 0 0-.5m-6.75-4h7m-.5 8.5H5a.5.5 0 1 0 0 1h6a.5.5 0 1 0 0-1",
  ],
};

export const ICON_ARROW_DOWN: IconDef = {
  paths: ["m5 6.5 3 3 3-3"],
};

// Align icons
export const ICON_ALIGN_LEFT: IconDef = {
  paths: [
    "M1.333 1.333v13.334m3.334-7.334c0-1.103.896-2 2-2h6.666c1.104 0 2 .897 2 2v1.334a2 2 0 0 1-2 2H6.667a2 2 0 0 1-2-2Z",
  ],
};

export const ICON_ALIGN_CENTER_H: IconDef = {
  paths: [
    "M8 .667v4.666m0 5.334v4.666m-5.333-8c0-1.103.896-2 2-2h6.666c1.104 0 2 .897 2 2v1.334a2 2 0 0 1-2 2H4.667a2 2 0 0 1-2-2Z",
  ],
};

export const ICON_ALIGN_RIGHT: IconDef = {
  paths: [
    "M14.667 1.333H1.333m7.334 3.334a2 2 0 0 1 2 2v6.666a2 2 0 0 1-2 2H7.333c-1.103 0-2-.896-2-2V6.667c0-1.104.897-2 2-2Z",
  ],
};

export const ICON_ALIGN_TOP: IconDef = {
  paths: [
    "M14.667 14.667H1.333m7.334-14a2 2 0 0 1 2 2v6.666a2 2 0 0 1-2 2H7.333c-1.103 0-2-.896-2-2V2.667c0-1.104.897-2 2-2Z",
  ],
};

export const ICON_ALIGN_CENTER_V: IconDef = {
  paths: [
    "M1.333 2.667h13.334M1.333 13.333h13.334M3.333 7.667a2 2 0 0 1 2-2h5.334c1.103 0 2 .896 2 2v.666c0 1.104-.897 2-2 2H5.333a2 2 0 0 1-2-2Z",
  ],
};

export const ICON_ALIGN_BOTTOM: IconDef = {
  paths: [
    "M5.333 8H.667m14.666 0h-4.666m-2-5.333a2 2 0 0 1 2 2v6.666a2 2 0 0 1-2 2H7.333c-1.103 0-2-.896-2-2V4.667c0-1.104.897-2 2-2Z",
  ],
};

export const ICON_DISTRIBUTE_H: IconDef = {
  paths: [
    "M2.667 1.333v13.334M13.333 1.333v13.334m-5-11.334q0 0 0 0c1.104 0 2 .897 2 2v5.334a2 2 0 0 1-2 2h-.666q0 0 0 0a2 2 0 0 1-2-2V5.333c0-1.103.896-2 2-2h.666",
  ],
};

export const ICON_DISTRIBUTE_V: IconDef = {
  paths: [
    "M14.667 1.333v13.334m-14-7.334c0-1.103.896-2 2-2h6.666c1.104 0 2 .897 2 2v1.334a2 2 0 0 1-2 2H2.667a2 2 0 0 1-2-2Z",
  ],
};

// Node editing
export const ICON_TO_CORNER: IconDef = {
  paths: [
    "M2.667 13.334a2 2 0 1 0 0-4 2 2 0 0 0 0 4m10.666 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4m-1.667-.666-3 4m6.334-4 3 4",
  ],
};

export const ICON_TO_CURVE: IconDef = {
  paths: [
    "M2.667 13.334a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 4.388a5.335 5.335 0 0 0-3.333 4.945M10 4.388a5.34 5.34 0 0 1 3.333 4.945m0 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4M6 4H1.333m13.334 0H10",
  ],
};

export const ICON_FLIP_H: IconDef = {
  paths: [
    "M9.5 13H15l-3.63-7.259L9.5 2v11m-3 0H1L6.5 2v11",
  ],
};

export const ICON_MOUSE_SELECT: IconDef = {
  paths: [
    "M12 5.333V2.52c0-.655-.53-1.186-1.185-1.186H2.519c-.655 0-1.186.53-1.186 1.186v8.296c0 .654.53 1.185 1.186 1.185h2.814m1.334-5.333 8.666 4L12 12l-1.333 3.333-4-8.666",
  ],
};

export const ICON_CURSOR_CLICK: IconDef = {
  paths: [
    "m6.667 6.667 4 8.667L12 12l3.333-1.333-8.666-4m0-6v2m-4 4h-2m10.332-4.334L9.667 3.667m-6 6L2.333 11m1.334-7.333L2.333 2.334",
  ],
};
