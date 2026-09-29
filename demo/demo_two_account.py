#!/usr/bin/env python3
"""GenEscrow two-account demo (client + freelancer) run live against StudioNet.

A reviewer can run this end to end in a few minutes. It walks one full escrow lifecycle
with two DIFFERENT accounts and prints each step:

  1. client (the .env funded account) creates a funded escrow paying 1 GEN to a fresh
     freelancer account, agreeing on a GitHub-pinned deliverable and its acceptance criteria
  2. the freelancer marks the deliverable as delivered; the contract seals the raw bytes
  3. the client requests an AI review; real validators re-fetch, re-seal, and adjudicate
  4. resolve reaches a verdict; the losing party finalizes and the winner is PAID

The freelancer is a brand-new, unfunded account; StudioNet is gasless, so it needs no ETH.
Its GEN balance moving from 0 to the escrow amount at the end is the real settlement proof.

Prereqs:
  pip install "genlayer-test==0.29.2" python-dotenv   # pulls genlayer-py
  .env at the repo root with GENLAYER_PRIVATE_KEY (a funded StudioNet account)

Config (env vars, all optional):
  GENESCROW_CONTRACT  deployed contract address (default: read evidence/deploy.json)
  GENEDELIVER_SHA     commit holding demo/deliverable.py (default: current HEAD on origin/main)

Usage:
  python demo/demo_two_account.py
"""
import json
import os
import pathlib
import subprocess
import sys

from dotenv import load_dotenv

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from lib_studionet import GEN, Escrow, balance_of, make_client, make_fresh_account

EVIDENCE = ROOT / "evidence"
VALUE = 1 * GEN
DELIVER_PATH = "demo/deliverable.py"
# criteria the crafted artifact genuinely MEETS, so the honest verdict is APPROVED
CRITERIA = "The deliverable must define a function named submit_timesheet"


def resolve_contract() -> str:
    env = os.environ.get("GENESCROW_CONTRACT")
    if env:
        return env
    return json.load(open(EVIDENCE / "deploy.json"))["contract_address"]


def resolve_sha() -> str:
    env = os.environ.get("GENEDELIVER_SHA")
    if env:
        return env
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=str(ROOT), text=True).strip()


def main() -> int:
    load_dotenv(ROOT / ".env")
    key = os.environ.get("GENLAYER_PRIVATE_KEY")
    if not key:
        print("GENLAYER_PRIVATE_KEY missing from .env")
        return 2
    client, deployer = make_client(key)
    freelancer = make_fresh_account()
    contract = resolve_contract()
    sha = resolve_sha()
    url = f"https://raw.githubusercontent.com/hoveiser/genesrow/{sha}/{DELIVER_PATH}"

    esc = Escrow(client, contract, evidence_dir=EVIDENCE / "demo_txs")
    esc.lock(deployer)
    txs = []
    print("=" * 70)
    print("GenEscrow live two-account demo (StudioNet, chain id 61999)")
    print(f"contract   : {contract}")
    print(f"client     : {deployer.address}")
    print(f"freelancer : {freelancer.address} (fresh, unfunded)")
    print("=" * 70)

    # find the next escrow id the new create will use (contract may already hold history)
    def free_id():
        i = 1
        while json.loads(esc.read("get_escrow", [i])) != {}:
            i += 1
        return i
    eid = free_id()

    print(f"\n[1/5] client funds escrow #{eid} with 1 GEN")
    r = esc.write("create", "create_escrow",
                  [freelancer.address, "timesheet module", CRITERIA,
                   "hoveiser", "genesrow", DELIVER_PATH, 3600, 3600], value=VALUE)
    txs.append(r)
    print(f"      tx {r['txid']}  ok={r['ok']}  total_locked={int(esc.read('get_total_locked', [])) // GEN}gen")

    print(f"\n[2/5] freelancer delivers pinned artifact and the contract seals the bytes")
    print(f"      url {url}")
    r = esc.write("mark_delivered", "mark_delivered", [eid, url], account=freelancer)
    txs.append(r)
    e = json.loads(esc.read("get_escrow", [eid]))
    print(f"      tx {r['txid']}  status={e['status']}  evidence_hash={e['evidence_hash']}")

    print(f"\n[3/5] client requests an AI review (real validators re-fetch and re-seal)")
    r = esc.write("request_ai_review", "request_ai_review", [eid]); txs.append(r)
    print(f"      tx {r['txid']}  ok={r['ok']}")

    print(f"\n[4/5] resolve: AI arbitration reaches a verdict")
    r = esc.write("resolve", "resolve", [eid]); txs.append(r)
    e = json.loads(esc.read("get_escrow", [eid]))
    print(f"      tx {r['txid']}  verdict={e['ai_verdict']}  winner={e['winner']}")
    print(f"      reasoning: {str(e['ai_reasoning'])[:160]}")

    print(f"\n[5/5] losing party finalizes; winner is paid on chain")
    winner = e["winner"]
    recipient = freelancer.address if winner == "freelancer" else e["client"]
    loser_acct = deployer if winner == "freelancer" else freelancer
    before = balance_of(recipient)
    r = esc.write("finalize", "finalize", [eid], account=loser_acct); txs.append(r)
    after = balance_of(recipient)
    print(f"      tx {r['txid']}  recipient {recipient}")
    print(f"      recipient GEN balance: {before // GEN} -> {after // GEN} "
          f"(delta {(after - before) // GEN} gen)")

    (EVIDENCE / "demo.json").write_text(json.dumps({
        "contract": contract, "sha": sha, "client": deployer.address,
        "freelancer": freelancer.address, "escrow_id": eid,
        "recipient": recipient, "balance_before": before, "balance_after": after,
        "txs": [{k: t[k] for k in ("name", "txid", "status", "ok")} for t in txs],
    }, indent=2))
    print("\nDemo record written to evidence/demo.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
