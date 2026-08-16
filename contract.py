# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json

class GenEscrow(gl.Contract):
    escrows: TreeMap[str, str]
    next_id: str

    def __init__(self):
        self.next_id = "1"

    @gl.public.write
    def create_escrow(self, freelancer: str, job_description: str, deliverable_url: str, amount: int):
        assert amount > 0, "Escrow amount must be positive"
        eid = int(self.next_id)
        self.next_id = str(eid + 1)
        escrow_data = {
            "client": str(gl.message.sender_address),
            "freelancer": freelancer,
            "description": job_description,
            "url": deliverable_url,
            "amount": amount,
            "status": "funded",
        }
        self.escrows[str(eid)] = json.dumps(escrow_data)
        return eid

    @gl.public.write
    def mark_delivered(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert str(gl.message.sender_address) == data["freelancer"], "Only the freelancer"
        assert data["status"] == "funded", "Not funded"
        data["status"] = "delivered"
        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.write
    def approve(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
        assert str(gl.message.sender_address) == data["client"], "Only the client"
        assert data["status"] == "delivered", "Not delivered"
        data["status"] = "released"
        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.write
    def dispute(self, escrow_id: int):
        data = json.loads(self.escrows[str(escrow_id)])
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
                content = response.body.decode("utf-8", errors="ignore")[:2000]
                
                if response.status_code >= 400:
                    return "REFUNDED"
                    
                prompt = (
                    "You are an impartial escrow adjudicator for GenLayer.\n"
                    f"Job description: {data['description']}\n\n"
                    f"Deliverable page content:\n{content}\n\n"
                    "Does the deliverable match the job description? "
                    "Answer with ONE word only: APPROVED or REFUNDED."
                )
                return gl.nondet.exec_prompt(prompt)
            except Exception as e:
                return "REFUNDED"

        verdict = gl.eq_principle.strict_eq(get_verdict)

        if "APPROVED" in verdict.upper():
            data["status"] = "released"
        else:
            data["status"] = "refunded"

        self.escrows[str(escrow_id)] = json.dumps(data)

    @gl.public.view
    def get_escrow(self, escrow_id: int) -> str:
        return self.escrows.get(str(escrow_id), "{}")

    @gl.public.view
    def get_all(self) -> str:
        return json.dumps({k: json.loads(v) for k, v in self.escrows.items()})
