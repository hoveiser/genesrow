# GenEscrow Regression Harness

Checked-in tests covering the review paths (injection, mutation, fetch-failure) plus the
v1.3.0 Milestone fixes (window bounds, address validation, gateway allowlist, raw-bytes seal).

## Run

    pip install "genlayer-test==0.29.2"
    pytest tests/ -v

The Direct Mode harness (`tests/conftest.py`) deploys and runs against the actual pinned
runner (not a stubbed `genlayer` module), so it exercises real address handling, real storage,
real payable enforcement, real EthSend capture, and the real prompt text sent to the model.

- `test_guards.py` - helpers on the deployed module: URL allowlist (accept and attack cases),
  SHA and owner/repo/path binding, per-line sanitize, and party-address validation.
- `test_regression.py` - Direct Mode (mock_web / mock_llm / expect_revert / run_validator):
  - injection: party text wrapped in <data> tags; exact JSON verdict parsing; substring trick
    "NOT APPROVED" rejected
  - mutation: artifact sealed at delivery, mutated body at resolve => EVIDENCE_MISMATCH refund
  - fetch-failure: 404 mock => mark_delivered reverts, nothing sealed
  - guards: mutable URL rejected, wrong repository rejected
  - validator disagreement and final-payout EthSend capture
- `test_adversarial.py` - Milestone-specific: window floor and ceiling reject (A1), an old
  unbounded window would strand a payout (A1), structural-index breakout neutralized in the
  actual prompt (A2), hidden-only mutation now caught as MISMATCH (A3), create-level bad
  freelancer rejects with no escrow created (A4).

## On-chain evidence (StudioNet, chain id 61999, contract 0x0CF5095A297763A167B0d2f1CDc921b63c100cE4)

Copied from raw explorer JSON under `evidence/verified/` (verify with `scripts/verify_transactions.py`).

- A1 over-ceiling create reverted: tx 0xfa52044d8c11dd07c6bd1ccd32a7cd44892e1b9f131c9ef337c979f0f038fe86
- A4 zero-address freelancer create reverted: tx 0x963c123b977d761e4d2f383d2bf4bd939e92d3e811bda84335030a8fd988b0e7
- A2 crafted breakout delivered and sealed: tx 0x37bed56dc1346e24167629b2a62247be11f05d1729d293bc881546594a590daf
- A2 legitimate verdict reached (REFUNDED, injection did not flip it): tx 0x10b566795ea5e3a537719b3a15346c17db8895a4e92e8c510396d4aec3f2a9c0
- Settlement with real balance change (finalize): tx 0x935cd04faa88aec33fb04dae8ba05bf466c0f2b77aad30641ebd4673ad89b6f7
