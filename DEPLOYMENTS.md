# CipherRisk: Deployment & Submission Details

This file contains the final deployment addresses, blockchain explorer links, and configuration details for the **CipherRisk** submission.

---

## 🔗 Smart Contract Deployments (Ethereum Sepolia Testnet)

Both the public transparent engine and the private FHE-shielded risk engine are deployed and active on the Ethereum Sepolia Testnet.

### 1. Transparent Risk Engine
* **Contract Address:** `0x125AaC5aeFf0fb76F08236384c54518D44bF41Df`
* **Etherscan Link:** [0x125AaC...41Df](https://sepolia.etherscan.io/address/0x125AaC5aeFf0fb76F08236384c54518D44bF41Df)
* **Function:** Ingests standard plaintext variables to evaluate risk metrics publicly on-chain.

### 2. Confidential Risk Engine (FHE-Shielded)
* **Contract Address:** `0x7849E2Bb306ab4bAeE523922222a2Fe3A4af3B8f`
* **Etherscan Link:** [0x7849E2...3B8f](https://sepolia.etherscan.io/address/0x7849E2Bb306ab4bAeE523922222a2Fe3A4af3B8f)
* **Function:** Ingests locally-encrypted TFHE inputs, performs on-chain homomorphic calculations, shields internal state updates, and verifies permit signatures for decryption.

---

## 🌐 Frontend & Deployment Configuration

The React/Next.js dashboard utilizes Web3 Provider clients (`ConnectKit` + `Wagmi`) configured with the following parameters:

* **Target Network:** Ethereum Sepolia (Chain ID: `11155111`) / Fhenix Helium Testnet (Chain ID: `8008135`).
* **Vercel Deployments Settings:**
  * Strict peer checks are bypassed dynamically during deployment via `.npmrc` containing `legacy-peer-deps=true`.
  * Production builds compile successfully under **~14 seconds** using custom Webpack module fallbacks (`fs`, `net`, `tls`, `crypto` = `false`).

---

*For technical implementation specifics and structural workflows, see [README.MD](README.MD) and [FHE_EXPLAINER.md](FHE_EXPLAINER.md).*
