import Link from "next/link";

export function CTA() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-900 px-8 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-rose-500/30 blur-3xl" />

          <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to make your notes readable?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-zinc-300">
            Upload your first page and see the difference in seconds.
          </p>
          <div className="relative mt-8">
            <Link
              href="/app"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Digitize my notes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
