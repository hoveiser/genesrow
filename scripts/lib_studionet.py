#!/usr/bin/env python3
"""Shared StudioNet helpers for the GenEscrow on-chain scripts.

Value-bearing calls go through genlayer-py (the CLI keystore is locked in this
environment). Contract addresses and transaction hashes are always copied from raw
explorer JSON records, never retyped. The private key is read from .env and never
printed, logged, or stored.
"""
import json
import time
import urllib.error
import urllib.request

from genlayer_py import create_account, create_client, generate_private_key, studionet

EXPLORER = "https://explorer-studio.genlayer.com"   # StudioNet, chain id 61999
RPC = "https://studio.genlayer.com/api"
GEN = 10**18
UA = {"User-Agent": "qoder-agent", "Content-Type": "application/json"}


def get_json(url: str):
    req = urllib.request.Request(url, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=60))


def balance_of(address: str) -> int:
    try:
        d = get_json(f"{EXPLORER}/api/address/{address}")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return 0
        raise
    return int(d.get("balance", 0))


def execution_result(tx: dict):
    lr = (tx.get("consensus_data") or {}).get("leader_receipt") or []
    if lr and isinstance(lr, list):
        r0 = lr[0]
        return r0.get("execution_result"), r0.get("result")
    return None, None


def tx_ok(tx: dict) -> bool:
    er, _ = execution_result(tx)
    return str(er).upper() in ("SUCCESS", "OK", "1")


def wait_finalized(txid: str, name: str, evidence_dir=None, timeout_s: int = 900) -> dict:
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        try:
            d = get_json(f"{EXPLORER}/api/transactions/{txid}")
            tx = d.get("transaction")
            if tx:
                last = tx
                if tx.get("status") == "FINALIZED":
                    if evidence_dir is not None:
                        (evidence_dir / f"{name}_{txid[:12]}.json").write_text(
                            json.dumps(tx, indent=2))
                    return tx
        except Exception as e:
            last = {"error": str(e)}
        time.sleep(6)
    raise RuntimeError(f"tx {name} {txid} not FINALIZED in {timeout_s}s; last={str(last)[:160]}")


class Escrow:
    """Thin wrapper over a deployed GenEscrow instance with FINALIZED write/read."""

    def __init__(self, client, contract: str, evidence_dir=None):
        self.client = client
        self.contract = contract
        self.evidence_dir = evidence_dir

    def write(self, name: str, fn: str, args, account=None, value: int = 0):
        acct = account or self.client_account()
        txid = self.client.write_contract(self.contract, fn, args=args, account=acct, value=value)
        tx = wait_finalized(txid, name, self.evidence_dir)
        er, res = execution_result(tx)
        ok = tx_ok(tx)
        return {
            "name": name, "fn": fn, "txid": txid, "status": tx.get("status"),
            "execution_result": er, "result": res, "ok": ok, "value": value,
        }

    def read(self, fn: str, args):
        return self.client.read_contract(self.contract, fn, args=args)

    def client_account(self):
        return self._default_account

    def lock(self, account):
        self._default_account = account


def make_client(private_key: str):
    account = create_account(private_key)
    return create_client(chain=studionet, account=account), account


def make_fresh_account():
    # StudioNet is gasless, so a brand-new counterparty needs no funding.
    return create_account(generate_private_key())
