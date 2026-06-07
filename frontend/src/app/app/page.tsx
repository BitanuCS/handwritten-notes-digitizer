"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { convertNotes } from "@/lib/api";
import type { PageTheme } from "@/types/notes";

type State = "idle" | "loading" | { error: string };

const ROTATIONS = [0, 90, 180, 270] as const;
type Rotation = (typeof ROTATIONS)[number];

const ROTATE_LABELS: Record<Rotation, string> = {
  0: "No rotation",
  90: "90° CCW",
  180: "180°",
  270: "90° CW",
};

export default function AppPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [theme] = useState<PageTheme>("white");
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function cycleRotation() {
    setRotation((r) => {
      const idx = ROTATIONS.indexOf(r);
      return ROTATIONS[(idx + 1) % ROTATIONS.length];
    });
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setState("loading");
    try {
      const result = await convertNotes([file], theme, rotation);
      sessionStorage.setItem("inkwell_result", JSON.stringify(result));
      router.push("/app/result");
    } catch (err) {
      setState({ error: String(err) });
    }
  }

  const isLoading = state === "loading";

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Digitize your notes</h1>
        <p className="text-sm text-gray-500 mb-8">
          Upload a photo of handwritten notes and get a clean, editable A4 PDF.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept="image/*"
            aria-label="Choose a photo of handwritten notes"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setRotation(0);
              setState("idle");
            }}
            className="block w-full text-sm text-gray-700 border border-gray-200 rounded-xl cursor-pointer bg-white file:mr-4 file:py-2.5 file:px-4 file:border-0 file:rounded-l-xl file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
          />

          {preview && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
              <div className="overflow-hidden rounded-lg h-56 flex items-center justify-center bg-gray-50">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain transition-transform duration-200"
                  style={{ transform: `rotate(${-rotation}deg)` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Rotation:{" "}
                  <span className="font-medium text-gray-700">{ROTATE_LABELS[rotation]}</span>
                </span>
                <button
                  type="button"
                  onClick={cycleRotation}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  ↻ Rotate
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || isLoading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            {isLoading ? "Reading your notes…" : "Transcribe notes"}
          </button>
        </form>

        {isLoading && (
          <div className="mt-10 text-center text-sm text-gray-400">
            AI is reading your handwriting…
          </div>
        )}

        {typeof state === "object" && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {state.error}
          </div>
        )}
      </div>
    </main>
  );
}
