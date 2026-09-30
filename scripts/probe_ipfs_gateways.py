#!/usr/bin/env python3
"""On-chain reachability probe for the IPFS entries in the evidence-host allowlist.

The allowlist includes ipfs.io, gateway.ipfs.io, and dweb.link. Their reachability was
previously only checked from this build environment's own egress, which is the same class
of gap that made FairPay's original ipfs.io-only design fail on chain: a gateway can answer
a laptop curl yet be unreachable (or non-deterministic) from the validator network.

This probe settles the question on chain. The contract seals evidence with
``_seal_hash = strict_eq(get_hash)``, so a ``mark_delivered`` that FINALIZES with a real
64-hex ``evidence_hash`` proves every validator independently fetched the URL and agreed
on the exact sha256 of the raw bytes (reachable AND byte-stable). A delivery that reverts
("not fetchable") or fails to reach consensus proves the validator network cannot reliably
fetch that gateway. A known-good control (the commit-pinned raw.githubusercontent URL that
already finalized in the main scenario) is run under identical conditions so a REACHABLE
verdict here is comparable to the FairPay gateway.pinata.cloud proof.

Every transaction hash is copied from raw explorer JSON (saved under evidence/txs), never
retyped. The private key is read from .env and never printed or logged.
"""
import json
import os
import pathlib
import re
import sys

from dotenv import load_dotenv

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib_studionet import GEN, Escrow, make_client, make_fresh_account

ROOT = pathlib.Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / "evidence"
EVIDENCE.mkdir(exist_ok=True)

# One content-addressed object, requested through each of the three gateways. All three
# serve identical bytes for the same CID when they serve it at all, so a difference in the
# on-chain result is a reachability difference, not a content difference.
IPFS_PATH = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme"
PROBE_HOSTS = ["ipfs.io", "gateway.ipfs.io", "dweb.link"]
VALUE = 1 * GEN
HEX64 = re.compile(r"\A[0-9a-fA-F]{64}\Z")


def read_back_detail(evidence_dir, name, txid):
    """Pull the real revert reason from the saved explorer JSON (no new submission).

    A consensus-unanimous revert shows up as an AssertionError traceback with
    nondet_disagree=null, which is a stronger finding than an ambiguous no-consensus:
    every validator independently failed to fetch and agreed on it.
    """
    for p in pathlib.Path(evidence_dir).glob(f"{name}_{txid[:12]}.json"):
        tx = json.loads(p.read_text())
        lr = ((tx.get("consensus_data") or {}).get("leader_receipt") or [{}])[0]
        stderr = (lr.get("genvm_result") or {}).get("stderr", "")
        reason = ""
        for line in stderr.split("\n"):
            if "Error" in line or "assert" in line:
                reason = line.strip()
        return {"nondet_disagree": lr.get("nondet_disagree"), "revert_detail": reason[:200]}
    return {}


def classify(deliver_tx, escrow_json, detail=None):
    """Map a mark_delivered outcome to a reachability verdict + human reason."""
    detail = detail or {}
    status = escrow_json.get("status")
    seal = escrow_json.get("evidence_hash")
    if deliver_tx["ok"] and status == "delivered" and seal and HEX64.match(str(seal)):
        return "REACHABLE", f"validators agreed on seal {str(seal)[:16]}..."
    rv = detail.get("revert_detail", "")
    if "not fetchable" in rv:
        if detail.get("nondet_disagree") in (None, "null"):
            return "NOT_REACHABLE", (
                "consensus-unanimous revert: Deliverable URL not fetchable at delivery "
                "time (nondet_disagree=null; every validator failed to fetch and agreed)")
        return "NOT_REACHABLE", "revert: URL not fetchable, validators disagreed (no consensus)"
    msg = str(deliver_tx.get("result") or "")[:200]
    if deliver_tx["ok"] is False:
        return "NOT_REACHABLE", f"delivery did not finalize clean: exec={deliver_tx['execution_result']} {rv or msg}"
    return "NOT_REACHABLE", f"unexpected state status={status} seal={seal} {rv or msg}"


def run_one(esc, deployer, label, url, control=False):
    worker = make_fresh_account()
    print(f"\n[{label}] deliver via mark_delivered  url={url}")
    locked0 = int(esc.read("get_total_locked", []))
    eid = 1
    while json.loads(esc.read("get_escrow", [eid])) not in ({}, None):
        eid += 1
    esc.write(f"{label}::create", "create_escrow",
              [worker.address, "gateway reachability probe",
               "The deliverable must be a text artifact",
               "", "", "", 3600, 3600], value=VALUE)
    r = esc.write(f"{label}::deliver", "mark_delivered", [eid, url], account=worker)
    e = json.loads(esc.read("get_escrow", [eid]))
    detail = read_back_detail(esc.evidence_dir, f"{label}::deliver", r["txid"])
    verdict, reason = classify(r, e, detail)
    print(f"      deliver tx={r['txid']} ok={r['ok']} exec={r['execution_result']}")
    print(f"      escrow status={e['status']} seal={e['evidence_hash']}")
    print(f"      => {verdict}: {reason}")

    # Cleanup so the probe leaves no value locked: approve a delivered control (releases to
    # the throwaway freelancer), cancel an undelivered probe (refunds the client).
    if e["status"] == "delivered":
        esc.write(f"{label}::approve", "approve", [eid])
    elif e["status"] == "funded":
        esc.write(f"{label}::cancel", "cancel", [eid])

    return {
        "label": label, "control": control, "url": url, "escrow_id": eid,
        "deliver_txid": r["txid"], "deliver_status": r["status"],
        "deliver_ok": r["ok"], "execution_result": r["execution_result"],
        "escrow_status_after": e["status"], "evidence_hash": e["evidence_hash"],
        "nondet_disagree": detail.get("nondet_disagree"),
        "revert_detail": detail.get("revert_detail"),
        "verdict": verdict, "reason": reason,
    }


def main() -> int:
    load_dotenv(ROOT / ".env")
    key = os.environ["GENLAYER_PRIVATE_KEY"]
    client, deployer = make_client(key)
    contract = json.load(open(EVIDENCE / "deploy.json"))["contract_address"]

    esc = Escrow(client, contract, evidence_dir=EVIDENCE / "txs")
    esc.lock(deployer)
    print(f"contract {contract}\nclient(deployer) {deployer.address}")

    sha = json.load(open(EVIDENCE / "scenario.json")).get("deliver_sha")
    results = []
    if sha:
        control_url = f"https://raw.githubusercontent.com/hoveiser/genesrow/{sha}/demo/deliverable.py"
        results.append(run_one(esc, deployer, "CONTROL-raw.github", control_url, control=True))

    for host in PROBE_HOSTS:
        results.append(run_one(esc, deployer, host, f"https://{host}/ipfs/{IPFS_PATH}"))

    out = {
        "contract": contract,
        "ipfs_object": IPFS_PATH,
        "method": ("mark_delivered seals via strict_eq; FINALIZED delivery with a real "
                   "evidence_hash means all validators fetched and agreed on the raw-byte hash"),
        "results": results,
        "reachable": [r["label"] for r in results if r["verdict"] == "REACHABLE"],
        "not_reachable": [r["label"] for r in results if r["verdict"] != "REACHABLE"],
    }
    (EVIDENCE / "ipfs_gateways.json").write_text(json.dumps(out, indent=2))

    print("\n=== summary ===")
    for r in results:
        tag = " (control)" if r["control"] else ""
        print(f"  {r['verdict']:14s} {r['label']}{tag}")
    ipfs = [r for r in results if not r["control"]]
    if all(r["verdict"] != "REACHABLE" for r in ipfs):
        print("\nNo allowlisted IPFS gateway finalized a delivery from the validator network.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
