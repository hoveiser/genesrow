# Shared real-runtime test harness for GenEscrow.
#
# Fidelity note: these tests deploy and drive the ACTUAL pinned GenLayer runner
# through the official genlayer-test direct fixtures (direct_vm / direct_deploy).
# No fake `genlayer` module is installed into sys.modules, so the contract runs as a
# genuine GenLayer contract: real Address parsing and equality, real @gl.public
# decorators, real run_nondet leader capture, and real gl.nondet.web/llm mocking.
#
# Runtime facts this harness is built around (verified against the installed SDK):
#   * `import genlayer` only succeeds AFTER a deploy has loaded the SDK; helpers import
#     it lazily.
#   * The contract clock reads gl.message_raw["datetime"]; vm.warp alone does not refresh
#     it after deploy, so Env.now() writes that key directly.
#   * mock_web / mock_llm are first-match-wins; clear_mocks() before re-mocking.
#   * EthSend is not implemented in direct mode (balances never move), so payouts are
#     observed via the vm._gl_call_hook capture below, not via balance deltas. Real
#     on-chain balance movement is proven separately by the studionet scenario.
import datetime as _d
import json
import os
import sys

import pytest

T0 = 1_800_000_000
# The tracked default is the canonical root contract. A7 mutation checks point this at a
# scratch copy (outside the repo) via GENECONTRACT to prove the new tests actually fail
# when a fix is reverted, without ever touching the tracked tree.
CONTRACT_PATH = os.environ.get("GENECONTRACT", "contract.py")
VALUE = 2 * 10**18
ART = ("class GenEscrow: escrow contract with def mark_delivered and def resolve and "
       "def finalize using sha256 sealed evidence " + "pad " * 40)
ART_URL = ("https://raw.githubusercontent.com/hoveiser/genesrow/"
           "c251125461bd739a0219e96dff20d6ab833a56c1/contract.py")


def iso(off: int) -> str:
    return _d.datetime.fromtimestamp(T0 + off, _d.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def hexaddr(a) -> str:
    b = a.as_bytes if hasattr(a, "as_bytes") else a
    return "0x" + bytes(b).hex()


def llm(verdict: str, reasoning: str = "ok") -> str:
    # The real SDK json-decodes a pure-JSON mock into a dict, which would break the
    # contract's exec_prompt(...).strip(); prefixing text keeps it a string, matching
    # what a live model returns for a plain-text prompt.
    return "ANSWER " + json.dumps({"verdict": verdict, "reasoning": reasoning})


class Env:
    def __init__(self, vm, c, mod, sends, prompts):
        self.vm = vm
        self.c = c
        self.mod = mod
        self.sends = sends
        self.prompts = prompts

    def now(self, off: int):
        import genlayer.gl as gl
        gl.message_raw["datetime"] = iso(off)

    def party(self, addr, value: int = 0):
        self.vm.sender = addr
        self.vm.value = value

    def esc(self, eid) -> dict:
        return json.loads(self.c.get_escrow(eid))

    def locked(self) -> int:
        return int(self.c.get_total_locked())

    def create(self, client, freelancer, windows=(120, 120), value=VALUE,
               criteria="the page must load", desc="job",
               owner="hoveiser", repo="genesrow", path="contract.py"):
        self.party(client, value)
        eid = self.c.create_escrow(hexaddr(freelancer), desc, criteria, owner, repo, path,
                                   windows[0], windows[1])
        self.vm.value = 0
        self.vm.deal(self.vm._contract_address, value)   # keep payouts solvent
        return eid


@pytest.fixture
def env(direct_vm, direct_deploy):
    direct_vm.warp(iso(0))
    c = direct_deploy(CONTRACT_PATH)
    import genlayer.gl as gl
    gl.message_raw["datetime"] = iso(0)
    mod = sys.modules[type(c).__module__]
    sends = []
    prompts = []

    def hook(vm, request):
        if isinstance(request, dict) and "EthSend" in request:
            sends.append(dict(request["EthSend"]))
        return None

    direct_vm._gl_call_hook = hook

    # Capture the ACTUAL prompt text handed to the model: every exec_prompt call
    # funnels through VMContext._match_llm_mock(prompt), so wrapping it records the
    # exact string (post-sanitization) rather than trusting the final verdict.
    _orig_match = direct_vm._match_llm_mock

    def _record_match(prompt):
        prompts.append(prompt)
        return _orig_match(prompt)

    direct_vm._match_llm_mock = _record_match
    e = Env(direct_vm, c, mod, sends, prompts)
    return e


def deliver(env, body=ART, url=ART_URL):
    env.vm.clear_mocks()
    env.vm.mock_web(r"githubusercontent", {"status": 200, "body": body})
