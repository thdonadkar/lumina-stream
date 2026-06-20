import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordTicketAttachment, listTicketAttachments } from "@/lib/support-attachments.functions";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = /^(image\/(png|jpeg|jpg|webp|gif)|application\/pdf)$/;

export function TicketAttachments({ ticketId }: { ticketId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchList = useServerFn(listTicketAttachments);
  const record = useServerFn(recordTicketAttachment);

  async function refresh() {
    try { setItems(await fetchList({ data: { ticketId } })); } catch { /* */ }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ticketId]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED.test(file.type)) { toast.error("Only images or PDFs are allowed"); return; }
    if (file.size > MAX_BYTES) { toast.error("File must be under 10 MB"); return; }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
      const path = `${ticketId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("support-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      await record({ data: {
        ticketId, storagePath: path, fileName: file.name,
        mimeType: file.type, sizeBytes: file.size,
      } });
      toast.success("Attachment uploaded");
      refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Attachments {items.length > 0 && `· ${items.length}`}
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-full glass-strong hover:bg-cyan/10 font-bold disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-3 animate-spin" /> : <Paperclip className="size-3" />}
          {uploading ? "Uploading…" : "Attach file"}
        </button>
        <input
          ref={inputRef} type="file" hidden onChange={onPick}
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
        />
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No attachments yet — add a photo or PDF (max 10 MB).</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((a) => {
            const isImage = a.mime_type?.startsWith("image/");
            return (
              <a
                key={a.id} href={a.url ?? "#"} target="_blank" rel="noopener noreferrer"
                className="glass-strong rounded-xl p-2 flex flex-col gap-1 hover:bg-cyan/5 transition-all"
              >
                {isImage && a.url ? (
                  <img src={a.url} alt={a.file_name} className="w-full h-20 object-cover rounded-md" />
                ) : (
                  <div className="w-full h-20 rounded-md glass grid place-items-center">
                    {isImage ? <ImageIcon className="size-6 text-cyan" /> : <FileText className="size-6 text-cyan" />}
                  </div>
                )}
                <p className="text-[10px] truncate font-mono">{a.file_name}</p>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
