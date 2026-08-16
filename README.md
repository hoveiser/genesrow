# 🔐 GenEscrow

**AI-Powered Escrow on GenLayer — Trust without Intermediaries**

A decentralized escrow smart contract that uses **AI validators** to adjudicate disputes between freelancers and clients. No human middlemen, no delays, no trust required.

## 📋 Contract Details

- **Network:** GenLayer Testnet Bradbury
- **Contract Address:** `0x8aa44994aFa5229E17CC18D0845E3Ff896dfB966`
- **Explorer:** [View on GenLayer Explorer](https://explorer-studio.genlayer.com/address/0x8aa44994aFa5229E17CC18D0845E3Ff896dfB966)
- **Deploy Transaction:** `0x3792c0517271c72ea6ad87f7a75594ee59efca9e28a6e7685a6f83f620e0e76e`
- **Validators:** Mistral, Gemini, Kimi (real AI models on testnet)

## 🎯 How It Works

1. **Client** creates an escrow and deposits GEN tokens
2. **Freelancer** marks work as delivered (provides a URL to the deliverable)
3. **Client** can approve → funds released to freelancer
4. If a **dispute** arises → AI validators fetch the deliverable URL, inspect content, and vote APPROVED or REFUNDED
5. **Consensus reached** → funds released or refunded automatically

### State Machine

- `funded` → `delivered` → `released` (client approves)
- `delivered` → `disputed` → AI verdict → `released` or `refunded`

## 🧪 Test Results (Real Transactions on Bradbury)

### ✅ Test Case 1: Valid Deliverable → RELEASED

- **Job:** Write a short article about GenLayer
- **Deliverable URL:** https://hoveiser.github.io/hoveiser-genlayer-spinner/
- **Amount:** 20 GEN
- **AI Verdict:** APPROVED (validators fetched the page and confirmed it matches the description)
- **Final Status:** `released`

### ✅ Test Case 2: Invalid Deliverable (DNS failure) → REFUNDED

- **Job:** Build a React Native mobile app with 10 screens
- **Deliverable URL:** https://this-url-does-not-exist-404.example.com/fake-app
- **Amount:** 100 GEN
- **AI Verdict:** REFUNDED (contract detected DNS failure gracefully)
- **Final Status:** `refunded`
- **Key Feature:** Robust error handling — contract doesn't crash on unreachable URLs, it auto-refunds

## 🚀 Usage

### Create Escrow

    create_escrow(
        freelancer="0x...",
        job_description="Build a landing page",
        deliverable_url="https://example.com",
        amount=50
    )

### Freelancer Marks Delivered

    mark_delivered(escrow_id=1)

### Client Approves (Happy Path)

    approve(escrow_id=1)

### Client Disputes

    dispute(escrow_id=1)

### AI Resolves Dispute

    resolve(escrow_id=1)
    # Validators fetch the URL, AI votes, consensus reached, funds transferred

### Query State

    get_escrow(escrow_id=1)  # Returns JSON of one escrow
    get_all()                # Returns JSON of all escrows

## 💡 Technical Implementation

- Built with **py-genlayer v0.2.16**
- Persistent state using `TreeMap[str, str]`
- AI calls via `gl.nondet.exec_prompt`
- Consensus via `gl.eq_principle.strict_eq`
- Web fetching via `gl.nondet.web.get`
- Error handling for DNS failures and HTTP 4xx/5xx errors
- Authorization checks on every write method

## 📂 Files

- `contract.py` — GenEscrow smart contract source code
- `README.md` — This documentation

## 🌐 Related Work

- **GenLayer Spinner Design:** [hoveiser-genlayer-spinner](https://github.com/hoveiser/hoveiser-genlayer-spinner) — Loading spinner submitted for the GenLayer Portal
- **GenLayer Studio:** https://studio.genlayer.com
- **GenLayer Docs:** https://docs.genlayer.com

## License

MIT
