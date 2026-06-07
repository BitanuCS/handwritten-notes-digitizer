"use client";

import { useState, useEffect } from "react";
import katex from "katex";

import { convertNotes, fetchPdf } from "@/lib/api";
import type { ConvertResponse } from "@/types/notes";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: ConvertResponse }
  | { status: "error"; message: string };

type PdfState = "idle" | "loading" | "error";

const ROTATIONS = [0, 90, 180, 270] as const;
type Rotation = (typeof ROTATIONS)[number];

const ROTATE_LABELS: Record<Rotation, string> = {
  0: "No rotation",
  90: "90° CCW",
  180: "180°",
  270: "90° CW",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripDollars(s: string): string {
  const t = s.trim();
  if (t.startsWith("$$") && t.endsWith("$$")) return t.slice(2, -2).trim();
  if (t.startsWith("$") && t.endsWith("$")) return t.slice(1, -1).trim();
  return t;
}

/**
 * Renders a text block that may contain $...$ inline math or raw \cmd{} fragments.
 * Prose stays as HTML text; only the math parts go through KaTeX.
 */
function renderWithLatex(text: string): string {
  if (text.includes("$")) {
    return text
      .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)
      .map((part) => {
        if ((part.startsWith("$$") && part.endsWith("$$")) ||
            (part.startsWith("$") && part.endsWith("$"))) {
          return katex.renderToString(stripDollars(part), {
            throwOnError: false,
            displayMode: false,
          });
        }
        return escapeHtml(part);
      })
      .join("");
  }

  if (/\\[a-zA-Z]+\{/.test(text)) {
    return text.replace(
      /\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*/g,
      (fragment) => {
        try {
          return katex.renderToString(fragment, { throwOnError: false, displayMode: false });
        } catch {
          return escapeHtml(fragment);
        }
      }
    );
  }

  return escapeHtml(text);
}

/** Full-block equation render (display mode, centred). Strips $/$$ delimiters. */
function renderEquationBlock(latex: string): string {
  try {
    return katex.renderToString(stripDollars(latex), {
      throwOnError: false,
      displayMode: true,
    });
  } catch {
    return escapeHtml(latex);
  }
}

export default function AppPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [state, setState] = useState<State>({ status: "idle" });
  const [pdfState, setPdfState] = useState<PdfState>("idle");

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
    setPdfState("idle");
    try {
      const result = await convertNotes([file], "white", rotation);
      setState({ status: "done", result });
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  }

  async function handleDownloadPdf() {
    if (!file) return;
    setPdfState("loading");
    try {
      const blobUrl = await fetchPdf([file], "white", rotation);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "notes.pdf";
      a.click();
      URL.revokeObjectURL(blobUrl);
      setPdfState("idle");
    } catch {
      setPdfState("error");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Digitize your notes
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Upload a photo of handwritten notes and get a clean transcription or A4 PDF.
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
              setPdfState("idle");
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

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!file || state.status === "loading"}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              {state.status === "loading" ? "Reading your notes…" : "Transcribe notes"}
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!file || pdfState === "loading"}
              className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 disabled:opacity-50 hover:bg-indigo-50 hover:border-indigo-400 active:bg-indigo-100 transition-colors"
            >
              {pdfState === "loading" ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
                  Generating…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
        </form>

        {pdfState === "error" && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            PDF generation failed. Please try again.
          </div>
        )}

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
                        <div
                          key={bi}
                          className="py-2 overflow-x-auto"
                          dangerouslySetInnerHTML={{
                            __html: renderEquationBlock(block.text!),
                          }}
                        />
                      ) : (
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
