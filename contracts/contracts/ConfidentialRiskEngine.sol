// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct inEuint32 {
    bytes data;
    int32 securityZone;
}

struct Permission {
    bytes32 publicKey;
    bytes signature;
}

contract ConfidentialRiskEngine {
    struct MockRiskAnalysis {
        uint32 portfolioValue;
        uint32 collateralValue;
        uint32 liabilities;
        uint32 netAssetValue;
        uint32 leverageRatio;
        uint32 riskLevel; // 1 = Low, 2 = Medium, 3 = High
    }

    mapping(address => MockRiskAnalysis) private analyses;

    event RiskAnalyzed(address indexed user);

    // Helper to decode uint32 from bytes
    function _decodeUint32(bytes memory data) internal pure returns (uint32) {
        if (data.length < 4) return 0;
        uint32 val;
        assembly {
            val := mload(add(data, 32))
        }
        return val;
    }

    function analyze(
        inEuint32 calldata encryptedPortfolioValue,
        inEuint32 calldata encryptedCollateralValue,
        inEuint32 calldata encryptedLiabilities
    ) external {
        uint32 portfolioValue = _decodeUint32(encryptedPortfolioValue.data);
        uint32 collateralValue = _decodeUint32(encryptedCollateralValue.data);
        uint32 liabilities = _decodeUint32(encryptedLiabilities.data);

        // Net Asset Value (NAV) = (portfolioValue + collateralValue) > liabilities ? total - liabilities : 0
        uint32 totalAssets = portfolioValue + collateralValue;
        uint32 netAssetValue = totalAssets > liabilities ? totalAssets - liabilities : 0;

        // Leverage Ratio = liabilities * 100 / collateralValue
        uint32 leverageRatio = collateralValue > 0 ? (liabilities * 100) / collateralValue : 0;

        // Risk Level (1 = Low, 2 = Medium, 3 = High)
        uint32 riskLevel = 1;
        if (leverageRatio > 80 || netAssetValue < liabilities) {
            riskLevel = 3;
        } else if (leverageRatio > 50) {
            riskLevel = 2;
        }

        analyses[msg.sender] = MockRiskAnalysis({
            portfolioValue: portfolioValue,
            collateralValue: collateralValue,
            liabilities: liabilities,
            netAssetValue: netAssetValue,
            leverageRatio: leverageRatio,
            riskLevel: riskLevel
        });

        emit RiskAnalyzed(msg.sender);
    }

    function getAnalysis(
        Permission calldata /* permit */
    ) external view returns (
        uint32 portfolioValue,
        uint32 collateralValue,
        uint32 liabilities,
        uint32 netAssetValue,
        uint32 leverageRatio,
        uint32 riskLevel
    ) {
        MockRiskAnalysis memory analysis = analyses[msg.sender];
        return (
            analysis.portfolioValue,
            analysis.collateralValue,
            analysis.liabilities,
            analysis.netAssetValue,
            analysis.leverageRatio,
            analysis.riskLevel
        );
    }
}
