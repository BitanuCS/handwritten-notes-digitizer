// Client for the FastAPI backend.

import type { PageTheme } from "@/types/notes";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send note photos to the backend and get back the generated PDF.
 * Wired to a real response in Phase 2+ (the endpoint is a stub today).
 */
export async function convertNotes(
  images: File[],
  theme: PageTheme,
): Promise<Blob> {
  const form = new FormData();
  images.forEach((img) => form.append("images", img));
  form.append("theme", theme);

  const res = await fetch(`${API_BASE}/api/convert`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Convert failed: ${res.status}`);
  }
  return res.blob();
}
