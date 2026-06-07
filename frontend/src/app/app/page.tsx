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

// edit text keyed by "pageIndex-blockIndex"
type EditMap = Map<string, string>;

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

// ─── Upload / controls panel ─────────────────────────────────────────────────

function UploadForm({
  file,
  preview,
  rotation,
  isLoading,
  onFileChange,
  onRotate,
  onSubmit,
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
  const [edits, setEdits] = useState<EditMap>(new Map());

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (state.status !== "done") return;
    const map = new Map<string, string>();
    state.result.pages.forEach((page, pi) => {
      page.blocks.forEach((block, bi) => {
        if (block.text != null) map.set(`${pi}-${bi}`, block.text);
      });
    });
    setEdits(map);
  }, [state]);

  function cycleRotation() {
    setRotation((r) => {
      const idx = ROTATIONS.indexOf(r);
      return ROTATIONS[(idx + 1) % ROTATIONS.length];
    });
  }

  function handleFileChange(f: File | null) {
    setFile(f);
    setRotation(0);
    setState({ status: "idle" });
    setPdfState("idle");
  }

  function getEditedResult(): ConvertResponse {
    if (state.status !== "done") throw new Error("no result");
    return {
      pages: state.result.pages.map((page, pi) => ({
        ...page,
        blocks: page.blocks.map((block, bi) => ({
          ...block,
          text: edits.get(`${pi}-${bi}`) ?? block.text,
        })),
      })),
    };
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
      const blobUrl = await renderPdf(getEditedResult(), theme);
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

  const isDone = state.status === "done";

  // ── Two-column layout once results arrive ──────────────────────────────────
  if (isDone) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">

        {/* LEFT — upload controls + read-only rendered preview */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-10 px-8 max-w-xl">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Digitize your notes</h1>
            <p className="text-sm text-gray-400 mb-6">Upload a new photo or review the result on the right.</p>

            <UploadForm
              file={file}
              preview={preview}
              rotation={rotation}
              isLoading={false}
              onFileChange={handleFileChange}
              onRotate={cycleRotation}
              onSubmit={handleSubmit}
            />

            {/* Read-only rendered preview — updates live as user edits on the right */}
            {state.result.pages.map((page, pi) => (
              <div key={pi} className="mt-8">
                {page.date && (
                  <p className="text-xs text-gray-400 text-right mb-3 italic">{page.date}</p>
                )}
                <div className="space-y-3">
                  {page.blocks.map((block, bi) => {
                    if (block.type === "diagram") {
                      return (
                        <div key={bi} className="text-xs text-gray-300 italic py-1">
                          [diagram]
                        </div>
                      );
                    }
                    const currentText = edits.get(`${pi}-${bi}`) ?? block.text ?? "";
                    return block.type === "equation" ? (
                      <div
                        key={bi}
                        className="overflow-x-auto py-1"
                        dangerouslySetInnerHTML={{ __html: renderEquationBlock(currentText) }}
                      />
                    ) : (
                      <p
                        key={bi}
                        className="text-sm text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderWithLatex(currentText) }}
                      />
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-gray-300">
                  {page.blocks.length} block{page.blocks.length !== 1 ? "s" : ""}
                  {page.page_number_detected ? " · page number removed" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — fixed editor panel */}
        <aside className="w-[420px] shrink-0 border-l border-gray-200 bg-white flex flex-col">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Edit transcription</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Fix any misreads below, then download.
            </p>
          </div>

          {/* Scrollable block list */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {state.result.pages.map((page, pi) => (
              <div key={pi}>
                {state.result.pages.length > 1 && (
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                    Page {pi + 1}
                  </p>
                )}
                <div className="space-y-4">
                  {page.blocks.map((block, bi) => {
                    if (block.type === "diagram") {
                      return (
                        <div
                          key={bi}
                          className="rounded-lg border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-400 italic"
                        >
                          Diagram — not editable
                        </div>
                      );
                    }

                    const key = `${pi}-${bi}`;
                    const currentText = edits.get(key) ?? block.text ?? "";
                    const isEquation = block.type === "equation";

                    return (
                      <div key={bi} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            isEquation
                              ? "bg-violet-50 text-violet-600"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {isEquation ? "equation" : "text"}
                          </span>
                        </div>

                        <textarea
                          value={currentText}
                          rows={Math.max(2, currentText.split("\n").length)}
                          spellCheck={!isEquation}
                          className={`w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors ${
                            isEquation ? "font-mono text-violet-800" : "text-gray-800"
                          }`}
                          onChange={(e) =>
                            setEdits((prev) => new Map(prev).set(key, e.target.value))
                          }
                        />

                        {/* Equation-only: live KaTeX preview below the textarea */}
                        {isEquation && (
                          <div
                            className="overflow-x-auto rounded-lg bg-gray-50 px-3 py-2 text-sm"
                            dangerouslySetInnerHTML={{ __html: renderEquationBlock(currentText) }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Panel footer — download button always visible */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-2">
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
        </aside>
      </div>
    );
  }

  // ── Single-column layout before results ────────────────────────────────────
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
