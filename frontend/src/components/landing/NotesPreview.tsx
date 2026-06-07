// Pure CSS "before / after" mock that demonstrates the product without needing
// real image assets: a messy handwritten card on the left, a clean color-coded
// digital page on the right.

const afterLines: { text: string; color: string; indent?: boolean }[] = [
  { text: "Photosynthesis", color: "#4f46e5" },
  { text: "Converts light energy into chemical energy", color: "#4f46e5", indent: true },
  { text: "Takes place in the chloroplasts", color: "#4f46e5", indent: true },
  { text: "Reactants: CO₂ + H₂O", color: "#059669" },
  { text: "Products: glucose + O₂", color: "#059669" },
  { text: "Light-dependent reactions", color: "#e11d48" },
  { text: "Occur in the thylakoid membrane", color: "#e11d48", indent: true },
  { text: "Remember: chlorophyll absorbs red & blue", color: "#d97706" },
];

export function NotesPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* BEFORE — handwritten */}
      <div className="absolute -left-6 -top-6 hidden w-56 -rotate-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-lg sm:block">
        <span className="absolute right-3 top-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          Before
        </span>
        <div className="font-handwriting text-[15px] leading-snug text-zinc-500">
          Photosynthesis<br />
          - light → chemical energy<br />
          in chloroplasts<br />
          CO2 + H2O → glucose + O2<br />
          light-dependent rxns<br />
          thylakoid membrane...
        </div>
      </div>

      {/* AFTER — clean A4 page */}
      <div className="relative ml-auto w-full max-w-sm rotate-1 rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            After
          </span>
          <span className="text-[11px] text-zinc-400">12 March 2024</span>
        </div>
        <div className="space-y-2">
          {afterLines.map((line, i) => (
            <p
              key={i}
              className={`text-sm leading-snug ${line.indent ? "pl-4" : "font-semibold"}`}
              style={{ color: line.color }}
            >
              {line.indent ? "• " : ""}
              {line.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
