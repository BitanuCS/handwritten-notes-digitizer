// Wire shapes shared with the backend (mirrors backend/app/schemas/notes.py).
// The backend serializes with snake_case field names, so these match the JSON
// exactly. Coordinates in Box are normalized to 0..1 relative to the page.

export type BlockType = "text" | "equation" | "diagram";
export type PageTheme = "white" | "black";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiagramShape {
  id: string;
  kind: string;  // "box" | "rounded_box" | "diamond" | "circle" | "ellipse"
  box: Box;      // 0..1 relative to the diagram block's own bounding box
  text: string;
  color_group?: number | null;
}

export interface DiagramArrow {
  from_id: string;
  to_id: string;
  label: string;
}

export interface DiagramData {
  shapes: DiagramShape[];
  arrows: DiagramArrow[];
}

export interface Block {
  type: BlockType;
  box: Box;
  text?: string | null;
  color_group?: number | null;
  diagram_data?: DiagramData | null;   // for diagram blocks (from AI)
  diagram_image?: string | null;       // base64 JPEG crop of the diagram region
  svg?: string | null;                 // computed by backend, not from AI
}

export interface Page {
  blocks: Block[];
  date?: string | null;
  page_number_detected: boolean;
}

export interface ConvertResponse {
  pages: Page[];
}
