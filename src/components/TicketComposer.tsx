import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip, Camera, X, Send, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordTicketAttachment } from "@/lib/support-attachments.functions";
import { replyToTicket } from "@/lib/support.functions";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpeg|jpg|webp|gif)|application\/pdf)$/;

type Pending = { file: File; previewUrl: string | null };

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

  function pick(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED.test(file.type)) { toast.error("Only images or PDFs are allowed"); return; }
    if (file.size > MAX_BYTES) { toast.error("File must be under 10 MB"); return; }
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setPending((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl };
    });
  }

  function clearPending() {
    setPending((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!text.trim() && !pending) return;

    setBusy(true);
    try {
      const body = text.trim() || (pending ? `📎 ${pending.file.name}` : "");
      const res = await send({ data: { id: ticketId, body } });
      const messageId = (res as any)?.messageId ?? null;

      if (pending) {
        const safeName = pending.file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
        const path = `${ticketId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("support-attachments")
          .upload(path, pending.file, { contentType: pending.file.type, upsert: false });
        if (upErr) throw upErr;
        await record({ data: {
          ticketId, messageId, storagePath: path, fileName: pending.file.name,
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

  return (
    <form onSubmit={submit} className="glass-strong rounded-2xl p-2.5 space-y-2">
      {pending && (
        <div className="glass rounded-xl p-2 flex items-center gap-2">
          {pending.previewUrl ? (
            <img src={pending.previewUrl} alt="" className="size-12 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="size-12 rounded-lg grid place-items-center glass-strong shrink-0">
              <FileText className="size-5 text-cyan" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{pending.file.name}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {(pending.file.size / 1024).toFixed(0)} KB · ready to send
            </p>
          </div>
          <button type="button" onClick={clearPending} aria-label="Remove attachment"
            className="size-7 rounded-full grid place-items-center glass-strong hover:bg-rose-500/20 shrink-0">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={busy}
          aria-label="Take photo"
          className="size-9 shrink-0 rounded-full grid place-items-center glass hover:bg-cyan/10 disabled:opacity-50">
          <Camera className="size-4" />
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          aria-label="Attach file"
          className="size-9 shrink-0 rounded-full grid place-items-center glass hover:bg-cyan/10 disabled:opacity-50">
          <Paperclip className="size-4" />
        </button>
        <input ref={cameraRef} type="file" hidden accept="image/*" capture="environment"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={fileRef} type="file" hidden
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your reply…"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as any); }
          }}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm px-2 py-2 resize-none max-h-32"
        />
        <button
          type="submit"
          disabled={busy || (!text.trim() && !pending)}
          aria-label="Send"
          className="size-9 shrink-0 rounded-full grid place-items-center bg-aurora text-background font-bold disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
    </form>
  );
}
