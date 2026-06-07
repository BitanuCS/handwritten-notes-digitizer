const steps = [
  {
    n: "1",
    title: "Upload your photos",
    body: "Snap or upload one or more pictures of your handwritten notes. Multiple pages are welcome.",
  },
  {
    n: "2",
    title: "AI reads & rebuilds",
    body: "Our AI transcribes your handwriting, keeps everything in its original place, and color-codes related points.",
  },
  {
    n: "3",
    title: "Download a clean PDF",
    body: "Get a polished A4 PDF — white or black page, dates kept, clutter removed. Ready to study or share.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Three steps to readable notes
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            No editing, no retyping. From photo to PDF in under a minute.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="relative rounded-2xl border border-zinc-200 bg-zinc-50/50 p-8"
            >
              <div className="grid h-11 w-11 place-items-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                {step.n}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-zinc-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
