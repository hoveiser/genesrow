# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import genlayer.gl._internal.gl_call as _glc

class GenEscrow(gl.Contract):
    escrows: TreeMap[str, str]
    next_id: str
    total_locked: str

    def __init__(self):
        self.next_id = "1"
        self.total_locked = "0"

    def _payout(self, to_addr: str, amount: int):
        assert gl.wasi.get_self_balance() >= amount, "Contract insolvent"
        _glc.gl_call_generic(
            {'EthSend': {'address': Address(to_addr), 'calldata': b'', 'value': amount}},
            lambda _x: None,
        ).get()

    @gl.public.write.payable
    def create_escrow(self, freelancer: str, job_description: str, deliverable_url: str):
        amount = int(gl.message.value)
        assert amount > 0, "Send the escrow amount with the transaction"
        eid = int(self.next_id)
        self.next_id = str(eid + 1)
        self.escrows[str(eid)] = json.dumps({
            "client": str(gl.message.sender_address),
            "freelancer": freelancer,
            "description": job_description,
            "url": deliverable_url,
            "amount": amount,
            "status": "funded",
            "ai_verdict": None,
            "ai_reasoning": None,
        })
        self.total_locked = str(int(self.total_locked) + amount)
        return eid

    @gl.public.write
    def mark_delivered(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert gl.message.sender_address == Address(data["freelancer"]), "Only the freelancer"
        assert data["status"] == "funded", "Not funded"
        data["status"] = "delivered"
        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.write
    def approve(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert gl.message.sender_address == Address(data["client"]), "Only the client"
        assert data["status"] == "delivered", "Not delivered"
        data["status"] = "released"
        data["ai_verdict"] = "CLIENT_APPROVED"
        data["ai_reasoning"] = "Client manually approved without AI"
        self.escrows[str(escrow_id)] = json.dumps(data)
        self.total_locked = str(int(self.total_locked) - data["amount"])
        self._payout(data["freelancer"], data["amount"])

    @gl.public.write
    def dispute(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert gl.message.sender_address in (Address(data["client"]), Address(data["freelancer"])), "Not a party"
        assert data["status"] == "delivered", "Not delivered"
        data["status"] = "disputed"
        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.write
    def resolve(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert data["status"] == "disputed", "Not disputed"

        def get_verdict() -> str:
            try:
                response = gl.nondet.web.get(data["url"])
                try:
                    content = response.body.decode("utf-8", errors="ignore")[:2000]
                except Exception:
                    content = str(response.body)[:2000]
                prompt = (
                    "You are an impartial escrow adjudicator for GenLayer.\n"
                    f"Job description: {data['description']}\n\n"
                    f"Deliverable page content:\n{content}\n\n"
                    "Does the deliverable match the job description? "
                    "Answer with ONE word only: APPROVED or REFUNDED."
                )
                answer = gl.nondet.exec_prompt(prompt).strip().upper()
                if "APPROVED" in answer:
                    return "APPROVED"
                return "REFUNDED"
            except Exception:
                return "UNREACHABLE"

        verdict = gl.eq_principle.strict_eq(get_verdict)

        if verdict == "APPROVED":
            data["status"] = "released"
            winner = data["freelancer"]
            data["ai_verdict"] = "APPROVED"
            data["ai_reasoning"] = "AI validators fetched the deliverable and judged it matches the job description."
        elif verdict == "UNREACHABLE":
            data["status"] = "refunded"
            winner = data["client"]
            data["ai_verdict"] = "REFUNDED"
            data["ai_reasoning"] = "Deliverable URL could not be fetched (DNS/HTTP error); client refunded."
        else:
            data["status"] = "refunded"
            winner = data["client"]
            data["ai_verdict"] = "REFUNDED"
            data["ai_reasoning"] = "AI validators fetched the deliverable and judged it does not match the job description."

        self.escrows[str(escrow_id)] = json.dumps(data)
        self.total_locked = str(int(self.total_locked) - data["amount"])
        self._payout(winner, data["amount"])

    @gl.public.view
    def get_escrow(self, escrow_id: int) -> str:
        return self.escrows.get(str(escrow_id), "{}")

    @gl.public.view
    def contract_balance(self) -> int:
        return int(gl.wasi.get_self_balance())

    @gl.public.view
    def get_total_locked(self) -> str:
        return self.total_locked
