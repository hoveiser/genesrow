import {
  Activity,
  ArrowUpRight,
  Braces,
  Check,
  ExternalLink,
  Hash,
  Server,
  ShieldCheck,
  Timer,
  UserCheck,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, Mono, SectionTitle } from "./ui";
import { MAX_WINDOW_SEC, MIN_WINDOW_SEC } from "../lib/contract";
import {
  GATEWAY_REACHABILITY,
  SECURITY_PROOFS,
  txUrl,
} from "../lib/evidence";

const ENH = [
  {
    key: "A1",
    icon: Timer,
    title: "Bounded party windows",
    body: "approve/appeal windows clamped to [60s, 7 days]; an over-long window reverts and locks nothing.",
    visual: `${MIN_WINDOW_SEC}s to ${MAX_WINDOW_SEC.toLocaleString()}s`,
  },
  {
    key: "A2",
    icon: Braces,
    title: "Structural-index sanitization",
    body: "each def/class index line is markup-stripped and length-capped, and all untrusted text sits inside <data> tags the prompt forbids following.",
    visual: "def x(): ... capped to 200",
  },
  {
    key: "A3",
    icon: Hash,
    title: "Raw-byte seal",
    body: "the evidence hash is sha256 over the raw fetched bytes, so mutations hidden inside stripped regions still fail re-verification as EVIDENCE_MISMATCH.",
    visual: "sha256(raw bytes)",
  },
  {
    key: "A4",
    icon: UserCheck,
    title: "Address validation",
    body: "the freelancer address must parse, be non-zero, and differ from the client before any escrow is created.",
    visual: "non-zero - distinct - 0x+40hex",
  },
  {
    key: "A5",
    icon: Server,
    title: "Gateway allowlist + reachability",
    body: "anchored-parser allowlist resists lookalike/userinfo/port/traversal; validator reachability proven on chain.",
    visual: "6 hosts - reachability proven",
  },
  {
    key: "A6",
    icon: Activity,
    title: "Real-runtime tests",
    body: "22 Direct Mode tests run against the actual pinned GenVM runner, not a stub; CI green on every push.",
    visual: "22 / 22 passing",
  },
];

export default function SecurityDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Security hardening (A1-A6)"
          sub="Each enhancement is enforced by the deployed contract and backed by a live StudioNet transaction."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENH.map((e, i) => {
            const Icon = e.icon;
            return (
              <motion.div
                key={e.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/50 p-4 dark:bg-ink-800/60"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gl-gradient text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-bold text-gl-orange">{e.key}</span>
                  <span className="text-sm font-semibold">{e.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{e.body}</p>
                <div className="mt-3">
                  <Mono>{e.visual}</Mono>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={<Server className="h-5 w-5" />}
          title="A5 - Gateway reachability (on-chain validator probe)"
          sub="Proven against StudioNet by delivering to each host and observing whether validators could unanimously seal it."
        />
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left dark:bg-white/5">
              <tr>
                <th className="px-3 py-2 font-semibold">Host</th>
                <th className="px-3 py-2 font-semibold">Validator reachability</th>
                <th className="px-3 py-2 font-semibold">Detail</th>
                <th className="px-3 py-2 font-semibold">Proof</th>
              </tr>
            </thead>
            <tbody>
              {GATEWAY_REACHABILITY.map((g) => (
                <tr key={g.host} className="border-t border-white/10">
                  <td className="px-3 py-2 font-mono text-xs">{g.host}</td>
                  <td className="px-3 py-2">
                    {g.reachable === true && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <Check className="h-4 w-4" /> reachable
                      </span>
                    )}
                    {g.reachable === false && (
                      <span className="inline-flex items-center gap-1 text-rose-600">
                        <X className="h-4 w-4" /> not reachable
                      </span>
                    )}
                    {g.reachable === null && (
                      <span className="text-slate-400">allowlisted - unprobed</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{g.detail}</td>
                  <td className="px-3 py-2">
                    {g.tx && (
                      <a
                        className="inline-flex items-center gap-1 text-gl-orange hover:underline"
                        href={txUrl(g.tx)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        tx <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Honest outcome: only <Mono>raw.githubusercontent.com</Mono> is fetchable by today's
          validators. ipfs.io / gateway.ipfs.io / dweb.link are allowlisted but fail on chain
          (Cloudflare bot challenge), so the README states this plainly rather than implying
          they work.
        </p>
      </Card>

      <Card>
        <SectionTitle
          icon={<ExternalLink className="h-5 w-5" />}
          title="v1.3.0 on-chain proofs"
          sub="Every claim links to a finalized StudioNet transaction you can verify yourself."
        />
        <div className="grid gap-2">
          {SECURITY_PROOFS.map((p) => (
            <a
              key={p.label + p.hash}
              href={txUrl(p.hash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/50 px-4 py-3 transition hover:border-gl-orange/40 hover:bg-white/70 dark:bg-ink-800/50 dark:hover:bg-ink-800"
            >
              <span>
                <span className="block text-sm font-semibold">{p.label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{p.note}</span>
              </span>
              <span className="flex items-center gap-2">
                <Mono>{p.hash.slice(0, 10)}...{p.hash.slice(-6)}</Mono>
                <ArrowUpRight className="h-4 w-4 text-gl-orange" />
              </span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
