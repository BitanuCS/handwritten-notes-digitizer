"use client";

// Phase 2: upload photo -> Claude vision -> show extracted text on screen.
// Phase 3 will replace the text preview with an A4 PDF output.

import { useState } from "react";

import { convertNotes } from "@/lib/api";
import type { ConvertResponse } from "@/types/notes";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: ConvertResponse }
  | { status: "error"; message: string };

export default function AppPage() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setState({ status: "loading" });
    try {
      const result = await convertNotes([file], "white");
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
          Upload a photo of handwritten notes — Claude will read and transcribe
          them.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept="image/*"
            aria-label="Choose a photo of handwritten notes"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setState({ status: "idle" });
            }}
            className="block w-full text-sm text-gray-700 border border-gray-200 rounded-xl cursor-pointer bg-white file:mr-4 file:py-2.5 file:px-4 file:border-0 file:rounded-l-xl file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
          />

          {file && state.status === "idle" && (
            <p className="text-xs text-gray-500">
              {file.name} &mdash; {(file.size / 1024).toFixed(0)} KB
            </p>
          )}

          <button
            type="submit"
            disabled={!file || state.status === "loading"}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            {state.status === "loading"
              ? "Claude is reading…"
              : "Transcribe notes"}
          </button>
        </form>

        {state.status === "loading" && (
          <div className="mt-10 flex flex-col items-center gap-3 text-sm text-gray-400">
            <span className="animate-spin text-2xl">⟳</span>
            <span>Claude is reading your handwriting…</span>
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
