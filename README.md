# 🔐 GenEscrow

**AI-Powered Escrow with Real Payable Custody on GenLayer — v1.0.0**

A decentralized escrow smart contract with **real payable custody** that uses **AI validators** to adjudicate disputes between freelancers and clients. No human middlemen, no delays, no trust required.

## 📋 Contract Details

- **Network:** GenLayer Testnet Bradbury (LIVE)
- **Current Version:** v1.0.0
- **Contract Address:** `0x020BEbbFA37b421F44Cc14ED485467969454f82D`
- **Explorer:** [View on GenLayer Explorer](https://explorer-studio.genlayer.com/address/0x020BEbbFA37b421F44Cc14ED485467969454f82D)
- **Validators:** Mistral, Gemini, Kimi (real AI models on Bradbury)

## 🗺 Deployment History

| Version | Address | Purpose |
|---|---|---|
| **v1.0.0** (CURRENT) | `0x020BEbbFA37b421F44Cc14ED485467969454f82D` | Stable release with improved AI adjudication |
| v8.0 | `0xD4b28ce39A28fc5d4c43d9e85F1C4D3d6Eb5A815` | Safety mechanisms test suite (rounds 1-3) |

## 🎯 How It Works

1. **Client** creates an escrow with agreed acceptance criteria and deposits GEN tokens (payable)
2. **Freelancer** marks work as delivered (provides URL + evidence hash, immutable)
3. **Client** can approve → funds released to freelancer via on-chain transfer
4. If client stays silent → freelancer can trigger `timeout_release` after approve window
5. If a **dispute** arises → AI validators fetch the deliverable URL, inspect visible text content, and vote APPROVED or REFUNDED
6. Losing party can **appeal** once within appeal window → second AI round is final
7. **Consensus reached** via `gl.eq_principle.strict_eq` → funds released or refunded automatically

### State Machine

- `funded` → `delivered` → `released` (client approves or timeout)
- `delivered` → `disputed`/`review` → AI verdict → `adjudicated` → `released` or `refunded`
- `delivered` → `unresolvable` (3 fetch failures) → `timeout_refund` or `agree_release`

## 🧪 Test Results (All on Bradbury with Real GEN)

Every transaction below is verifiable on-chain. Click the hashes to view on GenLayer Explorer.

### ✅ Test 1: Happy Path — Client Approves

- **Contract:** v8.0 (`0xD4b28ce39A28fc5d4c43d9e85F1C4D3d6Eb5A815`)
- **Amount:** 3 GEN
- **Job:** Round 1 corner case test
- **Approve TX:** [`0x8c30a2be...cebf2079`](https://explorer-studio.genlayer.com/tx/0x8c30a2bebcb5e530feaa39f60a18f8f88e5965b198b7fbc7d1743fd9cebf2079)
- **Result:** `released` — 3 GEN transferred to freelancer
- **AI Verdict:** `CLIENT_APPROVED` (no AI involved)

### ✅ Test 2: AI Approves (Match)

- **Contract:** v1.0.0 (`0x020BEbbFA37b421F44Cc14ED485467969454f82D`)
- **Amount:** 2 GEN
- **Job:** Build a static HTML webpage that displays a rotating spinner animation using CSS
- **URL:** https://hoveiser.github.io/hoveiser-genlayer-spinner/
- **Resolve TX:** [`0x189be5b1...eeda65`](https://explorer-studio.genlayer.com/tx/0x189be5b1b23e1bc358d74c6810d818c73b0ff66ce451eee0811dfa7936eeda65)
- **Result:** `released` — 2 GEN transferred to freelancer
- **AI Verdict:** `APPROVED`
- **AI Reasoning:** AI validators fetched the deliverable and voted APPROVED.

### ✅ Test 3: AI Refunds (Mismatch)

- **Contract:** v1.0.0 (`0x020BEbbFA37b421F44Cc14ED485467969454f82D`)
- **Amount:** 6 GEN
- **Job:** A Python backend API with Flask
- **URL:** https://hoveiser.github.io/hoveiser-genlayer-spinner/ (HTML/CSS spinner, NOT a Flask API)
- **Resolve TX:** [`0x92284c49...02b6d81e`](https://explorer-studio.genlayer.com/tx/0x92284c49eb16343873fbca1501d7189e7631294426831d16e103fe4f02b6d81e)
- **Result:** `refunded` — 6 GEN returned to client
- **AI Verdict:** `REFUNDED`
- **AI Reasoning:** AI validators fetched the deliverable and voted REFUNDED.

### ✅ Test 4: AI Refunds (URL Unreachable + Retry + Timeout)

- **Contract:** v8.0 (`0xD4b28ce39A28fc5d4c43d9e85F1C4D3d6Eb5A815`)
- **Amount:** 4 GEN
- **Job:** Round 2 retry test
- **URL:** https://no-such-domain-xyz123.example.com/x (fake domain)
- **Resolve TX (3 attempts):** [`0x8d64a618...df5424`](https://explorer-studio.genlayer.com/tx/0x8d64a6180d8d6eecb5b57b132dcda89fe14f58fe1ba124769ca12e7110df5424), [`0xfe6b3d88...48f66a`](https://explorer-studio.genlayer.com/tx/0xfe6b3d8806d0b33ebd1962b7afe92bb349dd48bfda5b61c56ca8017d4748f66a), [`0x60ba96a8...a9889`](https://explorer-studio.genlayer.com/tx/0x60ba96a8f9e8f9e8a9cb28fd92c9784a791e52f6e2e62ce665c63510359a9889)
- **Timeout TX:** [`0x9d1959ca...5d3f0`](https://explorer-studio.genlayer.com/tx/0x9d1959ca0968260f57d3d1346fdab43b487f4eb11b8c1d5c92c74554adc5d3f0)
- **Result:** `refunded` — 4 GEN returned to client
- **AI Verdict:** `TIMEOUT_REFUNDED`
- **AI Reasoning:** Deliverable unreachable after retries and safety window; refunded to client.

### ✅ Test 5: Appeal + Finalize

- **Contract:** v8.0 (`0xD4b28ce39A28fc5d4c43d9e85F1C4D3d6Eb5A815`)
- **Amount:** 2 GEN
- **Job:** A web page that displays an animated spinner with GenLayer branding
- **Resolve TX (round 1):** [`0x974ead07...00370f`](https://explorer-studio.genlayer.com/tx/0x974ead07ebdfcb1c96aec8d4c81b2b13aa36c4a8e5dbd4b592e61aa9d800370f)
- **Appeal TX:** [`0x9e2b4764...f9a6`](https://explorer-studio.genlayer.com/tx/0x9e2b47644c50ccb5d9c129777ff67096dcb7b9c35c67921c7c32d9fdf76af9a6)
- **Resolve TX (round 2 final):** [`0x235a1eb2...ea858`](https://explorer-studio.genlayer.com/tx/0x235a1eb2243a582e0fdeb2c44e6e0c170aed3aaf9f7f531c38a94da80d8ea858)
- **Finalize TX:** [`0x1b2d1d77...c5816`](https://explorer-studio.genlayer.com/tx/0x1b2d1d774c523fa36b6005cfd1dce598a03244abd16748ce75d273f34f2c5816)
- **Result:** `refunded` — 2 GEN returned to client
- **AI Verdict:** `REFUNDED`
- **AI Reasoning:** FINAL appeal round: AI validators fetched the deliverable and voted REFUNDED.

### 🛡️ Safety Guards (Manually Verified)

- **Premature timeout_release:** Call before approve window closes → `AssertionError: Approve window still open`
- **Duplicate mark_delivered:** Call after delivery → `AssertionError: Not funded` (immutable evidence)
- **Unauthorized mark_delivered:** Non-freelancer calls → `AssertionError: Only the freelancer`
- **Premature approve:** Call before delivered → `AssertionError: Not delivered`

## 💡 Technical Implementation

### Payable Custody + Payout

- `@gl.public.write.payable` decorator on `create_escrow` → contract receives and holds real GEN
- `gl.wasi.get_self_balance()` → tracks contract solvency
- Internal `gl_call_generic({'EthSend': {...}})` → performs on-chain transfer to winner
- Balance tracked via `contract_balance` and `get_total_locked` views

### Time-Based Safety Mechanisms

- `gl.message_raw["datetime"]` → consensus-safe timestamp (per Pavel Kolosov's guidance)
- `approve_window_sec` → auto-release to freelancer if client stays silent
- `appeal_window_sec` → time-bound appeal window for losing party
- `unresolvable_at` → safety window before timeout refund

### AI-Powered Adjudication

- Validators fetch deliverable via `gl.nondet.web.get(url)`
- **Visible text extraction** (HTML tags and CSS removed) → AI reads meaningful content, not raw markup
- Content passed to AI via `gl.nondet.exec_prompt(prompt)` with acceptance criteria
- Binary verdict (APPROVED/REFUNDED/UNREACHABLE) used for consensus via `gl.eq_principle.strict_eq`
- **Critical design decision:** Only the canonical verdict (single word) goes into consensus block — not the free-form reasoning text — to prevent non-determinism across different LLM providers

### Immutable Evidence & Retry

- Freelancer submits `deliverable_url` + `evidence_hash` via `mark_delivered` → immutable after delivery
- Up to 3 fetch attempts before `unresolvable` → no automatic payout on transient failures
- `agree_release` → mutual agreement to break deadlocks

### Authorization & State Machine

- `gl.message.sender_address == Address(...)` checks (case-insensitive via Address type)
- Strict state transitions enforced via `assert` guards
- Appeal limited to losing party, once per escrow

### Consensus & Determinism

- `gl.eq_principle.strict_eq` ensures all validators agree on identical canonical output
- Binary verdicts (not free text) guarantee deterministic consensus
- Reasoning stored separately after consensus, for transparency

## 🧪 How to Try It Yourself (step by step)

1. Open https://studio.genlayer.com and connect your wallet (Bradbury testnet).
2. Create a new contract and paste the full code from `contract.py` (keep the two header lines Studio generates).
3. Click **Deploy new instance** (Execution Mode: Normal / Full Consensus).
4. In **Write Methods**, call `create_escrow` with a small value (e.g. 2 GEN):
   - freelancer: your own wallet address
   - job_description: "Build a static HTML webpage that displays a rotating spinner animation using CSS"
   - acceptance_criteria: "The page must contain an animated spinner element that rotates continuously"
   - approve_window_sec: 120
   - appeal_window_sec: 120
5. Call `mark_delivered(1, "https://hoveiser.github.io/hoveiser-genlayer-spinner/", "my-evidence-hash")`.
6. Happy path: call `approve(1)` → funds released; check `contract_balance` returns 0.
7. AI path: on another escrow, call `dispute(2)` then `resolve(2)` → validators fetch the URL and vote; check `get_escrow(2)` for status, ai_verdict and ai_reasoning.
8. Mismatch: create an escrow with job_description "A Python backend API with Flask" and the same spinner URL → dispute → resolve → expect REFUNDED.
9. Timeout: create an escrow, mark delivered, wait 2 minutes, then call `timeout_release` → expect RELEASED to freelancer.
10. Verify every step on the explorer using the tx links above.

## 📂 Files

- `contract.py` — GenEscrow smart contract source code (v1.0.0)
- `README.md` — This documentation

## 🌐 Related Work

- **GenLayer Spinner Design:** [hoveiser-genlayer-spinner](https://github.com/hoveiser/hoveiser-genlayer-spinner)
- **Frontend Demo:** [genesrow-frontend](https://github.com/hoveiser/genesrow-frontend)
- **GenLayer Studio:** https://studio.genlayer.com
- **GenLayer Docs:** https://docs.genlayer.com

## License

MIT
