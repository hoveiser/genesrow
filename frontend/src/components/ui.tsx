import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/60 p-6 shadow-glow backdrop-blur transition-colors " +
        "dark:border-white/10 dark:bg-ink-900/70 " +
        className
      }
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  icon,
  title,
  sub,
}: {
  icon?: ReactNode;
  title: string;
  sub?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {icon && <div className="mt-0.5 text-gl-orange">{icon}</div>}
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {sub && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "success";
};

export function Button({ variant = "primary", className = "", ...rest }: BtnProps) {
  const styles: Record<string, string> = {
    primary:
      "bg-gl-gradient text-white shadow-glow hover:brightness-110 disabled:opacity-40",
    ghost:
      "border border-white/20 bg-transparent text-slate-800 hover:bg-white/10 dark:text-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40",
    success: "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40",
  };
  return (
    <button
      className={
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed " +
        styles[variant] +
        " " +
        className
      }
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  ok,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  ok?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && !error && !ok && (
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      )}
      {ok && <span className="mt-1 block text-xs font-medium text-emerald-600">{ok}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-white/20 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-gl-orange focus:ring-2 focus:ring-gl-orange/30 dark:bg-ink-800";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputBase + " " + (props.className ?? "")} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputBase + " font-mono " + (props.className ?? "")} />;
}

const STATUS_COLOR: Record<string, string> = {
  funded: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  delivered: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  review: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  disputed: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
  adjudicated: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300",
  released: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  refunded: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  unresolvable: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  canceled: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide " +
        (STATUS_COLOR[status] ?? "bg-slate-500/15 text-slate-500")
      }
    >
      {status}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">
      {children}
    </code>
  );
}

// ---- Toasts ----
type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  msg: string;
}
const ToastCtx = createContext<(kind: ToastKind, msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: ToastKind, msg: string) => {
    setItems((p) => [...p, { id: Date.now() + Math.random(), kind, msg }]);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <ToastItem key={t.id} t={t} onDone={() => setItems((p) => p.filter((x) => x.id !== t.id))} />
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ t, onDone }: { t: Toast; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 4200);
    return () => clearTimeout(id);
  }, [onDone]);
  const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Info;
  const color =
    t.kind === "success"
      ? "text-emerald-500"
      : t.kind === "error"
        ? "text-rose-500"
        : "text-sky-500";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border border-white/20 bg-ink-900/95 px-4 py-3 text-sm text-white shadow-glow backdrop-blur"
    >
      <Icon className={"mt-0.5 h-4 w-4 shrink-0 " + color} />
      <span className="flex-1">{t.msg}</span>
      <button onClick={onDone} className="text-white/50 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
