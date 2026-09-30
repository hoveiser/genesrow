#!/usr/bin/env python3
"""Stage C: verify every recorded transaction hash against the StudioNet explorer JSON API.

Reads hashes ONLY from the raw evidence records written by the deploy/scenario scripts
(never from a hand-typed list), re-fetches each via the explorer JSON API with a real
User-Agent, confirms FINALIZED, and saves the raw response under evidence/verified/ so the
on-chain trail is reproducible. The explorer HTML is an empty client shell, so all evidence
here comes from the JSON API.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib_studionet import EXPLORER, get_json

ROOT = pathlib.Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / "evidence"
VERIFIED = EVIDENCE / "verified"
VERIFIED.mkdir(exist_ok=True)


def collect_txids():
    txids = []
    deploy = json.load(open(EVIDENCE / "deploy.json"))
    txids.append(("deploy", deploy["deploy_txid"], deploy["contract_address"]))
    spath = EVIDENCE / "scenario.json"
    if spath.exists():
        for t in json.load(open(spath)).get("txs", []):
            txids.append((t["name"], t["txid"], None))
    dpath = EVIDENCE / "demo.json"
    if dpath.exists():
        for t in json.load(open(dpath)).get("txs", []):
            txids.append(("demo_" + t["name"], t["txid"], None))
    gpath = EVIDENCE / "ipfs_gateways.json"
    if gpath.exists():
        for t in json.load(open(gpath)).get("results", []):
            txids.append(("gateway_" + t["label"], t["deliver_txid"], None))
    return txids


def main() -> int:
    summary = []
    all_ok = True
    for name, txid, expect_contract in collect_txids():
        try:
            d = get_json(f"{EXPLORER}/api/transactions/{txid}")
        except Exception as e:
            print(f"  {name:22s} {txid}  FETCH ERROR {e}")
            all_ok = False
            continue
        tx = d.get("transaction") or {}
        status = tx.get("status")
        (VERIFIED / f"{name}_{txid[:12]}.json").write_text(json.dumps(d, indent=2))
        consensus = (tx.get("consensus_data") or {}).get("consensus_status")
        row = {"name": name, "txid": txid, "status": status, "consensus_status": consensus}
        summary.append(row)
        ok = status == "FINALIZED"
        all_ok = all_ok and ok
        print(f"  {name:22s} {txid}  status={status} consensus={consensus} "
              f"raw_saved=evidence/verified/{name}_{txid[:12]}.json  {'OK' if ok else 'NOT FINALIZED'}")
    (VERIFIED / "verification_summary.json").write_text(json.dumps(summary, indent=2))
    print(f"\nverified {len(summary)} transaction(s); all FINALIZED: {all_ok}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
