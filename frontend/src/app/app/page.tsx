"use client";

import { useState, useEffect } from "react";
import katex from "katex";

import { convertNotes } from "@/lib/api";
import type { ConvertResponse } from "@/types/notes";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: ConvertResponse }
  | { status: "error"; message: string };

const ROTATIONS = [0, 90, 180, 270] as const;
type Rotation = (typeof ROTATIONS)[number];

const ROTATE_LABELS: Record<Rotation, string> = {
  0: "No rotation",
  90: "90° CCW",
  180: "180°",
  270: "90° CW",
};

/**
 * Renders a string that may contain LaTeX fragments (e.g. \frac{1}{50000})
 * mixed with plain text. LaTeX fragments are replaced with KaTeX HTML;
 * the rest is escaped and returned as an HTML string for dangerouslySetInnerHTML.
 *
 * Matches sequences like \cmd{...}{...} including nested braces one level deep.
 */
function renderWithLatex(text: string): string {
  const LATEX_RE = /\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*/g;
  return text.replace(LATEX_RE, (fragment) => {
    try {
      return katex.renderToString(fragment, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return fragment;
    }
  });
}

/** Full-block equation render (display mode, centred). */
function renderEquationBlock(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
  } catch {
    return latex;
  }
}

export default function AppPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [state, setState] = useState<State>({ status: "idle" });

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
    setState({ status: "loading" });
    try {
      const result = await convertNotes([file], "white", rotation);
      setState({ status: "done", result });
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Digitize your notes
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Upload a photo of handwritten notes and get a clean transcription.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept="image/*"
            aria-label="Choose a photo of handwritten notes"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setRotation(0);
              setState({ status: "idle" });
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
                  <span className="font-medium text-gray-700">
                    {ROTATE_LABELS[rotation]}
                  </span>
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
            disabled={!file || state.status === "loading"}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            {state.status === "loading" ? "Reading your notes…" : "Transcribe notes"}
          </button>
        </form>

        {state.status === "loading" && (
          <div className="mt-10 text-center text-sm text-gray-400">
            AI is reading your handwriting…
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {state.message}
          </div>
        )}

        {state.status === "done" &&
          state.result.pages.map((page, pi) => {
            const textBlocks = page.blocks.filter((b) => b.text);
            return (
              <div
                key={pi}
                className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                {page.date && (
                  <p className="text-xs text-gray-400 text-right mb-4">
                    {page.date}
                  </p>
                )}

                {textBlocks.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    No text blocks were extracted.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {textBlocks.map((block, bi) =>
                      block.type === "equation" ? (
                        // Full equation block — display mode, centred
                        <div
                          key={bi}
                          className="py-2 overflow-x-auto"
                          dangerouslySetInnerHTML={{
                            __html: renderEquationBlock(block.text!),
                          }}
                        />
                      ) : (
                        // Text block — render inline LaTeX fragments if present
                        <p
                          key={bi}
                          className="text-sm text-gray-800 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: renderWithLatex(block.text!),
                          }}
                        />
                      )
                    )}
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-300">
                  {page.blocks.length} block
                  {page.blocks.length !== 1 ? "s" : ""} extracted
                  {page.page_number_detected ? " · page number removed" : ""}
                </p>
              </div>
            );
          })}
      </div>
    </main>
  );
}
