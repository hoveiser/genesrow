import { RotateCcw } from "lucide-react";
import { Button, Card, Mono, StatusPill } from "../components/ui";
import CreateEscrow from "../components/CreateEscrow";
import SubmitDelivery from "../components/SubmitDelivery";
import RaiseDispute from "../components/RaiseDispute";
import { useEscrows } from "../lib/store";

export default function Escrow() {
  const { escrows, totalLocked, reset } = useEscrows();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Interactive escrow flow</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A faithful local simulation of the deployed contract's validation and state machine.
            No keys, no chain writes - real on-chain proofs are linked in the Security tab.
          </p>
        </div>
        <Button variant="ghost" onClick={reset} disabled={escrows.length === 0}>
          <RotateCcw className="h-4 w-4" /> Reset session
        </Button>
      </div>

      <CreateEscrow />
      <SubmitDelivery />
      <RaiseDispute />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your escrows (session)</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Total locked: <Mono>{(totalLocked / 1e18).toFixed(2)} GEN</Mono>
          </span>
        </div>
        {escrows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No escrows yet. Create one above to walk the flow.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Freelancer</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Windows</th>
                  <th className="px-2 py-2">Seal</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {escrows.map((e) => (
                  <tr key={e.id} className="border-t border-white/10">
                    <td className="px-2 py-2 font-mono">{e.id}</td>
                    <td className="px-2 py-2 font-mono text-xs">{e.freelancer.slice(0, 10)}...</td>
                    <td className="px-2 py-2">{(e.amount / 1e18).toFixed(2)} GEN</td>
                    <td className="px-2 py-2 text-xs">
                      {e.approve_window_sec}s / {e.appeal_window_sec}s
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">
                      {e.evidence_hash ? `${e.evidence_hash.slice(0, 10)}...` : "-"}
                    </td>
                    <td className="px-2 py-2">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="px-2 py-2 text-xs">{e.ai_verdict ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
