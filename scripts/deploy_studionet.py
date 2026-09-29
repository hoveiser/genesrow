#!/usr/bin/env python3
"""Stage A: deploy the canonical repo contract.py to GenLayer StudioNet and prove it landed.

- Reads GENLAYER_PRIVATE_KEY from the gitignored .env. The key is never printed,
  logged, or written anywhere.
- Deploys the exact repo bytes through genlayer-py (the CLI keystore is locked here).
- Waits for the deploy transaction to reach FINALIZED.
- Resolves the created contract address from the deploy record via the explorer JSON API.
- Confirms the source stored on-chain (gen_getContractCode) is byte-identical to the repo file.

Raw API output is saved under evidence/ so nothing is paraphrased or retyped.
"""
import base64
import json
import os
import pathlib
import sys
import time
import urllib.request

from dotenv import load_dotenv

from genlayer_py import create_account, create_client, studionet

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTRACT_FILE = ROOT / "contract.py"          # the one canonical copy (see README A8)
EVIDENCE = ROOT / "evidence"
EVIDENCE.mkdir(exist_ok=True)
EXPLORER = "https://explorer-studio.genlayer.com"   # StudioNet, chain id 61999
RPC = "https://studio.genlayer.com/api"
UA = {"User-Agent": "qoder-agent", "Content-Type": "application/json"}


def explorer_finalized_by_account(address: str, tx_hash: str, timeout_s: int = 900) -> dict:
    """StudioNet deploys are not served by the single-tx explorer route, so poll the
    account transaction list until the deploy is FINALIZED, then return its raw record
    (which carries the created contract address)."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            req = urllib.request.Request(
                f"{EXPLORER}/api/transactions?address={address}", headers=UA)
            txs = json.load(urllib.request.urlopen(req, timeout=60))["transactions"]
            for t in txs:
                if t["hash"].lower() == tx_hash.lower() and t.get("status") == "FINALIZED":
                    return t
        except Exception:
            pass
        time.sleep(6)
    raise RuntimeError(f"deploy {tx_hash} not FINALIZED within {timeout_s}s")


def main() -> int:
    load_dotenv(ROOT / ".env")
    key = os.environ.get("GENLAYER_PRIVATE_KEY", "")
    if not key:
        print("GENLAYER_PRIVATE_KEY missing from .env; aborting.")
        return 2
    account = create_account(key)
    print("deployer address:", account.address)
    client = create_client(chain=studionet, account=account)

    source_bytes = CONTRACT_FILE.read_bytes()
    code = source_bytes.decode("utf-8")
    print(f"submitting deploy for {len(source_bytes)} bytes of {CONTRACT_FILE.name} ...")
    deploy_txid = client.deploy_contract(code=code)
    print("deploy consensus txid:", deploy_txid)

    tx = explorer_finalized_by_account(account.address, deploy_txid)
    (EVIDENCE / "deploy_explorer_tx.json").write_text(json.dumps(tx, indent=2))
    contract = (tx.get("data") or {}).get("contract_address") or tx.get("to_address")
    print("deploy tx status:", tx.get("status"))
    print("resolved contract address:", contract)
    if not contract:
        print("could not resolve contract address; see evidence/deploy_explorer_tx.json")
        return 3

    # byte-match: fetch stored source over RPC and compare to repo bytes
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "gen_getContractCode",
                          "params": [contract]}).encode()
    req = urllib.request.Request(RPC, data=payload, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        resp = json.load(r)
    (EVIDENCE / "get_contract_code.json").write_text(json.dumps(resp, indent=2))
    stored_bytes = base64.b64decode(resp["result"])
    (EVIDENCE / "stored_source.bin").write_bytes(stored_bytes)
    match = stored_bytes == source_bytes
    print(f"byte-match stored vs repo: {match} "
          f"(stored {len(stored_bytes)}B, repo {len(source_bytes)}B)")

    (EVIDENCE / "deploy.json").write_text(json.dumps({
        "network": "studionet (chain id 61999)",
        "explorer": EXPLORER,
        "deployer": account.address,
        "deploy_txid": deploy_txid,
        "contract_address": contract,
        "source_byte_match": match,
        "repo_bytes": len(source_bytes),
        "stored_bytes": len(stored_bytes),
    }, indent=2))
    print("\nOK ->", contract)
    return 0 if match else 4


if __name__ == "__main__":
    sys.exit(main())
