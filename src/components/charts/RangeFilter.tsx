import { RANGES, type Range } from "@/lib/analytics-mock";

export function RangeFilter({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="glass rounded-full p-1 flex text-[11px] font-mono uppercase">
      {RANGES.map((r) => {
        const active = r.id === value;
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={`px-3 py-1 rounded-full transition-all whitespace-nowrap ${
              active
                ? "bg-aurora animate-aurora text-background font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
