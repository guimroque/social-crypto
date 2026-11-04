# social-crypto

Experiment in key custody for Fuel wallets: a wallet whose private key is never stored whole. The user holds one share, the server holds the other, and the key only exists in memory at signing time.

## Two schemes, side by side

`src/mpc.ts` implements both and compares them:

- **Additive 2-of-2** — a random user share is subtracted from the private key to produce the cloud share. Both halves are required; either one alone reveals nothing.
- **Shamir's Secret Sharing** — the key becomes the constant term of a random polynomial over the secp256k1 field. Any `t` of `n` shares reconstruct it, which buys fault tolerance the additive scheme doesn't have.

## Layout

| Path | What it is |
|---|---|
| `src/mpc.ts` | Both sharing schemes over secp256k1 (`@noble/secp256k1`, `shamirs-secret-sharing-ts`) |
| `src/social-wallet.ts` | Wallet built from a PIN: derives the share, rebuilds the key to sign, wraps a Bako `Vault` |
| `src/comms/` | JSON-RPC client and server that exchange shares, with tests |
| `src/server.ts` | File-backed store standing in for the custodian holding the cloud share |
| `src/validations.ts` | End-to-end checks: signature recovery against a Fuel test node, and a transfer on testnet |

## Running

```bash
pnpm install
pnpm redis     # optional, Redis container for the comms layer
pnpm mpc       # run the sharing schemes
pnpm dev       # build and run the validations
```

Needs `PIN`, `WALLET_KEY` and `NODE_URL` in the environment.

## Status

Proof of concept, not audited, not production. The custodian is a JSON file on disk — in a real deployment that side is an HSM or an enclave.

## Stack

TypeScript · Fuel SDK · bakosafe · @noble/curves · Shamir's Secret Sharing · Redis
