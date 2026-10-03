import { BookOpen, Github, PlayCircle, ScrollText } from "lucide-react";
import { Card, Mono, SectionTitle } from "../components/ui";
import { CHAIN, CONTRACT_ADDRESS } from "../lib/contract";
import { DEPLOY, HISTORICAL_TESTS, RELEASE_URL, txUrl } from "../lib/evidence";

const CHANGELOG: [string, string][] = [
  ["A1", "Bounded party windows clamped to [60s, 7 days]; an over-long window reverts and locks nothing."],
  ["A2", "Structural-index sanitization: markup stripped + length-capped; untrusted text fenced in <data>."],
  ["A3", "Evidence sealed as sha256 over RAW bytes, not cleaned text, so hidden mutations become EVIDENCE_MISMATCH."],
  ["A4", "Freelancer address validated (parses to Address, non-zero, distinct from client) before creation."],
  ["A5", "Anchored-parser gateway allowlist resists lookalike/userinfo/port/traversal; validator reachability proven on chain."],
  ["A6", "Real-runtime Direct Mode test harness against the pinned GenVM runner (22 tests, CI green)."],
];

export default function About() {
  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          icon={<BookOpen className="h-5 w-5" />}
          title="About GenEscrow"
          sub="AI-adjudicated freelance escrow on GenLayer."
        />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          A client funds an escrow with real GEN (payable custody) and pins the expected deliverable
          to an authenticated immutable artifact. The freelancer delivers a commit-pinned or
          content-addressed URL; the contract seals a raw-byte hash at delivery. On dispute,
          independent AI validators re-fetch the artifact, re-verify the seal, and vote APPROVED or
          REFUNDED via <Mono>run_nondet_unsafe</Mono> leader/validator consensus, with the reasoning
          stored on-chain. Timeouts, appeals, and a final AI round settle the funds.
        </p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Network</div>
            {CHAIN}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Contract</div>
            <Mono>{CONTRACT_ADDRESS}</Mono>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Source</div>
            Byte-identical to <Mono>contract.py</Mono> ({DEPLOY.deployed_bytes.toLocaleString()} bytes)
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Deploy tx</div>
            <a className="text-gl-orange underline" href={txUrl(DEPLOY.deploy_tx)} target="_blank" rel="noreferrer">
              <Mono>{DEPLOY.deploy_tx.slice(0, 14)}...</Mono>
            </a>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="https://github.com/hoveiser/genesrow" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-gl-orange hover:underline">
            <Github className="h-4 w-4" /> Backend repo
          </a>
          <a href={RELEASE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-gl-orange hover:underline">
            <PlayCircle className="h-4 w-4" /> v1.3.0 demo videos
          </a>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<ScrollText className="h-5 w-5" />} title="Changes from v1.2.0 to v1.3.0" />
        <ul className="space-y-2">
          {CHANGELOG.map(([k, v]) => (
            <li key={k} className="flex gap-3 text-sm">
              <span className="font-bold text-gl-orange">{k}</span>
              <span className="text-slate-600 dark:text-slate-300">{v}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle title="Historical v1.2.0 reference tests" sub="Kept as evidence of earlier behavior; still reproducible on the explorer." />
        <div className="grid gap-2">
          {HISTORICAL_TESTS.map((p) => (
            <a key={p.hash} href={txUrl(p.hash)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm hover:border-gl-orange/40">
              <span>{p.label}</span>
              <Mono>{p.hash.slice(0, 10)}...</Mono>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
