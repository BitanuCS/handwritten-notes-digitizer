"use client";

import { useState, useEffect } from "react";
import katex from "katex";

import { convertNotes, renderPdf } from "@/lib/api";
import type { ConvertResponse, PageTheme } from "@/types/notes";

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

function renderWithLatex(text: string): string {
  if (text.includes("$")) {
    return text
      .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)
      .map((part) => {
        if (
          (part.startsWith("$$") && part.endsWith("$$")) ||
          (part.startsWith("$") && part.endsWith("$"))
        ) {
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

/** Join all extractable block texts from the result into one editable string. */
function blocksToText(result: ConvertResponse): string {
  return result.pages
    .flatMap((p) => p.blocks.filter((b) => b.text).map((b) => b.text!))
    .join("\n\n");
}

/** Wrap edited text back into a minimal ConvertResponse for the PDF endpoint. */
function textToResult(text: string, original: ConvertResponse): ConvertResponse {
  const date = original.pages[0]?.date ?? null;
  return {
    pages: [
      {
        blocks: [
          { type: "text", box: { x: 0, y: 0, w: 1, h: 1 }, text, color_group: null },
        ],
        date,
        page_number_detected: false,
      },
    ],
  };
}

// ─── Upload / controls form ──────────────────────────────────────────────────

function UploadForm({
  file, preview, rotation, isLoading, onFileChange, onRotate, onSubmit,
}: {
  file: File | null;
  preview: string | null;
  rotation: Rotation;
  isLoading: boolean;
  onFileChange: (f: File | null) => void;
  onRotate: () => void;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="file"
        accept="image/*"
        aria-label="Choose a photo of handwritten notes"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-gray-700 border border-gray-200 rounded-xl cursor-pointer bg-white file:mr-4 file:py-2.5 file:px-4 file:border-0 file:rounded-l-xl file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
      />

      {preview && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <div className="overflow-hidden rounded-lg h-48 flex items-center justify-center bg-gray-50">
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
              onClick={onRotate}
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
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AppPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [theme] = useState<PageTheme>("white");
  const [state, setState] = useState<State>({ status: "idle" });
  const [pdfState, setPdfState] = useState<PdfState>("idle");
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (state.status === "done") setEditedText(blocksToText(state.result));
  }, [state]);

  function handleFileChange(f: File | null) {
    setFile(f);
    setRotation(0);
    setState({ status: "idle" });
    setPdfState("idle");
  }

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
      const result = await convertNotes([file], theme, rotation);
      setState({ status: "done", result });
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  }

  async function handleDownloadPdf() {
    if (state.status !== "done") return;
    setPdfState("loading");
    try {
      const payload = textToResult(editedText, state.result);
      const blobUrl = await renderPdf(payload, theme);
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

  // ── Two-column layout once results arrive ──────────────────────────────────
  if (state.status === "done") {
    return (
      <div className="grid grid-cols-2 h-screen overflow-hidden bg-gray-50">

        {/* LEFT — rendered preview (updates live as user edits) */}
        <div className="overflow-y-auto border-r border-gray-200 px-10 py-10">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Preview</h2>
          <p className="text-xs text-gray-400 mb-6">Updates as you edit on the right.</p>

          {state.result.pages[0]?.date && (
            <p className="text-xs text-gray-400 text-right mb-4 italic">
              {state.result.pages[0].date}
            </p>
          )}

          <div
            className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: renderWithLatex(editedText) }}
          />

          <div className="mt-10 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-4">Convert a new photo:</p>
            <UploadForm
              file={file}
              preview={preview}
              rotation={rotation}
              isLoading={false}
              onFileChange={handleFileChange}
              onRotate={cycleRotation}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        {/* RIGHT — single editor panel */}
        <div className="flex flex-col bg-white">

          {/* Panel header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Edit</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fix any misreads, then download.</p>
          </div>

          {/* Single textarea — takes all remaining height */}
          <textarea
            className="flex-1 resize-none px-6 py-5 text-sm text-gray-800 leading-relaxed focus:outline-none font-mono"
            value={editedText}
            spellCheck
            onChange={(e) => setEditedText(e.target.value)}
          />

          {/* Panel footer — always visible */}
          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfState === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              {pdfState === "loading" ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-white" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
            {pdfState === "error" && (
              <p className="text-center text-xs text-red-500">PDF generation failed — try again.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Single-column before results ───────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Digitize your notes</h1>
        <p className="text-sm text-gray-500 mb-8">
          Upload a photo of handwritten notes and get a clean, editable A4 PDF.
        </p>

        <UploadForm
          file={file}
          preview={preview}
          rotation={rotation}
          isLoading={state.status === "loading"}
          onFileChange={handleFileChange}
          onRotate={cycleRotation}
          onSubmit={handleSubmit}
        />

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
      </div>
    </main>
  );
}
