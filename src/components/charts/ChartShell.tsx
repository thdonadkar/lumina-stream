import { motion } from "framer-motion";

export function ChartShell({
  title,
  subtitle,
  right,
  children,
  delay = 0,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-strong rounded-3xl p-5 relative overflow-hidden ${className}`}
    >
      <div className="absolute -top-24 -right-24 size-56 rounded-full bg-aurora opacity-10 blur-3xl pointer-events-none" />
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="font-bold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </header>
      {children}
    </motion.section>
  );
}

export function ChartTooltip({ active, payload, label, suffix = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-elevated">
      {label && <p className="font-mono text-[10px] text-muted-foreground mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize text-muted-foreground">{p.name || p.dataKey}</span>
          <span className="ml-auto font-mono font-bold">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
            {suffix}
          </span>
        </p>
      ))}
    </div>
  );
}
