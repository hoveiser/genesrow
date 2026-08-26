# 🔐 GenEscrow

**AI-adjudicated escrow with sealed, hash-verified evidence on GenLayer — v1.1.1**

A decentralized escrow with real payable custody where AI validators adjudicate disputes, and the deliverable evidence is cryptographically sealed on-chain at delivery time, then verified against the fetched content at adjudication time.

## 📋 Contract Details

- **Network:** GenLayer Testnet Bradbury (LIVE)
- **Current Version:** v1.1.1
- **Contract Address:** `0x74300cc91f3E13e65822b919060f270d2bCE4194`
- **Explorer:** [View on GenLayer Explorer](https://explorer-studio.genlayer.com/address/0x74300cc91f3E13e65822b919060f270d2bCE4194)

## 🗺 Deployment History

| Version | Address | Purpose |
|---|---|---|
| **v1.1.1** (CURRENT) | `0x74300cc91f3E13e65822b919060f270d2bCE4194` | Sealed evidence + clean nondet closure |
| v1.1.0 | `0xAb243A38564BC2A3E3F738184b3A60E817A78337` | Evidence binding test suite (seal / verify / mismatch) |
| v1.0.0 | `0x020BEbbFA37b421F44Cc14ED485467969454f82D` | AI adjudication on visible text |
| v8.0 | `0xD4b28ce39A28fc5d4c43d9e85F1C4D3d6Eb5A815` | Safety mechanisms (timeouts, retry, appeal) |

## 🔏 Sealed Evidence Binding (the core guarantee)

Previous review feedback asked for freelancer-submitted immutable evidence to be *verified*, not just stored. v1.1.x implements exactly that:

1. **Seal at delivery:** `mark_delivered(escrow_id, url)` fetches the deliverable inside `gl.eq_principle.strict_eq`, extracts the visible text, and stores `sha256(text)` on-chain as `evidence_hash`. If the URL is not fetchable at delivery time, delivery is rejected.
2. **Verify at adjudication:** `resolve` fetches the URL again, recomputes the hash, and compares it with the sealed hash **before** any AI judgment.
3. **If the page changed after delivery:** verdict is `EVIDENCE_MISMATCH` → automatic refund; the mutated live content is never trusted or judged.
4. **If the hash matches:** the AI judges the verified content against the agreed `acceptance_criteria`.

This makes the evidence immutable and binding: mutable page content can no longer determine the verdict.

## 🧪 Test Matrix (all on Bradbury, verifiable on-chain)

### v1.1.1 — current contract

| Test | Result | Key tx |
|---|---|---|
| Happy path: seal + approve | `released`, hash `266d635b…` sealed | [approve](https://explorer-studio.genlayer.com/tx/0x79d3c7ccb4e45a5b0afa83caa4d4a4b419e609e8b10fb1e962d5754a4da8830a) |
| AI adjudication (refund path) with clean validator logs | `refunded` per AI verdict; payout executed | [resolve](https://explorer-studio.genlayer.com/tx/0x92cfa94f63034f660c9c64365d384c4c06b972454b1adedd7f771684c64e25f) |

Note: AI verdicts can vary across validator model mixes (inherent to LLM adjudication). The contract handles both outcomes symmetrically and safely; the appeal mechanism allows the losing party to contest.

### v1.1.0 — evidence binding suite

| Test | Result | Key tx |
|---|---|---|
| Seal + client approve | `released` with sealed hash | [approve](https://explorer-studio.genlayer.com/tx/0xf10be4d0dd02a2b67c48d0462e2e1449c010aed57e30c5b01eecb2af1) |
| AI approves verified deliverable | `APPROVED` → released | [resolve](https://explorer-studio.genlayer.com/tx/0xdca4ef4e6b53434617d0d38c30c5171c4470f4c04b3ae0e2b5736c0f9c8f48b0) |
| **Page mutated after delivery** | `EVIDENCE_MISMATCH` → refund, live content not trusted | [resolve](https://explorer-studio.genlayer.com/tx/0xf493a42f8d6799836eb7b2338ea79af4b6190cf957288b0f3cb01264ed356d60) |
| Dead URL at delivery | rejected: "not fetchable at delivery time" | [mark_delivered](https://explorer-studio.genlayer.com/tx/0x9d9859311d9da57f30f3e1f98830f81a0c3a111ddf20583f7e174fd2a9cd0464) |

### v1.0.0 — AI adjudication on visible text

| Test | Result | Key tx |
|---|---|---|
| Match (spinner vs spinner spec) | `APPROVED` → released | [resolve](https://explorer-studio.genlayer.com/tx/0x189be5b1b23e1bc358d74c6810d818c73b0ff66ce451eee0811dfa7936eeda65) |
| Mismatch (Flask job vs spinner page) | `REFUNDED` | [resolve](https://explorer-studio.genlayer.com/tx/0x92284c49eb16343873fbca1501d7189e7631294426831d16e103fe4f02b6d81e) |

### v8.0 — safety mechanisms

- Client-silence timeout (`timeout_release`), premature-timeout guard, immutable-delivery guard: [timeout guard](https://explorer-studio.genlayer.com/tx/0x468009efc7b8b562e18663f4077ad304658137ec839d5d207b7e9713212aa66f)
- Retry (3 attempts) + safety window + timeout refund: [timeout_refund](https://explorer-studio.genlayer.com/tx/0x9d1959ca0968260f57d3d1346fdab43b487f4eb11b8c1d5c92c74554adc5d3f0)
- Appeal + final AI round + finalize: [appeal](https://explorer-studio.genlayer.com/tx/0x9e2b47644c50ccb5d9c129777ff67096dcb7b9c35c67921c7c32d9fdf76af9a6)

## 💡 Technical Implementation

- **Payable custody:** `@gl.public.write.payable` + `gl.wasi.get_self_balance()` + on-chain transfers via `gl_call_generic({'EthSend': ...})`
- **Sealed evidence:** consensus `sha256` of extracted visible text at delivery; re-verified at adjudication
- **Consensus-safe time:** `gl.message_raw["datetime"]` for approve/appeal/safety windows
- **AI adjudication:** visible-text extraction (style/script/tags stripped) → `gl.nondet.exec_prompt` → canonical one-word verdict → `gl.eq_principle.strict_eq`
- **Safety:** retry with failure counting (no auto-payout on transient failure), one-shot appeal, mutual `agree_release`, authorization checks on every write method

## 🧪 How to Try It Yourself

1. Open https://studio.genlayer.com and deploy `contract.py`.
2. `create_escrow(freelancer, description, acceptance_criteria, approve_window_sec, appeal_window_sec)` with GEN value.
3. `mark_delivered(1, "<deliverable URL>")` — the contract seals the evidence hash on-chain.
4. Happy path: `approve(1)`.
5. AI path: `dispute(1)` → `resolve(1)` → check `get_escrow(1)` for `ai_verdict`, `evidence_hash`, `ai_reasoning`.
6. Try mutating the deliverable page after delivery and calling `resolve` again on a new escrow → expect `EVIDENCE_MISMATCH`.

## 📂 Files

- `contract.py` — GenEscrow source (v1.1.1)
- `README.md` — this documentation

## 🌐 Related

- Demo site: https://hoveiser.github.io/genesrow-frontend/
- Deliverable used in tests: https://hoveiser.github.io/hoveiser-genlayer-spinner/

## License

MIT
