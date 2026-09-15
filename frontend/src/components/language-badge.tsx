const LANGUAGE_STYLES: Record<string, { label: string; className: string }> = {
  en: { label: "EN", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  hi: { label: "HI", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  or: { label: "OR", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

export function LanguageBadge({ language }: { language: string }) {
  const style = LANGUAGE_STYLES[language] ?? {
    label: language.toUpperCase(),
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide ${style.className}`}
    >
      {style.label}
    </span>
  );
}
