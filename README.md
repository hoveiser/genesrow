# GenEscrow - AI-Powered Escrow on GenLayer

A decentralized escrow smart contract that uses AI validators to adjudicate disputes between freelancers and clients.

## Features

- ✅ **Trustless escrow** - No human middlemen required
- 🤖 **AI-powered dispute resolution** - Validators fetch deliverables and vote
- 🔄 **Full state machine** - funded → delivered → disputed → resolved
- 🛡️ **Robust error handling** - Gracefully handles unreachable URLs
- 📊 **Consensus-based** - Multiple AI validators reach agreement

## How It Works

1. **Client** creates escrow and deposits GEN tokens
2. **Freelancer** marks work as delivered (provides URL)
3. **Client** can approve → funds released to freelancer
4. If **dispute** arises → AI validators fetch the deliverable URL, inspect content, and vote APPROVED or REFUNDED
5. **Consensus reached** → funds released or refunded automatically

## Contract Details

- **Network:** GenLayer Testnet Bradbury
- **Contract Address:** [CONTRACT_ADDRESS_HERE]
- **Validators:** Mistral, Gemini, Kimi (real AI models)

## Test Results

### Test Case 1: Valid Deliverable ✅
- **Job:** Write a short article about GenLayer
- **URL:** https://hoveiser.github.io/hoveiser-genlayer-spinner/
- **Amount:** 20 GEN
- **AI Verdict:** APPROVED
- **Final Status:** RELEASED

### Test Case 2: Invalid Deliverable (404) ✅
- **Job:** Build a React Native mobile app
- **URL:** https://this-url-does-not-exist-404.example.com/fake-app
- **Amount:** 100 GEN
- **AI Verdict:** REFUNDED (URL unreachable)
- **Final Status:** REFUNDED

## Usage

### Create Escrow
```python
create_escrow(
    freelancer="0x...",
    job_description="Build a landing page",
    deliverable_url="https://example.com",
    amount=50
)
