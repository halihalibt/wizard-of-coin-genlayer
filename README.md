# Wizard of Coin

A browser-playable GenLayer wizard challenge connected to the optimized contract deployed on **Stable Studionet**.

## Live contract

- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Contract: [`0x09903c4f4160b7a55FaE88951a682019038B2593`](https://explorer-studio.genlayer.com/address/0x09903c4f4160b7a55FaE88951a682019038B2593)
- Deployment / reference transaction: [`0x437174db51141deb2d52ff952dd3539e8b0271c21c7c142fbbfb3ff7b618f851`](https://explorer-studio.genlayer.com/tx/0x437174db51141deb2d52ff952dd3539e8b0271c21c7c142fbbfb3ff7b618f851)

## What the app does

- Connects an injected EIP-1193 wallet (MetaMask or OKX Wallet).
- Switches the wallet to Stable Studionet (61999).
- Sends the player's 1–1,000 character message to `test_prompt(request)`.
- Waits for the GenLayer transaction to finalize and checks the execution result.
- Reads `get_last_result()` and `get_winners_count()` from the contract.
- Links every submitted transaction to the Studionet explorer.

## Contract interface

The frontend is intentionally limited to methods present in the supplied contract:

| Method | Purpose |
| --- | --- |
| `test_prompt(request: str)` | Submit a persuasion attempt for GenLayer consensus |
| `get_last_result()` | Read the latest attempt and the wizard's reply |
| `get_winners_count()` | Read the number of recorded winners |

The contract source is preserved at [`contracts/wizard_of_coin_target.py`](contracts/wizard_of_coin_target.py).

## Reward scope

The supplied contract records challenge outcomes; it does **not** implement GLP token balances, token transfers, a claim method, or the screenshot's 50 GLP / 1,000 GLP payouts. Those amounts are shown as game-theme reference values only and are explicitly marked as not payable by this contract. No reward is represented as claimed or transferred.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Configuration

The target network and contract address are defined in `src/lib/genlayer.ts`. No private key or server-side wallet is stored in this repository. All writes require the visitor to approve the transaction in their own wallet.

## Notes

- The frontend uses `genlayer-js@1.1.8` and the stable `studionet` network preset.
- A consensus write may take time. The transaction hash remains available in the UI while the app waits for finalization.
- The app does not simulate a successful verdict or fabricate on-chain reward balances.
