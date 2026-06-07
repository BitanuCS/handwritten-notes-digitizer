import Link from "next/link";
import { site } from "@/lib/site";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            I
          </span>
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            {site.name}
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-zinc-600 sm:flex">
          <a href="#how" className="transition-colors hover:text-zinc-900">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-zinc-900">
            Features
          </a>
        </div>

        <Link
          href="/app"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Try it free
        </Link>
      </nav>
    </header>
  );
}
