"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import katex from "katex";

import { htmlToPdf } from "@/lib/api";
import type { ConvertResponse, PageTheme } from "@/types/notes";

type PdfState = "idle" | "loading" | "error";

// ─── Text helpers ─────────────────────────────────────────────────────────────

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

/** Render multi-line text to HTML — each line rendered with KaTeX, joined with <br>. */
function renderPreviewHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br/>" : renderWithLatex(line)))
    .join("<br/>");
}

function blocksToText(result: ConvertResponse): string {
  return result.pages
    .flatMap((p) => p.blocks.filter((b) => b.text).map((b) => b.text!))
    .join("\n\n");
}


// ─── Result page ──────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [editedText, setEditedText] = useState("");
  const [pdfState, setPdfState] = useState<PdfState>("idle");
  const [theme] = useState<PageTheme>("white");

  // Resizable split: percentage of total width given to the left (edit) panel.
  const [splitPct, setSplitPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Load result from sessionStorage on mount.
  useEffect(() => {
    const raw = sessionStorage.getItem("inkwell_result");
    if (!raw) { router.replace("/app"); return; }
    try {
      const parsed: ConvertResponse = JSON.parse(raw);
      setResult(parsed);
      setEditedText(blocksToText(parsed));
    } catch {
      router.replace("/app");
    }
  }, [router]);

  // Global mouse move/up for the drag handle.
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.max(20, Math.min(80, pct)));
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  function startDrag() {
    dragging.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  async function handleDownloadPdf() {
    if (!previewRef.current) return;
    setPdfState("loading");
    try {
      // Send the preview's already-rendered HTML — PDF is pixel-identical to preview.
      const blobUrl = await htmlToPdf(previewRef.current.innerHTML, theme);
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

  if (!result) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => router.push("/app")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          New photo
        </button>

        <span className="text-sm font-medium text-gray-700">Review &amp; Download</span>

        <button
          onClick={handleDownloadPdf}
          disabled={pdfState === "loading"}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
        >
          {pdfState === "loading" ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-white" />
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
      </header>

      {pdfState === "error" && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-600 text-center">
          PDF generation failed — please try again.
        </div>
      )}

      {/* ── Resizable split panels ── */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">

        {/* LEFT — edit */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${splitPct}%` }}
        >
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Edit</span>
            {result.pages[0]?.date && (
              <span className="ml-3 text-xs text-gray-400 italic">{result.pages[0].date}</span>
            )}
          </div>
          <textarea
            className="flex-1 resize-none px-5 py-5 text-sm text-gray-800 leading-relaxed font-mono focus:outline-none bg-white"
            value={editedText}
            spellCheck
            onChange={(e) => setEditedText(e.target.value)}
          />
        </div>

        {/* ── Drag handle ── */}
        <div
          onMouseDown={startDrag}
          className="w-[5px] shrink-0 cursor-col-resize bg-gray-200 hover:bg-indigo-400 active:bg-indigo-500 transition-colors flex items-center justify-center group"
          title="Drag to resize"
        >
          {/* Grip dots */}
          <div className="flex flex-col gap-[3px] opacity-40 group-hover:opacity-80 transition-opacity">
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="w-[3px] h-[3px] rounded-full bg-gray-600" />
            ))}
          </div>
        </div>

        {/* RIGHT — preview */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</span>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div
              ref={previewRef}
              className="text-sm text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderPreviewHtml(editedText) }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
