export const TRANSPARENT_RISK_ENGINE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Deployed Sepolia/Holesky address
export const CONFIDENTIAL_RISK_ENGINE_ADDRESS = "0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9"; // Deployed Helium address

export const TRANSPARENT_RISK_ENGINE_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "portfolioValue", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "collateralValue", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "liabilities", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "netAssetValue", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "leverageRatio", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "riskLevel", "type": "uint256" }
    ],
    "name": "RiskAnalyzed",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_portfolioValue", "type": "uint256" },
      { "internalType": "uint256", "name": "_collateralValue", "type": "uint256" },
      { "internalType": "uint256", "name": "_liabilities", "type": "uint256" }
    ],
    "name": "analyze",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "getAnalysis",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "portfolioValue", "type": "uint256" },
          { "internalType": "uint256", "name": "collateralValue", "type": "uint256" },
          { "internalType": "uint256", "name": "liabilities", "type": "uint256" },
          { "internalType": "uint256", "name": "netAssetValue", "type": "uint256" },
          { "internalType": "uint256", "name": "leverageRatio", "type": "uint256" },
          { "internalType": "uint256", "name": "riskLevel", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "internalType": "struct TransparentRiskEngine.RiskAnalysis",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const CONFIDENTIAL_RISK_ENGINE_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "RiskAnalyzed",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "bytes", "name": "data", "type": "bytes" },
          { "internalType": "int32", "name": "securityZone", "type": "int32" }
        ],
        "internalType": "struct inEuint32",
        "name": "encryptedPortfolioValue",
        "type": "tuple"
      },
      {
        "components": [
          { "internalType": "bytes", "name": "data", "type": "bytes" },
          { "internalType": "int32", "name": "securityZone", "type": "int32" }
        ],
        "internalType": "struct inEuint32",
        "name": "encryptedCollateralValue",
        "type": "tuple"
      },
      {
        "components": [
          { "internalType": "bytes", "name": "data", "type": "bytes" },
          { "internalType": "int32", "name": "securityZone", "type": "int32" }
        ],
        "internalType": "struct inEuint32",
        "name": "encryptedLiabilities",
        "type": "tuple"
      }
    ],
    "name": "analyze",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "bytes32", "name": "publicKey", "type": "bytes32" },
          { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "internalType": "struct Permission",
        "name": "permit",
        "type": "tuple"
      }
    ],
    "name": "getAnalysis",
    "outputs": [
      { "internalType": "uint32", "name": "portfolioValue", "type": "uint32" },
      { "internalType": "uint32", "name": "collateralValue", "type": "uint32" },
      { "internalType": "uint32", "name": "liabilities", "type": "uint32" },
      { "internalType": "uint32", "name": "netAssetValue", "type": "uint32" },
      { "internalType": "uint32", "name": "leverageRatio", "type": "uint32" },
      { "internalType": "uint32", "name": "riskLevel", "type": "uint32" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
