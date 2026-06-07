import Link from "next/link";
import { site } from "@/lib/site";
import { NotesPreview } from "./NotesPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-indigo-50/60 to-white">
      {/* soft decorative blobs */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
            Powered by AI vision
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
            Turn messy handwriting into{" "}
            <span className="bg-linear-to-r from-indigo-600 to-rose-500 bg-clip-text text-transparent">
              clean, colorful notes
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600">
            {site.description} A faithful digital photocopy — same layout, but
            finally readable.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-7 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
            >
              Digitize my notes
            </Link>
            <a
              href="#how"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-7 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-xs text-zinc-400">
            No sign-up needed · Upload a photo, get a PDF
          </p>
        </div>

        <div className="py-8">
          <NotesPreview />
        </div>
      </div>
    </section>
  );
}
