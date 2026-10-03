import { useMemo, useState } from "react";
import { Banknote, ShieldAlert, UserCheck, Timer, Check, X } from "lucide-react";
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
  MAX_WINDOW_SEC,
  MIN_WINDOW_SEC,
  isValidPartyAddress,
  windowCheck,
} from "../lib/contract";
import { useEscrows } from "../lib/store";

const fmt = (s: number) =>
  s >= 86400 ? `${(s / 86400).toFixed(s % 86400 ? 1 : 0)} days` :
  s >= 3600 ? `${(s / 3600).toFixed(s % 3600 ? 1 : 0)} hours` :
  s >= 60 ? `${(s / 60).toFixed(s % 60 ? 1 : 0)} min` : `${s}s`;

const SAMPLE_CLIENT = "0x3de43AA2f7162c80af98abe78222aE0Cdf83c506";
const SAMPLE_FREELANCER = "0x702a76Db4CBB42a1C7cCAe70AF72e7346B5Fc0e8";

export default function CreateEscrow() {
  const { createEscrow } = useEscrows();
  const toast = useToast();

  const [client, setClient] = useState(SAMPLE_CLIENT);
  const [freelancer, setFreelancer] = useState(SAMPLE_FREELANCER);
  const [approve, setApprove] = useState("3600");
  const [appeal, setAppeal] = useState("86400");
  const [desc, setDesc] = useState("Fix the GenLayer escrow settlement edge case");
  const [criteria, setCriteria] = useState(
    "Python deliverable defining GenEscrow with mark_delivered, resolve and finalize methods using sha256",
  );
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [path, setPath] = useState("");
  const [amount, setAmount] = useState("1");
  const [createdId, setCreatedId] = useState<number | null>(null);

  const aSec = Number(approve);
  const bSec = Number(appeal);
  const wcA = useMemo(() => windowCheck(aSec), [aSec]);
  const wcB = useMemo(() => windowCheck(bSec), [bSec]);
  const addrOk = useMemo(() => isValidPartyAddress(freelancer, client), [freelancer, client]);
  const criteriaOk = criteria.trim().length > 0;

  const valid = wcA.ok && wcB.ok && addrOk && criteriaOk && Number(amount) > 0;

  const submit = () => {
    const res = createEscrow({
      client,
      freelancer,
      job_description: desc,
      acceptance_criteria: criteria,
      expected_owner: owner,
      expected_repo: repo,
      expected_path: path,
      approve_window_sec: aSec,
      appeal_window_sec: bSec,
      amount: Math.round(Number(amount) * 1e18),
    });
    if (res.ok && res.data) {
      setCreatedId(res.data.id);
      toast("success", res.message);
    } else {
      toast("error", res.message);
    }
  };

  return (
    <Card>
      <SectionTitle
        icon={<Banknote className="h-5 w-5" />}
        title="1 - Create Escrow"
        sub={
          <>
            Demonstrates <b>A1 window bounds</b> and <b>A4 address validation</b>. Validation runs
            through the contract's own rules; submitting applies the same revert order as
            <Mono>create_escrow</Mono> on chain.
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Client address" hint="The payer (this session's signer).">
          <TextInput value={client} onChange={(e) => setClient(e.target.value)} className="font-mono" />
        </Field>
        <Field
          label="Freelancer address"
          ok={addrOk ? "Valid: non-zero, well-formed, distinct from client" : null}
          error={addrOk ? null : "Invalid freelancer address (format / zero / equals client)"}
        >
          <TextInput value={freelancer} onChange={(e) => setFreelancer(e.target.value)} className="font-mono" />
        </Field>

        <Field
          label={`Approve window (seconds)`}
          hint={`Allowed ${fmt(MIN_WINDOW_SEC)} to ${fmt(MAX_WINDOW_SEC)}`}
          ok={wcA.ok ? `OK: ${fmt(aSec)}` : null}
          error={wcA.ok ? null : wcA.message}
        >
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-gl-purple" />
            <TextInput type="number" value={approve} onChange={(e) => setApprove(e.target.value)} />
          </div>
        </Field>

        <Field
          label={`Appeal window (seconds)`}
          hint={`Allowed ${fmt(MIN_WINDOW_SEC)} to ${fmt(MAX_WINDOW_SEC)}`}
          ok={wcB.ok ? `OK: ${fmt(bSec)}` : null}
          error={wcB.ok ? null : wcB.message}
        >
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-gl-purple" />
            <TextInput type="number" value={appeal} onChange={(e) => setAppeal(e.target.value)} />
          </div>
        </Field>

        <div className="md:col-span-2">
          <Field label="Job description">
            <TextArea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field
            label="Acceptance criteria (required)"
            hint="Drives the AI adjudication prompt. Keep it specific."
            error={criteriaOk ? null : "Acceptance criteria required"}
          >
            <TextArea rows={2} value={criteria} onChange={(e) => setCriteria(e.target.value)} />
          </Field>
        </div>

        <Field label="Expected owner (optional GitHub binding)">
          <TextInput value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="hoveiser" />
        </Field>
        <Field label="Expected repo (optional)">
          <TextInput value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="genesrow" />
        </Field>
        <Field label="Expected path (optional)">
          <TextInput value={path} onChange={(e) => setPath(e.target.value)} placeholder="demo/deliverable.py" />
        </Field>
        <Field label="Amount (GEN, payable)">
          <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={!valid}>
          Create Escrow
        </Button>
        {!valid && (
          <span className="inline-flex items-center gap-1 text-sm text-rose-600">
            <ShieldAlert className="h-4 w-4" /> Fix the highlighted fields to enable creation
          </span>
        )}
        {createdId !== null && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm">
            <Check className="h-4 w-4 text-emerald-500" />
            Created escrow <Mono>#{createdId}</Mono> <StatusPill status="funded" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (simulated state; real on-chain create proofs below)
            </span>
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
        <Rule ok={wcA.ok} label="A1 approve window within [60s, 7d]" />
        <Rule ok={wcB.ok} label="A1 appeal window within [60s, 7d]" />
        <Rule ok={addrOk} label="A4 freelancer address valid" />
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        <X className="mr-1 inline h-3 w-3 text-rose-500" />
        Try it: set the appeal window to <Mono>315360000</Mono> (10 years) or the freelancer to the zero address -
        both are the exact reverts proven on StudioNet in the Security tab.
      </p>
    </Card>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 " +
        (ok ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")
      }
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      <UserCheck className="h-3.5 w-3.5 opacity-60" />
      {label}
    </span>
  );
}
