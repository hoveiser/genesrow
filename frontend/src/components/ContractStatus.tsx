import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Copy,
  Eye,
  Radio,
  Wallet,
  Loader2,
} from "lucide-react";
import { Button, Card, Mono, SectionTitle, useToast } from "./ui";
import { CHAIN, CONTRACT_ADDRESS, EXPLORER } from "../lib/contract";
import { DEPLOY } from "../lib/evidence";
import { readContractBalance, type LiveStatus } from "../lib/explorer";

const short = (a: string) => `${a.slice(0, 10)}...${a.slice(-8)}`;

export default function ContractStatus() {
  const toast = useToast();
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setLive(await readContractBalance());
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <SectionTitle
        icon={<Radio className="h-5 w-5" />}
        title="Live contract status"
        sub={`Deployed on ${CHAIN}. Read-only checks; no state change and no funds move.`}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/5 p-4 dark:bg-ink-800/60">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Contract address
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Mono>{CONTRACT_ADDRESS}</Mono>
            <button
              className="text-slate-400 hover:text-gl-orange"
              onClick={() => {
                navigator.clipboard?.writeText(CONTRACT_ADDRESS);
                toast("info", "Address copied.");
              }}
              aria-label="Copy address"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <a
              className="inline-flex items-center gap-1 text-gl-orange hover:underline"
              href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              <Eye className="h-4 w-4" /> View on Explorer
            </a>
            <a
              className="inline-flex items-center gap-1 text-gl-orange hover:underline"
              href={`${EXPLORER}/tx/${DEPLOY.deploy_tx}`}
              target="_blank"
              rel="noreferrer"
            >
              Deploy tx {short(DEPLOY.deploy_tx)}
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/5 p-4 dark:bg-ink-800/60">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Escrow pool balance
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-gl-purple" />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            {live?.ok ? (
              <span className="font-semibold">{live.balanceGen} GEN</span>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                live read unavailable from browser (CORS) - use Explorer
              </span>
            )}
            <Button variant="ghost" className="ml-auto px-2 py-1 text-xs" onClick={load} disabled={loading}>
              {loading ? "Checking..." : "Re-check"}
            </Button>
          </div>
          {live && !live.ok && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Reason: {live.error}. The on-chain balance is authoritative on the Explorer link above.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <BadgeCheck className="h-6 w-6 text-emerald-500" />
        <div className="text-sm">
          <div className="font-semibold text-emerald-700 dark:text-emerald-300">
            Deployed source is byte-identical to contract.py
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            {DEPLOY.deployed_bytes.toLocaleString()} bytes - sha256{" "}
            <Mono>{DEPLOY.sha256.slice(0, 24)}...</Mono> - verified via <Mono>gen_getContractCode</Mono>
          </div>
        </div>
        <a
          className="ml-auto inline-flex items-center gap-1 text-sm text-gl-orange hover:underline"
          href="https://github.com/hoveiser/genesrow/blob/main/scripts/verify_deployment.py"
          target="_blank"
          rel="noreferrer"
        >
          Reproduce the check
        </a>
      </div>
    </Card>
  );
}
