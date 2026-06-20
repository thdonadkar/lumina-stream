import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip, Camera, X, Send, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordTicketAttachment } from "@/lib/support-attachments.functions";
import { replyToTicket } from "@/lib/support.functions";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpeg|jpg|webp|gif)|video\/(mp4|webm|quicktime)|application\/pdf)$/;

type Pending = {
  file: File;
  previewUrl: string | null;
  kind: "image" | "video" | "file";
  status: "uploading" | "ready" | "error";
  progress: number; // 0-100 (indeterminate-ish)
  storagePath: string | null;
};

export function TicketComposer({
  ticketId,
  onSent,
}: {
  ticketId: string;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const send = useServerFn(replyToTicket);
  const record = useServerFn(recordTicketAttachment);

  function revoke(p: Pending | null) {
    if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED.test(file.type)) { toast.error("Only images, videos, or PDFs are allowed"); return; }
    if (file.size > MAX_BYTES) { toast.error("File must be under 25 MB"); return; }

    const kind: Pending["kind"] = file.type.startsWith("image/") ? "image"
      : file.type.startsWith("video/") ? "video" : "file";
    const previewUrl = (kind === "image" || kind === "video") ? URL.createObjectURL(file) : null;

    const next: Pending = { file, previewUrl, kind, status: "uploading", progress: 8, storagePath: null };
    setPending((prev) => { revoke(prev); return next; });

    // Fake progress ticker while upload is in flight (Supabase JS lacks per-chunk progress)
    const ticker = setInterval(() => {
      setPending((p) => (p && p.file === file && p.status === "uploading" && p.progress < 90)
        ? { ...p, progress: Math.min(90, p.progress + 7) } : p);
    }, 200);

    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
      const path = `${ticketId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("support-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      setPending((p) => (p && p.file === file)
        ? { ...p, status: "ready", progress: 100, storagePath: path } : p);
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
      setPending((p) => (p && p.file === file) ? { ...p, status: "error" } : p);
    } finally {
      clearInterval(ticker);
    }
  }

  function clearPending() {
    setPending((prev) => { revoke(prev); return null; });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (pending && pending.status === "uploading") {
      toast.message("Waiting for upload to finish…");
      return;
    }
    if (!text.trim() && !pending) return;
    if (pending && pending.status === "error") {
      toast.error("Attachment failed to upload. Remove it or retry.");
      return;
    }

    setBusy(true);
    try {
      const body = text.trim() || (pending ? `📎 ${pending.file.name}` : "");
      const res = await send({ data: { id: ticketId, body } });
      const messageId = (res as any)?.messageId ?? null;

      if (pending && pending.storagePath) {
        await record({ data: {
          ticketId, messageId, storagePath: pending.storagePath, fileName: pending.file.name,
          mimeType: pending.file.type, sizeBytes: pending.file.size,
        }});
      }
      setText("");
      clearPending();
      onSent();
    } catch (err: any) {
      toast.error(err?.message ?? "Send failed");
    } finally {
      setBusy(false);
    }
  }

  const uploading = pending?.status === "uploading";
  const canSend = !busy && !uploading && (text.trim().length > 0 || (pending?.status === "ready"));

  return (
    <form onSubmit={submit} className="glass-strong rounded-2xl p-2.5 space-y-2">
      {pending && (
        <div className="glass rounded-xl p-2 flex items-center gap-2">
          <div className="relative size-12 shrink-0">
            {pending.kind === "image" && pending.previewUrl ? (
              <img src={pending.previewUrl} alt="" className="size-12 rounded-lg object-cover" />
            ) : pending.kind === "video" && pending.previewUrl ? (
              <video src={pending.previewUrl} className="size-12 rounded-lg object-cover bg-black" muted />
            ) : (
              <div className="size-12 rounded-lg grid place-items-center glass-strong">
                <FileText className="size-5 text-cyan" />
              </div>
            )}
            {pending.status === "uploading" && (
              <div className="absolute inset-0 rounded-lg bg-background/70 grid place-items-center">
                {/* Circular progress */}
                <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke="hsl(var(--cyan, 190 95% 55%))" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(pending.progress / 100) * 94.2} 94.2`}
                    className="text-cyan transition-[stroke-dasharray] duration-200"
                  />
                </svg>
              </div>
            )}
            {pending.status === "error" && (
              <div className="absolute inset-0 rounded-lg bg-rose-500/30 grid place-items-center text-[10px] font-bold">!</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{pending.file.name}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {(pending.file.size / 1024).toFixed(0)} KB ·{" "}
              {pending.status === "uploading" ? `uploading ${pending.progress}%`
                : pending.status === "ready" ? "ready to send"
                : "upload failed"}
            </p>
          </div>
          <button type="button" onClick={clearPending} aria-label="Remove attachment"
            className="size-7 rounded-full grid place-items-center glass-strong hover:bg-rose-500/20 shrink-0">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={busy || uploading}
          aria-label="Take photo"
          className="size-9 shrink-0 rounded-full grid place-items-center glass hover:bg-cyan/10 disabled:opacity-50">
          <Camera className="size-4" />
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || uploading}
          aria-label="Attach file"
          className="size-9 shrink-0 rounded-full grid place-items-center glass hover:bg-cyan/10 disabled:opacity-50">
          <Paperclip className="size-4" />
        </button>
        <input ref={cameraRef} type="file" hidden accept="image/*,video/*" capture="environment"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={fileRef} type="file" hidden
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={uploading ? "Uploading attachment…" : "Type your reply…"}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as any); }
          }}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm px-2 py-2 resize-none max-h-32"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={uploading ? "Waiting for upload" : "Send"}
          title={uploading ? "Waiting for upload to finish" : "Send"}
          className="size-9 shrink-0 rounded-full grid place-items-center bg-aurora text-background font-bold disabled:opacity-50"
        >
          {busy || uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
    </form>
  );
}
