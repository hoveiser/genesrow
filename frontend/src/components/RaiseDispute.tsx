import { useMemo, useState } from "react";
import { Gavel, Sparkles, ShieldHalf, FileDiff, Braces } from "lucide-react";
import {
  Button,
  Card,
  Field,
  Mono,
  SectionTitle,
  StatusPill,
  TextArea,
  useToast,
} from "./ui";
import { INJECTION_PATTERNS, buildPrompt } from "../lib/contract";
import { txUrl } from "../lib/evidence";
import { useEscrows } from "../lib/store";

export default function RaiseDispute() {
  const { escrows, getEscrow, setStatus, adjudicate, finalize } = useEscrows();
  const toast = useToast();

  const disputable = escrows.filter((e) => e.status === "delivered");
  const [escrowId, setEscrowId] = useState(
    String(disputable[0]?.id ?? (escrows[0]?.id ?? 1)),
  );
  const [reason, setReason] = useState(
    "Deliverable does not meet the agreed acceptance criteria.",
  );
  const escrow = getEscrow(Number(escrowId));

  const prompt = useMemo(() => {
    if (!escrow || !escrow.view) return null;
    return buildPrompt({
      description: escrow.description,
      acceptance_criteria: escrow.acceptance_criteria,
      evidence_hash: escrow.evidence_hash ?? "",
      deliverable_view: escrow.view,
    });
  }, [escrow]);

  const injectionFound = useMemo(() => {
    const v = escrow?.view;
    if (!v) return [] as string[];
    return INJECTION_PATTERNS.filter((re) => re.test(v)).map((re) => re.source);
  }, [escrow]);

  const raise = () => {
    if (!escrow) return toast("error", "No such escrow");
    if (escrow.status !== "delivered") return toast("error", "Not delivered");
    setStatus(escrow.id, "disputed");
    toast("success", "Dispute raised; escrow is now disputed.");
  };

  const view = () => {
    const e = getEscrow(Number(escrowId));
    if (!e) return;
    const res = adjudicate(e.id);
    toast(res.ok ? "info" : "error", res.message);
  };

  const fin = () => {
    const res = finalize(Number(escrowId));
    toast(res.ok ? "success" : "error", res.message);
  };

  return (
    <Card>
      <SectionTitle
        icon={<Gavel className="h-5 w-5" />}
        title="3 - Raise Dispute &amp; AI Adjudication"
        sub={
          <>
            Demonstrates <b>A2 prompt-injection protection</b>. The arbitration prompt wraps all
            party/web content in <Mono>&lt;data&gt;</Mono> tags marked UNTRUSTED, and the structural
            index lines are sanitized + length-capped before they reach validators.
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Escrow ID">
          <select
            className="w-full rounded-xl border border-white/20 bg-white/70 px-3 py-2 text-sm dark:bg-ink-800"
            value={escrowId}
            onChange={(e) => setEscrowId(e.target.value)}
          >
            {escrows.map((e) => (
              <option key={e.id} value={e.id}>
                #{e.id} - {e.status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dispute reason">
          <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={raise} disabled={escrow?.status !== "delivered"}>
          <ShieldHalf className="h-4 w-4" /> Raise Dispute
        </Button>
        <Button variant="ghost" onClick={view} disabled={!escrow || (escrow.status !== "disputed" && escrow.status !== "review")}>
          <Sparkles className="h-4 w-4" /> View Verdict
        </Button>
        <Button variant="success" onClick={fin} disabled={escrow?.status !== "adjudicated"}>
          Finalize
        </Button>
        {escrow && <StatusPill status={escrow.status} />}
      </div>

      {escrow?.evidence_hash && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/5 p-3 dark:bg-ink-800/60">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <FileDiff className="h-4 w-4 text-gl-purple" /> Fetched evidence vs cleaned text
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sealed raw-byte hash <Mono>{escrow.evidence_hash.slice(0, 20)}...</Mono>
            </p>
            <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-black/10 p-2 font-mono text-xs dark:bg-black/40">
              {(escrow.view ?? "").slice(0, 700)}
            </pre>
            <div className="mt-2 text-xs">
              {injectionFound.length ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                  <Braces className="h-3.5 w-3.5" /> Instruction-like text detected in the data region and
                  neutralized: <Mono>{injectionFound.join(", ")}</Mono>
                </span>
              ) : (
                <span className="text-emerald-600">No instruction-like payloads in the data region.</span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/5 p-3 dark:bg-ink-800/60">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-gl-orange" /> Prompt sent to validators
            </div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-black/10 p-2 font-mono text-[11px] leading-relaxed dark:bg-black/40">
              {prompt ?? "Deliver an artifact first to build the prompt."}
            </pre>
          </div>
        </div>
      )}

      {escrow?.ai_verdict && (
        <div className="mt-4 rounded-xl border border-gl-purple/30 bg-gl-purple/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Verdict:</span>
            <Mono>{escrow.ai_verdict}</Mono>
            <StatusPill status={escrow.status} />
            {escrow.winner && (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                winner: <b>{escrow.winner}</b>
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{escrow.ai_reasoning}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            This verdict is a local simulation. On StudioNet the real verdict comes from AI
            validators via <Mono>run_nondet_unsafe</Mono>. See the live injection REFUNDED proof:{" "}
            <a
              className="text-gl-orange underline"
              href={txUrl(
                "0x365907354ec124ed6a6b5aa7bfe37759ad5e5ffdea1a726fc65c5d17e094a286",
              )}
              target="_blank"
              rel="noreferrer"
            >
              resolve tx
            </a>
            .
          </p>
        </div>
      )}
    </Card>
  );
}
