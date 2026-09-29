#!/usr/bin/env python3
"""Shared StudioNet helpers for the GenEscrow on-chain scripts.

Value-bearing calls go through genlayer-py (the CLI keystore is locked in this
environment). Contract addresses and transaction hashes are always copied from raw
explorer JSON records, never retyped. The private key is read from .env and never
printed, logged, or stored.
"""
import json
import pathlib
import threading
import time
import urllib.error
import urllib.request

from genlayer_py import create_account, create_client, generate_private_key, studionet

EXPLORER = "https://explorer-studio.genlayer.com"   # StudioNet, chain id 61999
RPC = "https://studio.genlayer.com/api"
GEN = 10**18
UA = {"User-Agent": "qoder-agent", "Content-Type": "application/json"}


def _retry(fn, what, tries=5, base=8):
    """Retry an SDK call that can hit a transient Cloudflare 502 / invalid-JSON RPC reply.

    StudioNet sits behind Cloudflare and occasionally returns an HTML 502 page where the
    SDK expects JSON; those are transient, so back off and try again instead of crashing.
    """
    last = None
    for i in range(tries):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001 - re-raised after retries exhausted
            last = e
            time.sleep(base * (i + 1))
    raise RuntimeError(f"{what} failed after {tries} tries: {last!r}")


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


def recent_txids(address: str, limit: int = 30):
    """Return the sender's transaction hashes, newest first, from the explorer list."""
    try:
        d = get_json(f"{EXPLORER}/api/transactions?address={address}")
    except Exception:
        return []
    txs = d if isinstance(d, list) else (d.get("transactions") or d.get("data") or [])
    return [(t.get("transaction_hash") or t.get("hash")) for t in txs][:limit]


def discover_new_txid(address: str, before, timeout_s: int = 180) -> str:
    """After a sequential submit, return the first hash that was not present before."""
    before = set(before)
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        for h in recent_txids(address):
            if h and h not in before:
                return h
        time.sleep(5)
    raise RuntimeError(f"no new tx discovered for {address} within {timeout_s}s")


def wait_finalized(txid: str, name: str, evidence_dir=None, timeout_s: int = 900) -> dict:
    if evidence_dir is not None:
        pathlib.Path(evidence_dir).mkdir(parents=True, exist_ok=True)
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        try:
            d = get_json(f"{EXPLORER}/api/transactions/{txid}")
            tx = d.get("transaction")
        except Exception as e:  # transient fetch issue: keep polling
            last = {"error": str(e)}
            time.sleep(6)
            continue
        if tx:
            last = tx
            if tx.get("status") == "FINALIZED":
                if evidence_dir is not None:
                    (pathlib.Path(evidence_dir) / f"{name}_{txid[:12]}.json").write_text(
                        json.dumps(tx, indent=2))
                return tx
        time.sleep(6)
    raise RuntimeError(f"tx {name} {txid} not FINALIZED in {timeout_s}s; last={str(last)[:160]}")


class Escrow:
    """Thin wrapper over a deployed GenEscrow instance with FINALIZED write/read."""

    def __init__(self, client, contract: str, evidence_dir=None, submit_timeout: int = 75):
        self.client = client
        self.contract = contract
        self.evidence_dir = evidence_dir
        self.submit_timeout = submit_timeout

    def _submit(self, fn, args, acct, value):
        """Run the SDK write in a watchdog thread; return the txid it yields or None on stall.

        The pinned SDK calls w3.eth.wait_for_transaction_receipt with no timeout, and for a
        hard-assert revert that eth-level poll can block forever even after the consensus tx
        already FINALIZED on the explorer. A stall is non-fatal: the caller falls back to
        discovering the txid from the explorer list.
        """
        box = {}

        def run():
            try:
                box["txid"] = _retry(
                    lambda: self.client.write_contract(
                        self.contract, fn, args=args, account=acct, value=value),
                    f"write {fn}")
            except BaseException as e:  # noqa: BLE001 - surfaced to caller
                box["err"] = e
        th = threading.Thread(target=run, daemon=True)
        th.start()
        th.join(self.submit_timeout)
        if th.is_alive():
            return None
        if "err" in box:
            raise box["err"]
        return box.get("txid")

    def write(self, name: str, fn: str, args, account=None, value: int = 0):
        acct = account or self.client_account()
        before = recent_txids(acct.address)
        txid = self._submit(fn, args, acct, value)
        if not txid:
            # SDK stalled in its blocking receipt wait: find the tx the explorer recorded
            txid = discover_new_txid(acct.address, before)
        tx = wait_finalized(txid, name, self.evidence_dir)
        er, res = execution_result(tx)
        ok = tx_ok(tx)
        return {
            "name": name, "fn": fn, "txid": txid, "status": tx.get("status"),
            "execution_result": er, "result": res, "ok": ok, "value": value,
        }

    def read(self, fn: str, args):
        return _retry(lambda: self.client.read_contract(self.contract, fn, args=args), f"read {fn}")

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
