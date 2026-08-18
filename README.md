# 🔐 GenEscrow

**AI-Powered Escrow on GenLayer — Trust without Intermediaries**

A decentralized escrow smart contract with **real payable custody** that uses **AI validators** to adjudicate disputes between freelancers and clients.No human middlemen, no delays, no trust required.

## 📋 Contract Details

- **Network:** GenLayer Testnet Bradbury (LIVE deployment)
- **Contract Address:** `0xF2Dba0F446cc9D27156e516AaaBA46e7f48f28Ad`
- **Explorer:** [View on GenLayer Explorer](https://explorer-studio.genlayer.com/address/0xF2Dba0F446cc9D27156e516AaaBA46e7f48f28Ad)
- **Deploy Transaction:** `0xdab843f9ecafeb6d44c6220b59272f1262fb912c36347c8f508d12c91205520e`
- **Validators:** Mistral, Gemini, Kimi (real AI models on Bradbury)

## 🎯 How It Works

1. **Client** creates an escrow and deposits GEN tokens (payable)
2. **Freelancer** marks work as delivered (provides a URL)
3. **Client** can approve → funds released to freelancer via on-chain transfer
4. If a **dispute** arises → AI validators fetch the deliverable URL, inspect content, and vote APPROVED or REFUNDED
5. **Consensus reached** via `gl.eq_principle.strict_eq` → funds released or refunded automatically

### State Machine

- `funded` → `delivered` → `released` (client approves, payout to freelancer)
- `delivered` → `disputed` → AI verdict → `released` or `refunded` (payout to winner)

## 🧪 Test Matrix (All on Bradbury with Real GEN)

Every transaction below is verifiable on-chain. Click the hashes to view on GenLayer Explorer.

### ✅ Test 1: Happy Path — Client Approves

- **Escrow ID:** 1
- **Amount:** 7 GEN
- **Job:** Happy path test without AI
- **Approve TX:** [`0x252b4efa...663a3808`](https://explorer-studio.genlayer.com/tx/0x252b4efa68ee7a5321dc6303cc74c54355a7bf3d349c816c03073a62663a3808)
- **Result:** `released` — 7 GEN transferred to freelancer
- **AI Verdict:** `CLIENT_APPROVED` (no AI involved)

### ✅ Test 2: AI Approves (Match)

- **Escrow ID:** 2
- **Amount:** 3 GEN
- **Job:** A web page that displays an animated spinner with GenLayer branding
- **URL:** https://hoveiser.github.io/hoveiser-genlayer-spinner/
- **Resolve TX:** [`0x30d5fdea...c50011193`](https://explorer-studio.genlayer.com/tx/0x30d5fdea794b984e432718191e398dadf7ce7e343a5102d286b1005c50011193)
- **Result:** `released` — 3 GEN transferred to freelancer
- **AI Verdict:** `APPROVED`
- **AI Reasoning:** AI validators fetched the deliverable and judged that it matches the job description.

### ✅ Test 3: AI Refunds (URL Unreachable)

- **Escrow ID:** 3
- **Amount:** 8 GEN
- **Job:** URL unreachable test
- **URL:** https://no-such-domain-abc123.example.com/x (fake domain)
- **Resolve TX:** [`0x7fbb2a36...43f089`](https://explorer-studio.genlayer.com/tx/0x7fbb2a360a76ee881269eab28863efba50619d7332f71c8fe0c615590543f089)
- **Result:** `refunded` — 8 GEN returned to client
- **AI Verdict:** `REFUNDED`
- **AI Reasoning:** Deliverable URL could not be fetched (DNS/HTTP error); client refunded.

### ✅ Test 4: AI Refunds (Mismatch)

- **Escrow ID:** 4
- **Amount:** 9 GEN
- **Job:** A Python backend API with Flask that handles user authentication
- **URL:** https://hoveiser.github.io/hoveiser-genlayer-spinner/ (HTML/CSS spinner, NOT a Flask API)
- **Resolve TX:** [`0xcdeebf6a...7e772f8a`](https://explorer-studio.genlayer.com/tx/0xcdeebf6a50ef184a9ecd02cdadbb061934286335c1f1488f88c410785e772f8a)
- **Result:** `refunded` — 9 GEN returned to client
- **AI Verdict:** `REFUNDED`
- **AI Reasoning:** AI validators fetched the deliverable and judged it does not match the job description.

### 🛡️ Adversarial Tests (Manually Verified)

- **Unauthorized mark_delivered:** Freelancer address mismatch → `AssertionError: Only the freelancer`
- **Premature approve:** Approve before `delivered` status → `AssertionError: Not delivered`

## 💡 Technical Implementation

### Payable Custody + Payout

- `@gl.public.write.payable` decorator on `create_escrow` → contract receives and holds real GEN
- `gl.wasi.get_self_balance()` → tracks contract solvency
- Internal `gl_call_generic({'EthSend': {...}})` → performs on-chain transfer to winner
- Balance tracked via `contract_balance` and `get_total_locked` views

### AI-Powered Adjudication

- Validators fetch deliverable via `gl.nondet.web.get(url)`
- Content passed to AI via `gl.nondet.exec_prompt(prompt)`
- Binary verdict (APPROVED/REFUNDED/UNREACHABLE) used for consensus via `gl.eq_principle.strict_eq`
- **Critical design decision:** Only the canonical verdict (single word) goes into consensus block — not the free-form reasoning text — to prevent non-determinism across different LLM providers

### Authorization & State Machine

- `gl.message.sender_address == Address(...)` checks (case-insensitive via Address type)
- Strict state transitions: `funded` → `delivered` → (`released` | `disputed`) → (`released` | `refunded`)
- `assert` guards on every write method

### Consensus & Determinism

- `gl.eq_principle.strict_eq` ensures all validators agree on identical canonical output
- Binary verdicts (not free text) guarantee deterministic consensus
- Reasoning stored separately after consensus, for transparency

## 📂 Files

- `contract.py` — GenEscrow smart contract source code (v6, payable)
- `README.md` — This documentation

## 🌐 Related Work

- **GenLayer Spinner Design:** [hoveiser-genlayer-spinner](https://github.com/hoveiser/hoveiser-genlayer-spinner)
- **Frontend Demo:** [genesrow-frontend](https://github.com/hoveiser/genesrow-frontend)
- **GenLayer Studio:** https://studio.genlayer.com
- **GenLayer Docs:** https://docs.genlayer.com

## License

MIT
