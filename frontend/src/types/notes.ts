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

export interface Block {
  type: BlockType;
  box: Box;
  text?: string | null;
  color_group?: number | null;
}

export interface Page {
  blocks: Block[];
  date?: string | null;
  page_number_detected: boolean;
}

export interface ConvertResponse {
  pages: Page[];
}
