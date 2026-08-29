# GenEscrow Regression Harness

Checked in tests for the paths requested in the review: injection, mutation, and fetch-failure.

## Run

    pip install genlayer-test
    pytest tests/ -v

- `test_regression.py` — Direct Mode harness (mock_web / mock_llm / expect_revert):
  - injection: party text with prompt-injection wrapped in <data> tags; exact JSON verdict parsing; substring trick "NOT APPROVED" rejected
  - mutation: artifact sealed at delivery, mutated body at resolve => EVIDENCE_MISMATCH refund
  - fetch-failure: 404 mock => mark_delivered reverts, nothing sealed
  - guards: mutable URL rejected, wrong repository rejected
- `test_guards.py` — unit tests for URL whitelist, SHA case-insensitivity, owner/repo/path parsing, sanitize.

## On-chain evidence (Bradbury, contract 0xcC90a61f34ACD2C7773901Ca50290f6801F0078D)

- Injection neutralized (REFUNDED): tx 0x365907354ec124ed6a6b5aa7bfe37759ad5e5ffdea1a726fc65c5d17e094a286
- Mutable URL rejected: tx 0xaccf1d729dfea3a628a1af38ac9bb66dd6a46f1f2ac2816358e5e6b0c281448d
- 404 rejected at seal: tx 0xf9c65376edc8068ee9008fb3de45702756d7db878094949b9dbdfac2cc1c6eaf
- AI approved with on-chain reasoning: tx 0xb6a5508ff4ae7e5ad2aac06726978b356a9ac2975fae8c900a8c3aeb1d6faf3b
