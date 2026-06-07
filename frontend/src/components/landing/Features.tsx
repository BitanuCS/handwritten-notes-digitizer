const features = [
  {
    color: "#4f46e5",
    title: "Color-coded points",
    body: "Each idea gets its own color; related points share one — so your notes are easy and inviting to read.",
  },
  {
    color: "#059669",
    title: "Your layout, preserved",
    body: "Everything stays exactly where you wrote it. It's a digital photocopy, not a reflow.",
  },
  {
    color: "#e11d48",
    title: "Diagrams included",
    body: "Sketched a diagram? It's detected and carried over to your digital page, in place.",
  },
  {
    color: "#d97706",
    title: "White or black page",
    body: "Pick a light or dark page at upload, and the colors adapt for perfect readability.",
  },
  {
    color: "#0891b2",
    title: "Dates kept, clutter gone",
    body: "Dates move to the top-right; page numbers and stray marks are cleaned away automatically.",
  },
  {
    color: "#7c3aed",
    title: "Clean A4 PDF",
    body: "Download a print-ready A4 PDF — one page per photo, ready to study, share, or file.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-zinc-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Notes the way you&apos;d type them yourself
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Everything that makes digital notes pleasant to read — done for you.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-white p-7 transition-shadow hover:shadow-md"
            >
              <div
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ backgroundColor: `${f.color}1a` }}
              >
                <span
                  className="h-3.5 w-3.5 rounded-sm"
                  style={{ backgroundColor: f.color }}
                />
              </div>
              <h3 className="mt-5 text-base font-semibold text-zinc-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
