"use client";

import { useState, useEffect } from "react";

import { convertNotes } from "@/lib/api";
import type { ConvertResponse } from "@/types/notes";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: ConvertResponse }
  | { status: "error"; message: string };

export default function AppPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotate, setRotate] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });

  // Generate object URL preview whenever file changes
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setState({ status: "loading" });
    try {
      const result = await convertNotes([file], "white", rotate);
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
          {/* File picker */}
          <input
            type="file"
            accept="image/*"
            aria-label="Choose a photo of handwritten notes"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setRotate(false);
              setState({ status: "idle" });
            }}
            className="block w-full text-sm text-gray-700 border border-gray-200 rounded-xl cursor-pointer bg-white file:mr-4 file:py-2.5 file:px-4 file:border-0 file:rounded-l-xl file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
          />

          {/* Image preview + rotate toggle */}
          {preview && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
              <div className="overflow-hidden rounded-lg max-h-64 flex items-center justify-center bg-gray-50">
                <img
                  src={preview}
                  alt="Preview"
                  style={{ transform: rotate ? "rotate(-90deg)" : "none", maxHeight: "240px", maxWidth: "100%", transition: "transform 0.2s" }}
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rotate}
                  onChange={(e) => setRotate(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm text-gray-600">
                  Photo is sideways — rotate before reading
                </span>
              </label>
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
                  <div className="space-y-2">
                    {textBlocks.map((block, bi) => (
                      <p
                        key={bi}
                        className={
                          block.type === "equation"
                            ? "font-mono text-sm text-violet-700"
                            : "text-sm text-gray-800"
                        }
                      >
                        {block.text}
                      </p>
                    ))}
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
