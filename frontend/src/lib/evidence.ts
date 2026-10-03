// Real, verified on-chain evidence captured from StudioNet for GenEscrow v1.3.0.
// Every hash below was recorded live (see backend repo evidence/*.json). The UI
// links reviewers straight to the explorer so each claim is independently
// checkable, and feeds the reachability panel with the actual validator results.

import { CONTRACT_ADDRESS, EXPLORER } from "./contract";

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (addr = CONTRACT_ADDRESS) => `${EXPLORER}/address/${addr}`;

export interface ProofTx {
  label: string;
  hash: string;
  note: string;
}

// v1.3.0 security-hardening proofs (A1-A5) plus a real settlement.
export const SECURITY_PROOFS: ProofTx[] = [
  {
    label: "A1 - Bounded windows",
    hash: "0xfa52044d8c11dd07c6bd1ccd32a7cd44892e1b9f131c9ef337c979f0f038fe86",
    note: "create_escrow with a 10-year appeal window reverted; nothing was locked.",
  },
  {
    label: "A2 - Injection did not flip verdict",
    hash: "0x37bed56dc1346e24167629b2a62247be11f05d1729d293bc881546594a590daf",
    note: "crafted breakout artifact delivered + sealed; arbitration still reached a legitimate REFUNDED.",
  },
  {
    label: "A2 - resolve (adjudication)",
    hash: "0x10b566795ea5e3a537719b3a15346c17db8895a4e92e8c510396d4aec3f2a9c0",
    note: "second AI round; injection inside <data> was treated as untrusted data only.",
  },
  {
    label: "A3 - Raw-byte seal",
    hash: "0x37bed56dc1346e24167629b2a62247be11f05d1729d293bc881546594a590daf",
    note: "evidence sealed as sha256 of the raw fetched bytes and re-verified by validators.",
  },
  {
    label: "A4 - Address validation",
    hash: "0x963c123b977d761e4d2f383d2bf4bd939e92d3e811bda84335030a8fd988b0e7",
    note: "create with the zero address reverted; no escrow was created.",
  },
  {
    label: "A5 - Reachable control (raw.github)",
    hash: "0xe67bc905caae2422cf3b0a914573009b90f67e24f3acaeb279d341dae2ee0942",
    note: "validators fetched and unanimously agreed the seal 09f62d91...",
  },
  {
    label: "A5 - ipfs.io NOT reachable",
    hash: "0x634a922f2a73f675e477a23804b8a045dfd10102b71f6588ad57d915045a28d7",
    note: "consensus-unanimous revert: URL not fetchable at delivery time (nondet_disagree=null).",
  },
  {
    label: "Settlement - finalize moved balance",
    hash: "0x935cd04faa88aec33fb04dae8ba05bf466c0f2b77aad30641ebd4673ad89b6f7",
    note: "finalize paid the recipient (77 -> 78 GEN) on chain.",
  },
];

// Historical v1.2.0 reference tests, kept as evidence of prior behavior.
export const HISTORICAL_TESTS: ProofTx[] = [
  {
    label: "Mutable URL guard",
    hash: "0xaccf1d729dfea3a628a1af38ac9bb66dd6a46f1f2ac2816358e5e6b0c281448d",
    note: "mark_delivered rejected a mutable GitHub Pages URL.",
  },
  {
    label: "Wrong repository rejected",
    hash: "0xbbba27fe569c1209a16edd04445ca5c44688a371945d4849fade11587350916f",
    note: "authenticity binding: 'Wrong repository'.",
  },
  {
    label: "Prompt injection -> REFUNDED",
    hash: "0x365907354ec124ed6a6b5aa7bfe37759ad5e5ffdea1a726fc65c5d17e094a286",
    note: "'IGNORE ALL PREVIOUS INSTRUCTIONS' did not flip the AI verdict.",
  },
  {
    label: "Unreachable artifact at seal time",
    hash: "0xf9c65376edc8068ee9008fb3de45702756d7db878094949b9dbdfac2cc1c6eaf",
    note: "404 never sealed: 'Deliverable URL not fetchable at delivery time'.",
  },
  {
    label: "AI approves with on-chain reasoning",
    hash: "0xb6a5508ff4ae7e5ad2aac06726978b356a9ac2975fae8c900a8c3aeb1d6faf3b",
    note: "resolve -> APPROVED; finalize 0x5af99856... paid out.",
  },
];

export interface GatewayReach {
  host: string;
  reachable: boolean | null; // null = allowlisted but not probed on chain
  detail: string;
  tx?: string;
}

// From evidence/ipfs_gateways.json (live on-chain probe against StudioNet).
export const GATEWAY_REACHABILITY: GatewayReach[] = [
  {
    host: "raw.githubusercontent.com",
    reachable: true,
    detail: "Validators fetched and sealed 09f62d91... (control).",
    tx: "0xe67bc905caae2422cf3b0a914573009b90f67e24f3acaeb279d341dae2ee0942",
  },
  {
    host: "ipfs.io",
    reachable: false,
    detail: "Consensus-unanimous revert (nondet_disagree=null); Cloudflare bot challenge blocks programmatic fetch.",
    tx: "0x634a922f2a73f675e477a23804b8a045dfd10102b71f6588ad57d915045a28d7",
  },
  {
    host: "gateway.ipfs.io",
    reachable: false,
    detail: "301 into ipfs.io, then the same challenge; not fetchable from validators.",
    tx: "0x4e60e39db180eda70adb4c5078b76cc0b95c7fe3353b120b002e3b8bf72bca9b",
  },
  {
    host: "dweb.link",
    reachable: false,
    detail: "Cloudflare challenge; unanimous revert on chain.",
    tx: "0x15a0467f81b04cc29762976de9fb82773e18fdddb7623b8219d5f8ce3d47c478",
  },
  {
    host: "github.com",
    reachable: null,
    detail: "Allowlisted (blob/commit at full SHA). Not separately probed for liveness.",
  },
  {
    host: "arweave.net",
    reachable: null,
    detail: "Allowlisted content-addressed gateway. Not separately probed for liveness.",
  },
];

export const SEAL_SAMPLE = {
  url: "https://raw.githubusercontent.com/hoveiser/genesrow/47dca83494a99b8e391efaed10dff4d5fdc9c642/demo/deliverable.py",
  raw_byte_sha256:
    "09f62d91bdb5fa8a5ec3b207c4e3e4030d7023b7e06e4e79f6fd745a63401314",
};

export const DEPLOY = {
  address: CONTRACT_ADDRESS,
  deploy_tx:
    "0x314a647a26fe002c3301ac29de52602a8af106d029801369a047417e7c7225f1",
  deployer: "0x3de43AA2f7162c80af98abe78222aE0Cdf83c506",
  deployed_bytes: 22485,
  sha256: "b6d8f2b71e6d918e83dc936391d66ad51b3dd946af8f923e499377ca2eaefe70",
  byte_match: true,
};

export const RELEASE_URL =
  "https://github.com/hoveiser/genesrow/releases/tag/v1.3.0";
