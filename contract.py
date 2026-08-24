# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import datetime as _dt
import re as _re
import genlayer.gl._internal.gl_call as _glc

MAX_FETCH_FAILURES = 3

class GenEscrow(gl.Contract):
    escrows: TreeMap[str, str]
    next_id: str
    total_locked: str

    def __init__(self):
        self.next_id = "1"
        self.total_locked = "0"

    def _now(self) -> int:
        s = gl.message_raw["datetime"]
        return int(_dt.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp())

    def _payout(self, to_addr: str, amount: int):
        assert gl.wasi.get_self_balance() >= amount, "Contract insolvent"
        _glc.gl_call_generic(
            {'EthSend': {'address': Address(to_addr), 'calldata': b'', 'value': amount}},
            lambda _x: None,
        ).get()

    @gl.public.write.payable
    def create_escrow(self, freelancer: str, job_description: str, acceptance_criteria: str, approve_window_sec: int, appeal_window_sec: int):
        amount = int(gl.message.value)
        assert amount > 0, "Send the escrow amount with the transaction"
        assert len(acceptance_criteria) > 0, "Acceptance criteria required"
        assert approve_window_sec >= 60 and appeal_window_sec >= 60, "Windows too short"
        eid = int(self.next_id)
        self.next_id = str(eid + 1)
        self.escrows[str(eid)] = json.dumps({
            "client": str(gl.message.sender_address),
            "freelancer": freelancer,
            "description": job_description,
            "acceptance_criteria": acceptance_criteria,
            "deliverable_url": None,
            "evidence_hash": None,
            "amount": amount,
            "approve_window_sec": approve_window_sec,
            "appeal_window_sec": appeal_window_sec,
            "created_at": self._now(),
            "delivered_at": None,
            "adjudicated_at": None,
            "unresolvable_at": None,
            "status": "funded",
            "fetch_failures": 0,
            "appeals_used": 0,
            "client_vote": None,
            "freelancer_vote": None,
            "ai_verdict": None,
            "ai_reasoning": None,
            "winner": None,
        })
        self.total_locked = str(int(self.total_locked) + amount)
        return eid

    @gl.public.write
    def cancel(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert gl.message.sender_address == Address(data["client"]), "Only the client"
        assert data["status"] == "funded", "Not funded"
        data["status"] = "canceled"
        data["ai_verdict"] = "CANCELED"
        data["ai_reasoning"] = "Canceled by client before delivery"
        self.total_locked = str(int(self.total_locked) - data["amount"])
        self.escrows[str(escrow_id)] = json.dumps(data)
        self._payout(data["client"], data["amount"])

    @gl.public.write
    def mark_delivered(self, escrow_id: int, deliverable_url: str, evidence_hash: str):
        data = json.loads(self.escrows[str(escrow_id)])
        assert gl.message.sender_address == Address(data["freelancer"]), "Only the freelancer"
        assert data["status"] == "funded", "Not funded"
        assert len(deliverable_url) > 0, "URL required"
        data["status"] = "delivered"
        data["deliverable_url"] = deliverable_url
        data["evidence_hash"] = evidence_hash
        data["delivered_at"] = self._now()
        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.write
    def approve(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert gl.message.sender_address == Address(data["client"]), "Only the client"
        assert data["status"] == "delivered", "Not delivered"
        data["status"] = "released"
        data["ai_verdict"] = "CLIENT_APPROVED"
        data["ai_reasoning"] = "Client approved the deliverable"
        self.total_locked = str(int(self.total_locked) - data["amount"])
        self.escrows[str(escrow_id)] = json.dumps(data)
        self._payout(data["freelancer"], data["amount"])

    @gl.public.write
    def timeout_release(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert data["status"] == "delivered", "Not delivered"
        assert self._now() > data["delivered_at"] + data["approve_window_sec"], "Approve window still open"
        data["status"] = "released"
        data["ai_verdict"] = "TIMEOUT_RELEASED"
        data["ai_reasoning"] = "Client stayed silent past the approve window; funds released to freelancer"
        self.total_locked = str(int(self.total_locked) - data["amount"])
        self.escrows[str(escrow_id)] = json.dumps(data)
        self._payout(data["freelancer"], data["amount"])

    @gl.public.write
    def request_ai_review(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert gl.message.sender_address in (Address(data["client"]), Address(data["freelancer"])), "Not a party"
        assert data["status"] == "delivered", "Not delivered"
        data["status"] = "review"
        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.write
    def dispute(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert gl.message.sender_address in (Address(data["client"]), Address(data["freelancer"])), "Not a party"
        assert data["status"] == "delivered", "Not delivered"
        data["status"] = "disputed"
        self.escrows[str(escrow_id)] = json.dumps(data)

    def _ai_round(self, data) -> str:
        def get_verdict() -> str:
            try:
                response = gl.nondet.web.get(data["deliverable_url"])
                raw = response.body.decode("utf-8", errors="ignore")
                raw = _re.sub(r"(?s)<(style|script).*?</\1>", " ", raw)
                text = _re.sub(r"<[^>]+>", " ", raw)
                text = _re.sub(r"\s+", " ", text).strip()[:3000]
                prompt = (
                    "You are an impartial escrow adjudicator for GenLayer.\n"
                    f"Job description: {data['description']}\n"
                    f"Agreed acceptance criteria: {data['acceptance_criteria']}\n"
                    f"Freelancer-submitted evidence hash: {data['evidence_hash']}\n\n"
                    f"Deliverable page visible text:\n{text}\n\n"
                    "Does the deliverable satisfy the acceptance criteria? "
                    "Answer with ONE word only: APPROVED or REFUNDED."
                )
                answer = gl.nondet.exec_prompt(prompt).strip().upper()
                if "APPROVED" in answer:
                    return "APPROVED"
                return "REFUNDED"
            except Exception:
                return "UNREACHABLE"
        return gl.eq_principle.strict_eq(get_verdict)

    @gl.public.write
    def resolve(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert data["status"] in ("disputed", "review"), "Not in a resolvable state"
        verdict = self._ai_round(data)
        if verdict == "UNREACHABLE":
            data["fetch_failures"] = data["fetch_failures"] + 1
            if data["fetch_failures"] >= MAX_FETCH_FAILURES:
                data["status"] = "unresolvable"
                data["unresolvable_at"] = self._now()
                data["ai_reasoning"] = "Deliverable could not be fetched after 3 attempts; mutual release or timeout refund applies"
            else:
                data["ai_reasoning"] = "Fetch failed (attempt " + str(data["fetch_failures"]) + " of 3); retry allowed, no automatic payout"
            self.escrows[str(escrow_id)] = json.dumps(data)
            return
        is_appeal = data["appeals_used"] > 0
        data["ai_verdict"] = verdict
        if verdict == "APPROVED":
            data["winner"] = "freelancer"
        else:
            data["winner"] = "client"
        data["ai_reasoning"] = ("FINAL appeal round: " if is_appeal else "") + "AI validators fetched the deliverable and voted " + verdict
        data["status"] = "adjudicated"
        data["adjudicated_at"] = self._now()
        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.write
    def appeal(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert data["status"] == "adjudicated", "Not adjudicated"
        assert data["appeals_used"] == 0, "Appeal already used"
        assert self._now() < data["adjudicated_at"] + data["appeal_window_sec"], "Appeal window closed"
        loser = "client" if data["winner"] == "freelancer" else "freelancer"
        assert gl.message.sender_address == Address(data[loser]), "Only the losing party may appeal"
        data["appeals_used"] = 1
        data["status"] = "disputed"
        data["ai_reasoning"] = "Appeal filed within the window; second AI round will be final"
        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.write
    def finalize(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert data["status"] == "adjudicated", "Not adjudicated"
        window_closed = self._now() > data["adjudicated_at"] + data["appeal_window_sec"]
        loser = "client" if data["winner"] == "freelancer" else "freelancer"
        loser_accepts = gl.message.sender_address == Address(data[loser])
        assert data["appeals_used"] == 1 or window_closed or loser_accepts, "Appeal window open: loser must accept, appeal, or wait"
        winner_key = data["winner"]
        data["status"] = "released" if winner_key == "freelancer" else "refunded"
        self.total_locked = str(int(self.total_locked) - data["amount"])
        self.escrows[str(escrow_id)] = json.dumps(data)
        self._payout(data[winner_key], data["amount"])

    @gl.public.write
    def timeout_refund(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert data["status"] == "unresolvable", "Not unresolvable"
        assert self._now() > data["unresolvable_at"] + data["appeal_window_sec"], "Safety window still open"
        data["status"] = "refunded"
        data["ai_verdict"] = "TIMEOUT_REFUNDED"
        data["ai_reasoning"] = "Deliverable unreachable after retries and safety window; refunded to client"
        self.total_locked = str(int(self.total_locked) - data["amount"])
        self.escrows[str(escrow_id)] = json.dumps(data)
        self._payout(data["client"], data["amount"])

    @gl.public.write
    def agree_release(self, escrow_id: int, to_freelancer: bool):
        data = json.loads(self.escrows[str(escrow_id)])
        assert data["status"] in ("delivered", "review", "disputed", "adjudicated", "unresolvable"), "Closed"
        sender = str(gl.message.sender_address)
        assert sender in (data["client"], data["freelancer"]), "Not a party"
        choice = "freelancer" if to_freelancer else "client"
        if sender == data["client"]:
            data["client_vote"] = choice
        else:
            data["freelancer_vote"] = choice
        if data["client_vote"] is not None and data["client_vote"] == data["freelancer_vote"]:
            winner_key = data["client_vote"]
            data["status"] = "released" if winner_key == "freelancer" else "refunded"
            data["ai_verdict"] = "MUTUAL"
            data["ai_reasoning"] = "Both parties agreed on the release destination"
            self.total_locked = str(int(self.total_locked) - data["amount"])
            self.escrows[str(escrow_id)] = json.dumps(data)
            self._payout(data[winner_key], data["amount"])
        else:
            self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.view
    def get_escrow(self, escrow_id: int) -> str:
        return self.escrows.get(str(escrow_id), "{}")

    @gl.public.view
    def contract_balance(self) -> int:
        return int(gl.wasi.get_self_balance())

    @gl.public.view
    def get_total_locked(self) -> str:
        return self.total_locked
