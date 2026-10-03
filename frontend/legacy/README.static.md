# 🔐 GenEscrow — Frontend Demo

Live demo site for **GenEscrow**, an AI-adjudicated escrow contract with authenticated artifacts, sealed evidence binding, and on-chain AI reasoning on GenLayer StudioNet (chain id 61999).

- **Live demo:** https://hoveiser.github.io/genesrow-frontend/
- **Contract (v1.3.0):** `0x0CF5095A297763A167B0d2f1CDc921b63c100cE4`
- **Explorer:** https://explorer-studio.genlayer.com/address/0x0CF5095A297763A167B0d2f1CDc921b63c100cE4
- **Source code & full test matrix:** https://github.com/hoveiser/genesrow

## What this site shows

- Contract details with explorer links
- v1.3.0 security-hardening proof (A1-A5), each with verifiable StudioNet transaction links
- On-chain test results (v1.2.0 reference tests, historical), each with verifiable transaction links:
  - **Test A:** Mutable URL guard — rejected (GitHub Pages not authenticated)
  - **Test B:** Authenticated artifact + client approve → RELEASED
  - **Test C:** Wrong repository rejected (authenticity binding) — rejected
  - **Test D:** Injection attack neutralized (REFUNDED with reasoning)
  - **Test E:** Unreachable artifact rejected at seal time — rejected
  - **Test F:** AI approves with on-chain reasoning → RELEASED

## Deployment history

| Version | Address | Purpose |
|---|---|---|
| **v1.3.0** (current) | `0x0CF5095A297763A167B0d2f1CDc921b63c100cE4` | Security hardening: bounded windows, structural-index sanitization, raw-byte seals, address validation, gateway allowlist + on-chain reachability proof |
| v1.2.0 | `0xcC90a61f34ACD2C7773901Ca50290f6801F0078D` | Authenticated artifacts + authenticity binding + leader/validator consensus + on-chain reasoning |
| v1.1.1 | `0x74300cc91f3E13e65822b919060f270d2bCE4194` | Sealed evidence binding + clean nondet closure |
| v1.1.0 | `0xAb243A38564BC2A3E3F738184b3A60E817A78337` | Evidence binding test suite |
| v1.0.0 | `0x020BEbbFA37b421F44Cc14ED485467969454f82D` | AI adjudication on visible text |
| v8.0 | `0xD4b28ce39A28fc5d4c43d9e85F1C4D3d6Eb5A815` | Safety mechanisms (timeouts, retry, appeal) |

## What changed in v1.3.0 (vs v1.2.0)

Security hardening that closes the audit gaps, all verified on chain against StudioNet (see the backend repo `evidence/` and `README.md`):

1. **Bounded party windows (A1):** approve/appeal windows are clamped to `[60s, 7 days]`; an over-long window reverts and locks nothing, so a payout can never be stranded indefinitely.
2. **Structural-index sanitization (A2):** every `def`/`class` index line is stripped of markup and length-capped, so a crafted line cannot break out of the `<data>` wrapper and inject instructions into the arbitration prompt.
3. **Raw-byte seal (A3):** the evidence hash is sha256 over the raw fetched bytes (not cleaned text), so a mutation hidden inside stripped regions is still caught as `EVIDENCE_MISMATCH`.
4. **Address validation (A4):** the freelancer address is parsed and checked (non-zero, distinct from client) before any escrow is created.
5. **Gateway allowlist + reachability (A5):** an anchored-parser allowlist resists lookalike/userinfo/traversal tricks, and validator reachability was proven on chain: `raw.githubusercontent.com` is reachable, while ipfs.io / gateway.ipfs.io / dweb.link are not reachable from the validator network today.
6. **Real-runtime test harness (A6):** the Direct Mode suite runs against the actual pinned GenVM runner, not a stub.

## What changed in v1.2.0 (vs v1.1.1)

### Security Fixes

1. **Authenticated immutable artifacts only:** deliverables must be GitHub commits at full 40-char SHA, IPFS CIDs, or Arweave — rejects GitHub Pages, personal sites, any URL the submitter controls and can rewrite

2. **Authenticity binding:** client specifies `expected_owner`, `expected_repo`, `expected_path` at creation; contract enforces exact match at delivery — prevents substitution

3. **HTTP error rejection at seal time:** URLs returning 4xx/5xx or empty content are rejected at delivery, not sealed (no seal on 404 pages)

4. **Prompt injection protection:** sanitize `<`/`>` from party text, wrap in `<data>` tags (untrusted information), structured JSON verdict parsing

5. **Substring parsing bug fixed:** v1.1.1 used substring matching ("NOT APPROVED" would match "APPROVED"); v1.2.0 requires exact JSON `{verdict, reasoning}`

### Consensus Improvements

6. **Leader/validator consensus (Partial Field Matching):** following GenLayer documentation — leader returns `{verdict, reasoning}`, validators independently re-run and compare only `verdict`, consensus via `gl.vm.run_nondet_unsafe`

7. **On-chain AI reasoning:** AI explanation (up to 300 chars) stored in `ai_reasoning` field — stewards can verify why the AI voted

8. **Structural index for code artifacts:** 6000 chars + complete index of all `def`/`class` declarations prevents truncation false negatives

9. **Case-insensitive SHA matching + URL length cap (500) + total_locked tracking**

## What changed in v1.1.x

**Sealed evidence binding:** the deliverable URL is fetched at delivery time, its visible text is hashed (sha256), and the hash is stored on-chain. At adjudication time, the URL is fetched again and the hash is verified before AI judges the content. If the page changed after delivery → `EVIDENCE_MISMATCH` verdict, automatic refund; live mutated content is never trusted.

## Threat Model

### Closed

| Attack | Mitigation |
|---|---|
| Mutable URL rewrite after delivery | Whitelist authenticated immutable artifacts only |
| Repo/file substitution | Authenticity binding (expected owner/repo/path enforced) |
| Unreachable URL sealed as evidence | HTTP error rejection at delivery |
| Prompt injection in description/criteria | Sanitize + `<data>` tags + structured JSON parsing |
| Substring parsing bug | Exact JSON field match |
| Page mutation after delivery | Sealed hash re-verified at adjudication |

### Residual (Inherent to AI Adjudication)

1. **LLM verdict variance:** different model combinations may vote differently — appeal mechanism addresses this (one-shot, final round)
2. **Vague acceptance criteria:** freelancer must review before starting; contract cannot enforce criteria quality
3. **Gateway availability:** retry mechanism (3 attempts) mitigates transient failures
4. **Consensus divergence:** leader rotation occurs if validators disagree (GenLayer protocol behavior)

## How to Use

1. Go to [GenLayer Studio](https://studio.genlayer.com)
2. Paste the code from `contract.py` and deploy your own instance
3. Call `create_escrow(freelancer, description, criteria, expected_owner, expected_repo, expected_path, approve_window, appeal_window)` with GEN value
4. Test flows: `mark_delivered` → `approve` | `dispute` → `resolve` → `appeal` → `finalize` | `timeout_release`
5. Watch AI validators adjudicate in real-time with sealed evidence + on-chain reasoning!

## License

MIT
