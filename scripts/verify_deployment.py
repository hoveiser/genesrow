#!/usr/bin/env python3
"""Verify the deployed StudioNet source is byte-identical to local contract.py.

Fetches the on-chain source via the gen_getContractCode JSON-RPC method (real User-Agent),
compares it byte-for-byte to contract.py, and writes evidence/verify_deployment.json. This
is the reproducible check a reviewer runs for "deployed source matches local contract.py";
it performs no state change and moves no funds.
"""
import base64
import datetime
import hashlib
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
RPC = "https://studio.genlayer.com/api"
HEADERS = {"Content-Type": "application/json", "User-Agent": "qoder-agent"}


def get_contract_code(address: str) -> bytes:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "gen_getContractCode",
                       "params": [address]}).encode()
    req = urllib.request.Request(RPC, data=body, headers=HEADERS)
    result = json.load(urllib.request.urlopen(req, timeout=60)).get("result")
    if isinstance(result, dict):
        result = result.get("code") or result.get("contract_code") or result
    return base64.b64decode(result) if isinstance(result, str) else json.dumps(result).encode()


def main() -> int:
    contract = json.load(open(ROOT / "evidence" / "deploy.json"))["contract_address"]
    deployed = get_contract_code(contract)
    local = (ROOT / "contract.py").read_bytes()
    out = {
        "verified_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "network": "studionet (chain id 61999)",
        "contract_address": contract,
        "method": "gen_getContractCode via https://studio.genlayer.com/api",
        "deployed_bytes": len(deployed),
        "local_bytes": len(local),
        "deployed_sha256": hashlib.sha256(deployed).hexdigest(),
        "local_sha256": hashlib.sha256(local).hexdigest(),
        "byte_match": deployed == local,
    }
    (ROOT / "evidence" / "verify_deployment.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))
    return 0 if out["byte_match"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
