import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import { Button, Card, Mono } from "../components/ui";
import { CHAIN, CONTRACT_ADDRESS } from "../lib/contract";
import { RELEASE_URL } from "../lib/evidence";
import ContractStatus from "../components/ContractStatus";

const FEATURES = [
  { icon: Timer, t: "A1 Bounded windows", d: "Payouts can never be stranded by an infinite window." },
  { icon: Sparkles, t: "A2 Injection protection", d: "Untrusted text is fenced and sanitized before AI review." },
  { icon: Boxes, t: "A3 Raw-byte seal", d: "Hidden mutations fail re-verification as EVIDENCE_MISMATCH." },
  { icon: Users, t: "A4 Address validation", d: "Counterparties are checked before any state change." },
  { icon: ShieldCheck, t: "A5 Gateway allowlist", d: "Lookalike / traversal tricks rejected; reachability proven." },
];

export default function Landing() {
  return (
    <div className="space-y-8">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/50 px-3 py-1 text-xs font-semibold dark:bg-ink-800/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live on {CHAIN}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            <span className="bg-gl-gradient bg-clip-text text-transparent">GenEscrow</span> v1.3.0
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            AI-adjudicated freelance escrow with real payable custody. Deliverables are sealed
            on-chain as raw-byte hashes and disputed outcomes are decided by independent AI
            validators - now hardened against six audit findings.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/escrow">
              <Button>
                Try the interactive flow <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/security">
              <Button variant="ghost">View security proofs</Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Contract: <Mono>{CONTRACT_ADDRESS}</Mono>
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="space-y-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.t} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gl-gradient text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{f.t}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{f.d}</div>
                  </div>
                </div>
              );
            })}
            <div className="border-t border-white/10 pt-3 text-xs text-slate-500 dark:text-slate-400">
              Also: <b>A6</b> real-runtime Direct Mode test harness (22 tests, CI green). Demo
              videos ship with the{" "}
              <a className="text-gl-orange underline" href={RELEASE_URL} target="_blank" rel="noreferrer">
                v1.3.0 release
              </a>
              .
            </div>
          </Card>
        </motion.div>
      </section>

      <ContractStatus />
    </div>
  );
}
