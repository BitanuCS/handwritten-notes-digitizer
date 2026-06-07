// Client for the FastAPI backend.

import type { ConvertResponse, PageTheme } from "@/types/notes";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function convertNotes(
  images: File[],
  theme: PageTheme,
  rotate: number = 0,
): Promise<ConvertResponse> {
  const form = new FormData();
  images.forEach((img) => form.append("images", img));
  form.append("theme", theme);
  form.append("rotate", String(rotate));

  const res = await fetch(`${API_BASE}/api/convert`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Convert failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<ConvertResponse>;
}

/**
 * Render an already-extracted (possibly edited) ConvertResponse to PDF.
 * Returns a short-lived blob URL — revoke after use.
 */
export async function renderPdf(
  data: ConvertResponse,
  theme: PageTheme,
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/render-pdf?theme=${theme}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PDF failed (${res.status}): ${detail}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
