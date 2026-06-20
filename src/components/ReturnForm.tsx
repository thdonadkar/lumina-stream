import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

const REASONS = [
  { id: "damaged", label: "Item arrived damaged" },
  { id: "wrong_item", label: "Wrong item received" },
  { id: "not_as_described", label: "Not as described" },
  { id: "defective", label: "Defective / doesn't work" },
  { id: "no_longer_needed", label: "No longer needed" },
  { id: "other", label: "Other" },
];

type Item = { id: string; title: string; image?: string | null };

export type ReturnFormSubmit = (input: {
  reason: string;
  description: string;
  order_item_id: string | null;
  photos: string[];
}) => Promise<void>;

/**
 * Structured return-request form. Lets buyers pick which line item, choose a
 * standard reason, add detail, and attach up to 4 photos. Photos are uploaded
 * directly from the browser to the private `return-photos` bucket; RLS scopes
 * each user to their own folder.
 */
export function ReturnForm({
  items,
  onCancel,
  onSubmit,
}: {
  items: Item[];
  onCancel: () => void;
  onSubmit: ReturnFormSubmit;
}) {
  const { userId } = useAuth();
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [itemId, setItemId] = useState<string>(items.length === 1 ? items[0].id : "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || !userId) return;
    if (photos.length + files.length > 4) {
      toast.error("Up to 4 photos");
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) { toast.error(`${file.name}: not an image`); continue; }
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: max 5MB`); continue; }
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("return-photos").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        uploaded.push(path);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(path: string) {
    await supabase.storage.from("return-photos").remove([path]).catch(() => {});
    setPhotos((p) => p.filter((x) => x !== path));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { toast.error("Pick a reason"); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        reason,
        description,
        order_item_id: itemId || null,
        photos,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass-strong rounded-2xl p-4 space-y-3">
      <p className="text-sm font-bold">Request a return</p>

      {items.length > 1 && (
        <div>
          <label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Which item?</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="mt-1 w-full glass rounded-xl px-3 py-2 text-sm bg-transparent"
          >
            <option value="">All items in this order</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.title}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Reason</label>
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {REASONS.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => setReason(r.id)}
              className={`text-left text-xs px-3 py-2 rounded-xl transition-all ${
                reason === r.id ? "glass-strong ring-1 ring-cyan text-cyan" : "glass hover:glass-strong"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">More detail (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Tell us what went wrong…"
          className="mt-1 w-full glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan resize-y"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Photos (up to 4)</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p} className="relative size-16 rounded-lg overflow-hidden glass">
              <PhotoThumb path={p} />
              <button
                type="button"
                onClick={() => removePhoto(p)}
                className="absolute top-0.5 right-0.5 size-5 grid place-items-center rounded-full bg-background/80 hover:bg-rose-500/80"
                aria-label="Remove photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <label className="size-16 grid place-items-center rounded-lg glass-strong hover:bg-glass-strong cursor-pointer">
              {uploading ? <Loader2 className="size-4 animate-spin text-cyan" /> : <Upload className="size-4 text-cyan" />}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-full px-3 py-1.5 text-xs glass">Cancel</button>
        <button disabled={submitting} className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background disabled:opacity-60">
          {submitting ? "Submitting…" : "Submit return"}
        </button>
      </div>
    </form>
  );
}

function PhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string>("");
  // Private bucket → signed URL good for 10 min, just to preview before submit.
  useState(() => {
    supabase.storage.from("return-photos").createSignedUrl(path, 600).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
    return 0;
  });
  return url ? <img src={url} alt="" className="size-full object-cover" /> : <div className="size-full bg-secondary" />;
}
