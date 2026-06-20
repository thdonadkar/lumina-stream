import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ConfirmOpts = { title: string; description?: string; confirmText?: string; cancelText?: string; destructive?: boolean };
type PromptOpts = { title: string; description?: string; defaultValue?: string; placeholder?: string; confirmText?: string };

type Ctx = {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
};

const DialogCtx = createContext<Ctx | null>(null);

export function useConfirm() {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error("useConfirm must be used within <DialogProvider>");
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [promptState, setPromptState] = useState<(PromptOpts & { resolve: (v: string | null) => void; value: string }) | null>(null);

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })), []);
  const prompt = useCallback((opts: PromptOpts) => new Promise<string | null>((resolve) => setPromptState({ ...opts, resolve, value: opts.defaultValue ?? "" })), []);

  return (
    <DialogCtx.Provider value={{ confirm, prompt }}>
      {children}
      <AlertDialog open={!!confirmState} onOpenChange={(o) => { if (!o && confirmState) { confirmState.resolve(false); setConfirmState(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            {confirmState?.description && <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { confirmState?.resolve(false); setConfirmState(null); }}>{confirmState?.cancelText ?? "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className={confirmState?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => { confirmState?.resolve(true); setConfirmState(null); }}
            >
              {confirmState?.confirmText ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!promptState} onOpenChange={(o) => { if (!o && promptState) { promptState.resolve(null); setPromptState(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promptState?.title}</DialogTitle>
            {promptState?.description && <DialogDescription>{promptState.description}</DialogDescription>}
          </DialogHeader>
          <Input
            autoFocus
            value={promptState?.value ?? ""}
            placeholder={promptState?.placeholder}
            onChange={(e) => setPromptState((s) => s ? { ...s, value: e.target.value } : s)}
            onKeyDown={(e) => { if (e.key === "Enter" && promptState) { promptState.resolve(promptState.value); setPromptState(null); } }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { promptState?.resolve(null); setPromptState(null); }}>Cancel</Button>
            <Button onClick={() => { if (promptState) { promptState.resolve(promptState.value); setPromptState(null); } }}>{promptState?.confirmText ?? "OK"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogCtx.Provider>
  );
}
