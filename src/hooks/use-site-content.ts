import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSiteContent } from "@/lib/site-content.functions";

/**
 * Loads a single site_content key. Returns the merged value
 * (defaults overridden by stored value). Falls back silently on failure
 * so pages keep rendering with their defaults.
 */
export function useSiteContent<T extends Record<string, any>>(key: string, defaults: T): T {
  const fetcher = useServerFn(getSiteContent);
  const [value, setValue] = useState<T>(defaults);
  useEffect(() => {
    let cancelled = false;
    fetcher({ data: { key } })
      .then((row) => {
        if (cancelled) return;
        const v = (row?.value ?? null) as Partial<T> | null;
        if (v && typeof v === "object") setValue({ ...defaults, ...v });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}
