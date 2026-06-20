import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Star, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useConfirm } from "@/components/ConfirmDialog";
import { listProductReviews, upsertProductReview, deleteProductReview } from "@/lib/reviews.functions";

type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  author: string;
};

export function ProductReviews({ productId }: { productId: string }) {
  const { userId } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ rating: number; title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fetchList = useServerFn(listProductReviews);
  const upsert = useServerFn(upsertProductReview);
  const del = useServerFn(deleteProductReview);
  const { confirm } = useConfirm();

  async function refresh() {
    try {
      const data = await fetchList({ data: { productId } });
      setReviews(data as Review[]);
    } catch { /* */ }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [productId]);

  const myReview = userId ? reviews.find((r) => r.user_id === userId) : null;
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => {
    const c = reviews.filter((r) => r.rating === s).length;
    return { star: s, count: c, pct: count ? Math.round((c / count) * 100) : 0 };
  });

  function startEdit() {
    setEditing(myReview
      ? { rating: myReview.rating, title: myReview.title ?? "", body: myReview.body ?? "" }
      : { rating: 5, title: "", body: "" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await upsert({ data: { productId, rating: editing.rating, title: editing.title || undefined, body: editing.body || undefined } });
      toast.success(myReview ? "Review updated" : "Review posted");
      setEditing(null);
      refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  async function onDelete() {
    if (!myReview) return;
    if (!(await confirm({ title: "Delete your review?", destructive: true, confirmText: "Delete" }))) return;
    try {
      await del({ data: { id: myReview.id } });
      toast.success("Review deleted");
      refresh();
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <section className="mt-24">
      <h2 className="text-2xl font-bold mb-6">Customer signal</h2>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-strong rounded-2xl p-6">
          {count === 0 ? (
            <>
              <p className="text-5xl font-extrabold font-mono text-gradient">—</p>
              <p className="text-sm text-muted-foreground mt-2">No reviews yet</p>
              <p className="text-xs text-muted-foreground mt-4">Be the first to share your thoughts.</p>
            </>
          ) : (
            <>
              <p className="text-5xl font-extrabold font-mono text-gradient">{avg.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground mt-2">From {count} review{count === 1 ? "" : "s"}</p>
              <div className="mt-4 space-y-2">
                {dist.map(({ star, pct }) => (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-3 font-mono text-muted-foreground">{star}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.1 * (5 - star) }}
                        className="h-full bg-aurora"
                      />
                    </div>
                    <span className="w-8 font-mono text-muted-foreground">{pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="md:col-span-2 space-y-3">
          {/* Compose / edit */}
          {!editing && userId && (
            <button onClick={startEdit} className="w-full glass hover:glass-strong rounded-2xl p-4 text-sm font-bold inline-flex items-center justify-center gap-2 transition-all">
              {myReview ? (<><Pencil className="size-4" /> Edit your review</>) : (<><Star className="size-4" /> Write a review</>)}
            </button>
          )}
          {!userId && (
            <div className="glass rounded-2xl p-4 text-xs text-center text-muted-foreground">
              Sign in to write a review.
            </div>
          )}
          {editing && (
            <form onSubmit={submit} className="glass-strong rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    type="button" key={s}
                    onClick={() => setEditing({ ...editing, rating: s })}
                    aria-label={`${s} star${s === 1 ? "" : "s"}`}
                    className="p-1"
                  >
                    <Star className={`size-6 transition-all ${s <= editing.rating ? "fill-cyan text-cyan" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Title (optional)"
                maxLength={120}
                className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan"
              />
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                placeholder="Tell others about your experience…"
                rows={4}
                maxLength={2000}
                className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan resize-y"
              />
              <div className="flex justify-between items-center gap-2">
                {myReview ? (
                  <button type="button" onClick={onDelete} className="text-xs text-rose-300 hover:opacity-80 inline-flex items-center gap-1">
                    <Trash2 className="size-3" /> Delete review
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditing(null)} className="rounded-full px-4 py-1.5 text-xs glass">Cancel</button>
                  <button disabled={busy} className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background disabled:opacity-50">
                    {busy ? "Posting…" : myReview ? "Update" : "Post review"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* List */}
          {loading ? (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">Loading reviews…</div>
          ) : reviews.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">No reviews yet.</div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`size-3 ${s <= r.rating ? "fill-cyan text-cyan" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                {r.title && <p className="font-bold text-sm mb-1">{r.title}</p>}
                {r.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{r.body}</p>}
                <p className="mt-3 text-xs font-mono text-muted-foreground">— {r.author}{r.user_id === userId ? " (you)" : ""}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
