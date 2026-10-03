import { useMemo, useState } from "react";
import {
  Box,
  Copy,
  FileSearch,
  Hash,
  Link2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import {
  Button,
  Card,
  Field,
  Mono,
  SectionTitle,
  StatusPill,
  TextArea,
  TextInput,
  useToast,
} from "./ui";
import {
  artifactView,
  cleanText,
  sanitize,
  sha256Hex,
  validateEvidence,
} from "../lib/contract";
import { SEAL_SAMPLE } from "../lib/evidence";
import { useEscrows } from "../lib/store";

export default function SubmitDelivery() {
  const { escrows, getEscrow, markDelivered } = useEscrows();
  const toast = useToast();

  const funded = escrows.filter((e) => e.status === "funded");
  const [escrowId, setEscrowId] = useState<string>(funded[0]?.id ? String(funded[0].id) : "1");
  const [url, setUrl] = useState(SEAL_SAMPLE.url);
  const [pasted, setPasted] = useState<string>("");
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [rawLen, setRawLen] = useState(0);
  const [seal, setSeal] = useState<string | null>(null);
  const [cleaned, setCleaned] = useState<string>("");
  const [view, setView] = useState<string>("");
  const [rawBytes, setRawBytes] = useState<Uint8Array | null>(null);

  const ev = useMemo(() => validateEvidence(url), [url]);
  const escrow = getEscrow(Number(escrowId));

  // A5: allowlist verdict, mirroring _validate_evidence.
  const allowVerdict = ev
    ? { ok: true, msg: `Allowlisted ${ev.kind} artifact - immutable id ${ev.immutableId.slice(0, 12)}...` }
    : { ok: false, msg: "Not an authenticated immutable artifact (must be GitHub raw/blob/commit at full SHA, IPFS CID, or Arweave; https only; no @ ? # port or traversal)" };

  const loadBytes = async (bytes: Uint8Array) => {
    const hex = await sha256Hex(bytes);
    const text = cleanText(bytes);
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    setRawBytes(bytes);
    setRawLen(bytes.length);
    setSeal(hex);
    setCleaned(text);
    setView(artifactView(text, raw));
  };

  const doFetch = async () => {
    if (!ev) {
      toast("error", "Fix the URL against the allowlist first (A5).");
      return;
    }
    setFetchState("loading");
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = new Uint8Array(await r.arrayBuffer());
      await loadBytes(buf);
      setFetchState("done");
      toast("success", `Fetched ${buf.length} bytes and sealed the raw bytes.`);
    } catch (e) {
      setFetchState("error");
      toast(
        "error",
        `Browser fetch failed (${(e as Error).message}). Paste the raw content, or note this mirrors validator liveness limits (see A5).`,
      );
    }
  };

  const doPasteSeal = async () => {
    if (!pasted) return;
    await loadBytes(new TextEncoder().encode(pasted));
    setFetchState("done");
    toast("success", "Sealed the pasted raw bytes.");
  };

  const submit = () => {
    if (!rawBytes || !seal) {
      toast("error", "Fetch or paste content to produce a seal first.");
      return;
    }
    const res = markDelivered(Number(escrowId), {
      deliverable_url: url,
      rawBytes,
      sealedHash: seal,
      cleaned,
      view: sanitize(view, 12000),
    });
    toast(res.ok ? "success" : "error", res.message);
  };

  const cleanedEmpty = cleaned.length < 20;

  return (
    <Card>
      <SectionTitle
        icon={<Box className="h-5 w-5" />}
        title="2 - Submit Delivery"
        sub={
          <>
            Demonstrates <b>A5 gateway allowlist</b> and <b>A3 raw-byte seal</b>. The seal is
            <Mono>sha256</Mono> of the RAW fetched bytes (not cleaned text), exactly like
            <Mono>_seal()</Mono> in the contract.
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Escrow ID">
          <select
            className="w-full rounded-xl border border-white/20 bg-white/70 px-3 py-2 text-sm dark:bg-ink-800"
            value={escrowId}
            onChange={(e) => setEscrowId(e.target.value)}
          >
            {funded.length === 0 && <option value="1">no funded escrow (create one first)</option>}
            {funded.map((e) => (
              <option key={e.id} value={e.id}>
                #{e.id} - {sanitize(e.description, 28)}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field
            label="Deliverable URL"
            ok={allowVerdict.ok ? allowVerdict.msg : null}
            error={allowVerdict.ok ? null : allowVerdict.msg}
          >
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-gl-purple" />
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
            </div>
          </Field>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={doFetch} disabled={!allowVerdict.ok || fetchState === "loading"}>
          <RefreshCw className={"h-4 w-4 " + (fetchState === "loading" ? "animate-spin" : "")} />
          Fetch &amp; seal
        </Button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          or paste raw content to seal offline:
        </span>
      </div>

      <div className="mt-3 grid gap-3">
        <TextArea
          rows={3}
          placeholder="Paste the exact raw bytes here if the browser cannot fetch (CORS/bot-challenge). The seal is computed over this raw text."
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <Button variant="ghost" onClick={doPasteSeal} disabled={!pasted}>
          <Hash className="h-4 w-4" /> Seal pasted bytes
        </Button>
      </div>

      {seal && (
        <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-black/5 p-4 dark:bg-ink-800/60">
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-gl-orange" />
            <span className="font-semibold">SHA256 seal (raw bytes)</span>
            <Mono>{seal}</Mono>
            <button
              className="text-slate-400 hover:text-gl-orange"
              onClick={() => {
                navigator.clipboard?.writeText(seal);
                toast("info", "Seal copied.");
              }}
              aria-label="Copy seal"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {rawLen} raw bytes - cleaned text {cleaned.length} chars
            {cleanedEmpty && (
              <span className="ml-2 inline-flex items-center gap-1 text-rose-600">
                <TriangleAlert className="h-3.5 w-3.5" /> cleaned text &lt; 20 chars would revert as unfetchable
              </span>
            )}
          </div>

          <details className="group">
            <summary className="cursor-pointer select-none text-sm font-medium text-gl-purple">
              <FileSearch className="mr-1 inline h-4 w-4" /> Fetched content preview (cleaned text)
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/10 p-3 font-mono text-xs dark:bg-black/40">
              {cleaned.slice(0, 1200) || "(empty)"}
            </pre>
          </details>

          <details className="group">
            <summary className="cursor-pointer select-none text-sm font-medium text-gl-purple">
              Structural index sent to validators (A2 view)
            </summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-black/10 p-3 font-mono text-xs dark:bg-black/40">
              {view.slice(0, 2000)}
            </pre>
          </details>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={submit} disabled={!!(escrow && escrow.status !== "funded")}>
              Submit Delivery
            </Button>
            {escrow && <StatusPill status={escrow.status} />}
          </div>
        </div>
      )}
    </Card>
  );
}
