# GenEscrow - v1.3.0

**AI-adjudicated escrow with authenticated artifacts, sealed evidence, on-chain reasoning, and leader/validator consensus**

A decentralized escrow contract on GenLayer where deliverables must be authenticated immutable artifacts (GitHub commits at full SHA, IPFS CIDs, or Arweave), evidence is cryptographically sealed at delivery, AI validators adjudicate disputes with on-chain reasoning, and payouts execute automatically based on consensus verdicts.

## Contract Details

- **Network:** GenLayer StudioNet (chain id 61999, live)
- **Current Version:** v1.3.0
- **Contract Address:** `0x0CF5095A297763A167B0d2f1CDc921b63c100cE4`
- **Deploy TX:** [`0x314a647a26fe002c3301ac29de52602a8af106d029801369a047417e7c7225f1`](https://explorer-studio.genlayer.com/tx/0x314a647a26fe002c3301ac29de52602a8af106d029801369a047417e7c7225f1)
- **Explorer:** [View contract on StudioNet](https://explorer-studio.genlayer.com/address/0x0CF5095A297763A167B0d2f1CDc921b63c100cE4)
- **Stored source byte-match:** the on-chain source returned by `gen_getContractCode` is byte-identical to `contract.py` (22485 bytes both sides). Re-verify any time with `python scripts/verify_deployment.py` (read-only, writes `evidence/verify_deployment.json`); also see `evidence/deploy.json` and `evidence/stored_source.bin`.

## Demo videos (captions only)

- Lifecycle demo: [genesrow_demo.mp4](https://github.com/hoveiser/genesrow/releases/download/v1.3.0/genesrow_demo.mp4) (68s) - the two-account escrow end to end, from the actual stdout of `demo/demo_two_account.py` run live against StudioNet.
- Security hardening (educational captions, 68s, 1920x1080): [genesrow_security_v2.mp4](https://github.com/hoveiser/genesrow/raw/main/evidence/genesrow_security_v2.mp4) - full-sentence subtitles that explain each audit closure A1 through A5, the on-chain reachability proof, and the byte-match check (feature + benefit + technical detail), built by `scripts/build_security_video_v2.py`.
- Security hardening (brief labels, 52s): [genesrow_security.mp4](https://github.com/hoveiser/genesrow/releases/download/v1.3.0/genesrow_security.mp4) - one segment per audit closure A1 through A5 plus the byte-match check, each showing the real on-chain result copied from `evidence/scenario.json`, `evidence/ipfs_gateways.json`, and `evidence/verify_deployment.json` (built by `scripts/build_security_video.py`).

Both are hosted as GitHub release assets on the `v1.3.0` tag. Plain note on what these are and are not: there is no offline text-to-speech in the build environment, so the videos are captions-only with no voiceover. They render real transcript and evidence values, and nothing is retyped or fabricated. A GitHub release download link is not itself embeddable on platforms that require a native YouTube or X video, so if you want them embedded there you will need to re-upload the files yourself.

## Interactive UI (frontend/)

A production React UI now lives in [frontend/](./frontend) and is the merged home of the former
`genesrow-frontend` repo (kept only as a redirect). It lets a reviewer exercise the v1.3.0 rules
directly in the browser: create an escrow (A1 window bounds + A4 address validation with the
contract's own revert order), submit a delivery and watch the sha256 seal computed over the raw
fetched bytes (A3) after the gateway allowlist parses the URL (A5), and raise a dispute to see the
exact arbitration prompt with the sanitized structural index (A2). A security dashboard lists A1-A6
with the on-chain validator-reachability table, and a live status card shows the deployed address,
byte-match result, and pool balance.

- **Live site:** https://hoveiser.github.io/genesrow/ (deployed from this repo via `.github/workflows/pages.yml`)
- The UI reads the deployed StudioNet address and links every claim to a finalized explorer transaction.

On-chain create, deliver, and settlement actions are demonstrated through faithful local simulation
plus the recorded StudioNet transactions (the UI labels the verdict as a local simulation; the real
verdicts come from on-chain AI validators). This is deliberate: ethers/viem cannot drive GenLayer
intelligent-contract writes, and a public static site must never embed a signing key. To reproduce
real writes, use the backend `scripts/` against your own key.

Run it locally: `cd frontend && npm install && npm run dev` (build with `npm run build`).

## Changes from v1.2.0 to v1.3.0 (Milestone)

Each item below was verified against the real pinned SDK before being fixed, and each has a test plus a mutation check (the fix was reverted in a scratch copy outside the tracked tree and the matching test confirmed to fail).

1. **Window upper bounds (A1).** `create_escrow` previously only floored `approve_window` and `appeal_window`, so a party could set a multi-year window and strand the counterparty's payout indefinitely (finalize and timeout exits are gated on the window closing). Both windows are now bounded to `[60s, 7 days]`, validated before any state change. Tests: `test_window_floor_and_ceiling_rejected`, `test_old_unbounded_window_would_strand_payout`.
2. **Structural index sanitization (A2).** The delivery structural index was built from raw source lines with no per-line tag stripping or length cap, so a crafted line could break out of the untrusted-data wrapper and inject instructions into the arbitration prompt. Every index line is now sanitized the same way party text already was (markup neutralized, per-line and total caps). Test asserts neutralization in the actual prompt sent to the model: `test_structural_index_breakout_neutralized_in_prompt`.
3. **Seal covers raw bytes (A3).** The sealed hash was computed over cleaned, visible text, so bytes hidden inside constructs stripped before hashing (for example style or script blocks) were not bound to the seal even though they could still reach the prompt through the structural index. The seal now covers the raw fetched bytes, so any mutation anywhere in the artifact is caught. Test: `test_hidden_only_mutation_now_caught` (a hidden-only mutation now resolves to `EVIDENCE_MISMATCH`, where it previously did not).
4. **Freelancer address validation (A4).** `create_escrow` stored the freelancer field as a raw string with no format check, no zero-address check, and no check that it differs from the client. It is now parsed and validated (reject malformed, reject zero, reject equal to the client) before any escrow is created. Tests: `test_party_address_validation_*` and `test_create_rejects_bad_freelancer` (each asserts no escrow was created).
5. **Evidence gateway allowlist + path normalization (A5).** The single hardcoded gateway prefix was replaced with a small allowlist of gateway hosts validated by an anchored parser resistant to lookalike hosts, userinfo tricks, wrong scheme, wrong port, query strings, fragments, dot-segment path traversal, and case/unicode tricks. The sealed content hash remains the actual integrity guarantee, so gateway choice does not affect trust. Reachability was then checked on chain from the validator network, not just local egress: only commit-pinned `raw.githubusercontent.com` is proven validator-reachable, and the three IPFS entries are shown to be unreachable from validators today (see Gateway reachability below). Tests: `test_authenticated_accepts_allowlisted`, `test_authenticated_rejects_attacks`.
6. **Real-runtime test harness (A6).** The Direct Mode suite previously ran against a stubbed `genlayer` module injected into `sys.modules`, so it never exercised real address handling, real storage, real payable enforcement, or real balance movement. The harness (`tests/conftest.py`) now deploys and runs against the actual pinned runner, capturing real EthSend calls and the real prompt text sent to the model. All A1 through A5 tests run against this real runtime.
7. **Repo hygiene and network label (A8).** The two non-identical contract copies are collapsed to a single canonical `contract.py` (the one that is deployed and tested); the stale `contracts/contract.py` (which carried a dead `jobs` field never present in the deployed source) is removed. The network label is corrected from "Testnet Bradbury" to StudioNet (chain id 61999) everywhere; the explorer links always pointed at `explorer-studio.genlayer.com`, which is StudioNet.

Behavior and public method signatures are otherwise unchanged from v1.2.0.

### On-chain proof for v1.3.0 (StudioNet, chain id 61999)

All hashes below are copied from raw explorer JSON records under `evidence/verified/` (verified with `scripts/verify_transactions.py`); none are hand-typed. The explorer HTML is an empty client shell, so all evidence comes from its JSON API with a real User-Agent.

**Live scenario** (`scripts/run_studionet_scenario.py`, escrow id 2, 7/7 checks passed):

| Step | TX | Result |
|---|---|---|
| A1 over-ceiling create (10-year appeal window) | [`0xfa52044d8c11dd07c6bd1ccd32a7cd44892e1b9f131c9ef337c979f0f038fe86`](https://explorer-studio.genlayer.com/tx/0xfa52044d8c11dd07c6bd1ccd32a7cd44892e1b9f131c9ef337c979f0f038fe86) | reverted (ERROR), no funds locked |
| A4 zero-address freelancer create | [`0x963c123b977d761e4d2f383d2bf4bd939e92d3e811bda84335030a8fd988b0e7`](https://explorer-studio.genlayer.com/tx/0x963c123b977d761e4d2f383d2bf4bd939e92d3e811bda84335030a8fd988b0e7) | reverted (ERROR), no funds locked |
| create_escrow (bounded windows, 1 GEN) | [`0x407d594f80c5c2c0fe6a4ef38a0d0871e27f6584c5aee423c999e5a89767d4c2`](https://explorer-studio.genlayer.com/tx/0x407d594f80c5c2c0fe6a4ef38a0d0871e27f6584c5aee423c999e5a89767d4c2) | SUCCESS, funded |
| mark_delivered (crafted breakout artifact) | [`0x37bed56dc1346e24167629b2a62247be11f05d1729d293bc881546594a590daf`](https://explorer-studio.genlayer.com/tx/0x37bed56dc1346e24167629b2a62247be11f05d1729d293bc881546594a590daf) | SUCCESS, sealed `09f62d91bdb5fa8a5ec3b207c4e3e4030d7023b7e06e4e79f6fd745a63401314` |
| request_ai_review | [`0x6aae12cb532b006fab3d6c710d498f9cd14a76d1a2b466047b5cba8d10c239f3`](https://explorer-studio.genlayer.com/tx/0x6aae12cb532b006fab3d6c710d498f9cd14a76d1a2b466047b5cba8d10c239f3) | SUCCESS |
| resolve (live AI consensus) | [`0x10b566795ea5e3a537719b3a15346c17db8895a4e92e8c510396d4aec3f2a9c0`](https://explorer-studio.genlayer.com/tx/0x10b566795ea5e3a537719b3a15346c17db8895a4e92e8c510396d4aec3f2a9c0) | verdict REFUNDED (injected breakout did not flip it) |
| finalize (settle) | [`0x935cd04faa88aec33fb04dae8ba05bf466c0f2b77aad30641ebd4673ad89b6f7`](https://explorer-studio.genlayer.com/tx/0x935cd04faa88aec33fb04dae8ba05bf466c0f2b77aad30641ebd4673ad89b6f7) | SUCCESS, recipient balance 77 to 78 GEN |

The resolve reasoning stored on chain: "Validators independently re-ran the audit and agreed on verdict REFUNDED. The deliverable fails to define the required top-level function named finalize_payout." This is the A2 proof on real validators: the crafted structural-index breakout line was neutralized and arbitration still reached a legitimate verdict.

**Gateway reachability (A5).** Delivery seals the evidence through `strict_eq`, so a `mark_delivered` that FINALIZES with a real `evidence_hash` means every validator independently fetched the URL and agreed on the raw-byte hash. The scenario delivered via `raw.githubusercontent.com` and reached that consensus, so it is confirmed validator-reachable on chain.

The three IPFS entries in the allowlist (ipfs.io, gateway.ipfs.io, dweb.link) were then probed the same way on chain with `scripts/probe_ipfs_gateways.py` (one content-addressed object requested through each gateway, plus a `raw.githubusercontent.com` control under identical conditions). Raw explorer JSON is in `evidence/txs/` and `evidence/verified/`, summarized in `evidence/ipfs_gateways.json`:

| Gateway | Deliver TX | On-chain result | Validator-reachable? |
|---|---|---|---|
| raw.githubusercontent.com (control) | [`0xe67bc905caae2422cf3b0a914573009b90f67e24f3acaeb279d341dae2ee0942`](https://explorer-studio.genlayer.com/tx/0xe67bc905caae2422cf3b0a914573009b90f67e24f3acaeb279d341dae2ee0942) | SUCCESS, sealed `09f62d91...` | Yes |
| ipfs.io | [`0x634a922f2a73f675e477a23804b8a045dfd10102b71f6588ad57d915045a28d7`](https://explorer-studio.genlayer.com/tx/0x634a922f2a73f675e477a23804b8a045dfd10102b71f6588ad57d915045a28d7) | reverted, `nondet_disagree=null` | No |
| gateway.ipfs.io | [`0x4e60e39db180eda70adb4c5078b76cc0b95c7fe3353b120b002e3b8bf72bca9b`](https://explorer-studio.genlayer.com/tx/0x4e60e39db180eda70adb4c5078b76cc0b95c7fe3353b120b002e3b8bf72bca9b) | reverted, `nondet_disagree=null` | No |
| dweb.link | [`0x15a0467f81b04cc29762976de9fb82773e18fdddb7623b8219d5f8ce3d47c478`](https://explorer-studio.genlayer.com/tx/0x15a0467f81b04cc29762976de9fb82773e18fdddb7623b8219d5f8ce3d47c478) | reverted, `nondet_disagree=null` | No |

**Plainly stated: as of this proof none of the three allowlisted IPFS gateways are fetchable from the StudioNet validator network.** Each delivery reverted with the identical on-chain error `AssertionError: Deliverable URL not fetchable at delivery time`, and `nondet_disagree=null` shows this was a unanimous validator agreement, not an ambiguous no-consensus. From this build environment the same hosts return Cloudflare `429`/`403` (a JS "Just a moment..." challenge for browser UAs, a rate-limit for programmatic UAs), and `gateway.ipfs.io` is only a `301` into `ipfs.io`; the GenLayer web driver is a programmatic fetcher and cannot pass that wall. These hosts are allowlisted only for structural completeness of the URL parser. A real escrow must point its deliverable at a gateway validators can actually reach, which on StudioNet today means `raw.githubusercontent.com` (commit-pinned). This is the same class of gap that made FairPay's original ipfs.io-only design fail on chain, which is why it was verified on chain rather than inferred from local egress. `github.com/blob` and `arweave.net` were not proven validator-reachable here: `github.com/blob` returns a non-byte-stable HTML wrapper (it would break the seal), and `arweave.net` was only seen reachable from local egress, so neither should be treated as confirmed.

## Try it yourself

Prereqs: Python 3.12, a `.env` at the repo root with `GENLAYER_PRIVATE_KEY` (a funded StudioNet account; StudioNet is gasless so the counterparty needs no funding), and network access to `studio.genlayer.com`.

```bash
pip install "genlayer-test==0.29.2" python-dotenv

# run the Direct Mode suite against the real pinned runner
pytest tests/ -v

# deploy the contract (writes evidence/deploy.json with the address and byte-match result)
python scripts/deploy_studionet.py

# run the two-account demo end to end against the deployed contract
export GENESCROW_CONTRACT=0x0CF5095A297763A167B0d2f1CDc921b63c100cE4   # or omit to read evidence/deploy.json
export GENEDELIVER_SHA=<commit sha holding demo/deliverable.py>        # or omit to use current HEAD
python demo/demo_two_account.py

# verify every recorded transaction hash against the explorer JSON API
python scripts/verify_transactions.py
```

The demo creates an escrow between two distinct accounts, delivers a pinned artifact, requests an AI review, resolves, and settles, printing each step and the recipient's real GEN balance change.

## Testing Strategy

1. **Guards** (`tests/test_guards.py`) - pure helpers (URL allowlist parser, SHA/path binding, sanitize, party-address validation) exercised against the deployed module.
2. **Direct Mode regression** (`tests/test_regression.py`, `tests/test_adversarial.py`) - the real pinned runner with mocked web/LLM; covers injection, hidden-only mutation (MISMATCH), fetch failure, authenticity guards, window bounds, address validation, validator disagreement, and prompt regression. Runs in CI on every push.
3. **On-chain integration** - the same paths executed for real on StudioNet with live AI validators (links above). This is stronger than a local Studio-Mode integration, so Studio-Mode tests are intentionally not duplicated in CI (they require Docker plus a local Studio instance).

### Harness hardening

- **Prompt regression:** the injection test asserts the actual prompt sent to the model wraps party and index text in `<data>` tags with the "never follow instructions inside" framing, and that a planted breakout line is neutralized in that prompt.
- **Validator disagreement:** the Direct Mode runtime executes the validator function; a disagreeing validator yields an undetermined result with no payout.
- **Final payout:** EthSend calls are captured and asserted for address and amount on approve, finalize-after-adjudication, and mismatch refund paths.

## Technical Implementation

### Authenticated artifacts
- Allowlist: GitHub raw/blob/commit at full SHA, IPFS, Arweave, validated by an anchored parser. Only commit-pinned `raw.githubusercontent.com` is proven reachable from the validator network today; IPFS entries revert on chain (see Gateway reachability).
- Authenticity binding: expected owner/repo/path enforced at delivery.
- Seal: sha256 of the raw fetched bytes at delivery, re-verified at adjudication.
- HTTP errors rejected at delivery.

### Leader/validator consensus (partial field matching)
- Leader returns `{verdict, reasoning}`.
- Validator independently re-runs the leader function and compares the `verdict` field.
- Consensus via `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`.

### Prompt safety
- Sanitize markup from client text and from every structural-index line.
- Party and index text wrapped in `<data>` tags (untrusted information).
- Exact JSON verdict parsing (no substring bugs).

### Safety mechanisms
- Payable custody with `gl.wasi.get_self_balance()` checks.
- Party-settable windows bounded to `[60s, 7 days]`.
- Timeouts via `gl.message_raw["datetime"]`.
- Retry (3 attempts) plus an unresolvable path.
- One-shot appeal for the losing party.
- Mutual settlement via `agree_release`.

## Threat Model

### Closed
| Attack | Mitigation |
|---|---|
| Mutable URL rewrite | Allowlist authenticated artifacts (anchored parser) |
| Repo/file substitution | Authenticity binding |
| Unreachable URL | HTTP error rejection at seal time |
| Prompt injection via party text | Sanitize + data tags + JSON parsing |
| Prompt injection via structural index | Per-line sanitize + caps (A2) |
| Substring parsing bug | Exact JSON field match |
| Artifact mutation after delivery | Seal over raw bytes, re-verified (A3) |
| Hidden-region mutation not bound to seal | Raw-bytes seal (A3) |
| Malformed / zero / self-address freelancer | Address validation before create (A4) |
| Lookalike / userinfo / traversal gateway trick | Anchored allowlist parser (A5) |
| Over-long window stranding a payout | Window upper bounds (A1) |

### Residual (inherent)
1. **LLM verdict variance** - the one-shot appeal mechanism addresses this.
2. **Vague acceptance criteria** - the freelancer must review before starting.
3. **Gateway availability** - a gateway can pass local egress yet be unreachable from validators (FairPay's ipfs.io lesson). The allowlist is a liveness aid, not a trust anchor: the sealed hash is the guarantee, and a deliverable must point at a gateway validators can reach (commit-pinned GitHub raw today).
4. **Consensus divergence** - GenLayer protocol behavior, leader rotation.

## Files
- `contract.py` - the single canonical GenEscrow source (v1.3.0), deployed and tested.
- `frontend/` - interactive React UI (merged from the former `genesrow-frontend` repo); deploys to GitHub Pages via `.github/workflows/pages.yml`. `frontend/legacy/` keeps the superseded static demo for reference.
- `tests/` - Direct Mode suite on the real pinned runner.
- `demo/` - `demo_two_account.py` (reviewer-runnable lifecycle) and `deliverable.py` (the pinned artifact used as evidence).
- `scripts/` - StudioNet deploy, live scenario, gateway probes (local determinism + on-chain IPFS validator reachability), deployment byte-match verification, transaction verification, and the two caption-video builds.
- `evidence/` - raw explorer JSON for the deploy, scenario, demo, gateway reachability probe, and verification summary.
- `README.md` - this documentation.

## Related
- **FairPay** (AI-audited payroll): https://github.com/hoveiser/fairpay
- **GenLayer Studio:** https://studio.genlayer.com

## License
MIT
