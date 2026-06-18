import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, ShieldAlert, Store, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoAccounts } from "@/lib/demo-accounts.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Neural" }] }),
  component: Auth,
});

const DEMO_BTNS = [
  { email: "admin@demo.com", password: "Admin123", label: "Admin", icon: ShieldAlert, tone: "text-rose-400" },
  { email: "seller@demo.com", password: "Seller123", label: "Seller", icon: Store, tone: "text-cyan" },
  { email: "user@demo.com", password: "User123", label: "User", icon: UserRound, tone: "text-purple" },
] as const;

function Auth() {
  const navigate = useNavigate();
  const ensureDemo = useServerFn(ensureDemoAccounts);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pw, setPw] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<string | null>(null);

  const strength = Math.min(4, Math.floor(pw.length / 3));

  async function loginDemo(d: (typeof DEMO_BTNS)[number]) {
    setDemoBusy(d.email);
    try {
      // Try sign in first — if account already exists, this is instant.
      let { error } = await supabase.auth.signInWithPassword({ email: d.email, password: d.password });
      if (error) {
        // Bootstrap demo accounts (server-side, allowlisted), then retry.
        await ensureDemo();
        const retry = await supabase.auth.signInWithPassword({ email: d.email, password: d.password });
        if (retry.error) throw retry.error;
      }
      toast.success(`Signed in as ${d.label}`);
      navigate({ to: d.label === "Admin" ? "/admin/dashboard" : d.label === "Seller" ? "/seller/dashboard" : "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo sign-in failed");
    } finally {
      setDemoBusy(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        toast.success("Welcome back");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 min-h-[80vh] grid place-items-center">
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="absolute -inset-8 bg-aurora opacity-30 blur-3xl animate-aurora -z-10" />
        <div className="glass-strong rounded-3xl p-8 shadow-elevated">
          <div className="text-center mb-8">
            <div className="size-12 mx-auto rounded-2xl bg-aurora animate-aurora animate-pulse-glow mb-4" />
            <h1 className="text-3xl font-extrabold tracking-tighter">
              {mode === "signin" ? "Welcome back" : "Initialize account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Sign in to continue your journey"
                : "Create an account to enter the network"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl glass hover:glass-strong text-sm font-medium transition-all">
              <svg viewBox="0 0 24 24" className="size-4">
                <path fill="currentColor" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.11z"/>
                <path fill="currentColor" opacity=".7" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl glass hover:glass-strong text-sm font-medium transition-all">
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M16.5 0c.1 1.2-.4 2.4-1.1 3.3-.8.9-2 1.6-3.2 1.5-.1-1.2.4-2.4 1.1-3.2.8-.9 2.1-1.5 3.2-1.6zm3.7 17.3c-.6 1.4-.9 2-1.7 3.2-1.1 1.7-2.7 3.9-4.7 3.9-1.8 0-2.2-1.2-4.6-1.2-2.4 0-2.9 1.2-4.7 1.2-2 0-3.5-2-4.7-3.7-3.2-4.7-3.6-10.2-1.6-13.2C.5 5.5 2.7 4.2 4.8 4.2c2 0 3.3 1.1 4.9 1.1 1.6 0 2.6-1.1 5-1.1 1.8 0 3.8 1 5.1 2.7-4.5 2.5-3.8 9 .4 10.4z"/>
              </svg>
              Apple
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              or
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <FloatField icon={User} label="Full name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </motion.div>
              )}
            </AnimatePresence>
            <FloatField icon={Mail} label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <div>
              <FloatField
                icon={Lock}
                label="Password"
                type="password"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              {mode === "signup" && pw.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: i < strength ? 1 : 0.3 }}
                      className={`h-1 flex-1 rounded-full origin-left ${
                        i < strength
                          ? strength < 2
                            ? "bg-destructive"
                            : strength < 3
                            ? "bg-amber-400"
                            : "bg-cyan"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-aurora animate-aurora font-bold text-background shadow-glow-cyan hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-60"
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "New to Neural?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-cyan font-medium hover:underline"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function FloatField({
  icon: Icon,
  label,
  ...props
}: { icon: any; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  const [val, setVal] = useState((props.value as string) ?? "");
  const filled = focused || val.length > 0;

  return (
    <div className="relative">
      <Icon
        className={`absolute left-4 top-1/2 -translate-y-1/2 size-4 transition-colors ${
          focused ? "text-cyan" : "text-muted-foreground"
        }`}
      />
      <input
        {...props}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setVal(e.target.value);
          props.onChange?.(e);
        }}
        className={`w-full h-14 pl-11 pr-4 pt-4 rounded-xl bg-glass border border-white/10 outline-none transition-all ${
          focused ? "border-cyan shadow-glow-cyan" : ""
        }`}
      />
      <label
        className={`absolute left-11 pointer-events-none transition-all ${
          filled
            ? "top-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan"
            : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        }`}
      >
        {label}
      </label>
    </div>
  );
}
