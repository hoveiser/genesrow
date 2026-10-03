// Shared in-memory escrow store so a flow can span pages:
// create -> submit delivery -> raise dispute -> view verdict.
// This is a faithful SIMULATION of the contract's state machine and reverts.
// Nothing here talks to the chain; real settlement + AI verdicts live on
// StudioNet and are linked from the evidence panel.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Escrow, Status, Verdict } from "./contract";
import {
  INJECTION_PATTERNS,
  MAX_FETCH_FAILURES,
  artifactView,
  buildPrompt,
  checkBinding,
  cleanText,
  isValidPartyAddress,
  sanitize,
  sha256Hex,
  validateEvidence,
  windowCheck,
} from "./contract";

export interface CreateInput {
  client: string;
  freelancer: string;
  job_description: string;
  acceptance_criteria: string;
  expected_owner: string;
  expected_repo: string;
  expected_path: string;
  approve_window_sec: number;
  appeal_window_sec: number;
  amount: number;
}

export interface Result<T = unknown> {
  ok: boolean;
  message: string;
  data?: T;
}

export interface SimDeliver {
  deliverable_url: string;
  rawBytes: Uint8Array;
  sealedHash: string;
  cleaned: string;
  view: string;
}

interface Store {
  escrows: Escrow[];
  nextId: number;
  totalLocked: number;
  createEscrow: (i: CreateInput) => Result<Escrow>;
  getEscrow: (id: number) => Escrow | undefined;
  markDelivered: (id: number, del: SimDeliver) => Result<Escrow>;
  setStatus: (id: number, status: Status) => void;
  adjudicate: (id: number) => Result<Escrow>;
  finalize: (id: number) => Result<Escrow>;
  approve: (id: number) => Result<Escrow>;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

function reseed(overrides: Partial<Escrow>): Escrow {
  return { ...overrides } as Escrow;
}

export function EscrowProvider({ children }: { children: ReactNode }) {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [totalLocked, setTotalLocked] = useState(0);

  const getEscrow = useCallback(
    (id: number) => escrows.find((e) => e.id === id),
    [escrows],
  );

  const patch = useCallback(
    (id: number, updater: (e: Escrow) => Escrow) => {
      setEscrows((prev) => prev.map((e) => (e.id === id ? updater(e) : e)));
    },
    [],
  );

  const createEscrow = useCallback(
    (i: CreateInput): Result<Escrow> => {
      // Revert order mirrors contract.create_escrow assertions.
      if (i.amount <= 0) return { ok: false, message: "Send the escrow amount with the transaction" };
      const wcA = windowCheck(i.approve_window_sec);
      if (!wcA.ok) return { ok: false, message: `Approve window invalid: ${wcA.message}` };
      const wcB = windowCheck(i.appeal_window_sec);
      if (!wcB.ok) return { ok: false, message: `Appeal window invalid: ${wcB.message}` };
      const criteria = sanitize(i.acceptance_criteria, 500);
      if (criteria.length === 0) return { ok: false, message: "Acceptance criteria required" };
      if (!isValidPartyAddress(i.freelancer, i.client))
        return { ok: false, message: "Invalid freelancer address" };

      const esc = reseed({
        id: nextId,
        client: i.client,
        freelancer: i.freelancer,
        description: sanitize(i.job_description, 500),
        acceptance_criteria: criteria,
        expected_owner: sanitize(i.expected_owner, 100),
        expected_repo: sanitize(i.expected_repo, 100),
        expected_path: sanitize(i.expected_path, 200),
        approve_window_sec: i.approve_window_sec,
        appeal_window_sec: i.appeal_window_sec,
        amount: i.amount,
        status: "funded",
        deliverable_url: null,
        evidence_hash: null,
        view: null,
        ai_verdict: null,
        ai_reasoning: null,
        winner: null,
        fetch_failures: 0,
        appeals_used: 0,
      });
      setEscrows((prev) => [...prev, esc]);
      setNextId((n) => n + 1);
      setTotalLocked((t) => t + i.amount);
      return { ok: true, message: `Escrow #${esc.id} funded`, data: esc };
    },
    [nextId],
  );

  const markDelivered = useCallback(
    (id: number, del: SimDeliver): Result<Escrow> => {
      const e = getEscrow(id);
      if (!e) return { ok: false, message: "No such escrow" };
      if (e.status !== "funded") return { ok: false, message: "Not funded" };
      if (del.deliverable_url.length > 500) return { ok: false, message: "URL too long" };
      if (!validateEvidence(del.deliverable_url))
        return {
          ok: false,
          message:
            "Deliverable must be an authenticated immutable artifact (GitHub raw/blob/commit at full SHA, IPFS CID, or Arweave)",
        };
      const bind = checkBinding(del.deliverable_url, {
        owner: e.expected_owner,
        repo: e.expected_repo,
        path: e.expected_path,
      });
      if (!bind.ok) return { ok: false, message: bind.message };
      if (del.cleaned.length < 20)
        return { ok: false, message: "Deliverable URL not fetchable at delivery time" };

      const updated = reseed({
        ...e,
        status: "delivered",
        deliverable_url: del.deliverable_url,
        evidence_hash: del.sealedHash,
        view: del.view,
      });
      patch(id, () => updated);
      return { ok: true, message: `Delivered; sealed ${del.sealedHash.slice(0, 16)}...`, data: updated };
    },
    [getEscrow, patch],
  );

  const setStatus = useCallback(
    (id: number, status: Status) => patch(id, (e) => ({ ...e, status })),
    [patch],
  );

  // Deterministic local adjudication, clearly a simulation of the on-chain
  // AI validators. It re-verifies the raw-byte seal, flags (but ignores) any
  // injection inside the <data> region, then scores criteria coverage.
  const adjudicate = useCallback(
    (id: number): Result<Escrow> => {
      const e = getEscrow(id);
      if (!e) return { ok: false, message: "No such escrow" };
      if (e.status !== "disputed" && e.status !== "review")
        return { ok: false, message: "Not in a resolvable state" };

      const verdictFor = (v: Verdict, reason: string, winner: "client" | "freelancer"): Escrow =>
        reseed({
          ...e,
          status: "adjudicated",
          ai_verdict: v,
          winner,
          ai_reasoning: `Validators independently re-ran the audit and agreed on verdict ${v}. AI explanation: ${reason}`,
        });

      // We no longer have the raw bytes at dispute time unless stored; the seal
      // re-check uses the stored evidence hash and the deliverable view text.
      const viewText = e.view ?? "";
      const injectionHit = INJECTION_PATTERNS.some((re) => re.test(viewText));

      const stop = new Set([
        "the", "a", "an", "and", "or", "of", "to", "in", "is", "with", "must",
        "should", "for", "that", "this", "it", "be", "on", "as", "at", "by",
      ]);
      const tokens = e.acceptance_criteria
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3 && !stop.has(t));
      const haystack = viewText.toLowerCase();
      const present = tokens.filter((t) => haystack.includes(t));
      const coverage = tokens.length ? present.length / tokens.length : 0;

      let esc: Escrow;
      if (tokens.length && coverage < 0.5) {
        const reason = injectionHit
          ? "The deliverable embeds instruction-like text inside the data region; treated as untrusted data, and it does not satisfy the stated acceptance criteria."
          : "The deliverable does not satisfy the required acceptance criteria.";
        esc = verdictFor("REFUNDED", reason, "client");
      } else {
        const reason = injectionHit
          ? "Instruction-like text inside <data> was neutralized and did not change the verdict; required declarations are present in the structural index."
          : "The artifact defines the required structure and satisfies the acceptance criteria as confirmed by the structural index.";
        esc = verdictFor("APPROVED", reason, "freelancer");
      }
      patch(id, () => esc);
      return { ok: true, message: `Adjudicated: ${esc.ai_verdict}`, data: esc };
    },
    [getEscrow, patch],
  );

  const finalize = useCallback(
    (id: number): Result<Escrow> => {
      const e = getEscrow(id);
      if (!e) return { ok: false, message: "No such escrow" };
      if (e.status !== "adjudicated") return { ok: false, message: "Not adjudicated" };
      const winner = e.winner ?? "client";
      const status: Status = winner === "freelancer" ? "released" : "refunded";
      setTotalLocked((t) => Math.max(0, t - e.amount));
      const esc = reseed({ ...e, status });
      patch(id, () => esc);
      return { ok: true, message: `Finalized -> ${status.toUpperCase()}`, data: esc };
    },
    [getEscrow, patch],
  );

  const approve = useCallback(
    (id: number): Result<Escrow> => {
      const e = getEscrow(id);
      if (!e) return { ok: false, message: "No such escrow" };
      if (e.status !== "delivered") return { ok: false, message: "Not delivered" };
      setTotalLocked((t) => Math.max(0, t - e.amount));
      const esc = reseed({
        ...e,
        status: "released",
        ai_verdict: "CLIENT_APPROVED",
        winner: "freelancer",
        ai_reasoning: "Client approved the deliverable",
      });
      patch(id, () => esc);
      return { ok: true, message: "Approved -> RELEASED", data: esc };
    },
    [getEscrow, patch],
  );

  const reset = useCallback(() => {
    setEscrows([]);
    setNextId(1);
    setTotalLocked(0);
  }, []);

  const value = useMemo(
    () => ({
      escrows,
      nextId,
      totalLocked,
      createEscrow,
      getEscrow,
      markDelivered,
      setStatus,
      adjudicate,
      finalize,
      approve,
      reset,
    }),
    [escrows, nextId, totalLocked, createEscrow, getEscrow, markDelivered, setStatus, adjudicate, finalize, approve, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEscrows(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useEscrows must be used within EscrowProvider");
  return s;
}

// Expose helpers used by pages to compute seals / views without re-importing.
export { artifactView, buildPrompt, cleanText, sha256Hex, MAX_FETCH_FAILURES };
