import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            I
          </span>
          <span className="text-sm font-semibold text-zinc-900">
            {site.name}
          </span>
        </div>
        <p className="text-sm text-zinc-500">{site.tagline}</p>
        <p className="text-xs text-zinc-400">
          © {new Date().getFullYear()} {site.name}
        </p>
      </div>
    </footer>
  );
}
