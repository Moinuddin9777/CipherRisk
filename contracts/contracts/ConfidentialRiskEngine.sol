// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@fhenixprotocol/contracts/FHE.sol";
import "@fhenixprotocol/contracts/access/Permissioned.sol";

contract ConfidentialRiskEngine is Permissioned {
    struct EncryptedRiskAnalysis {
        euint32 portfolioValue;
        euint32 collateralValue;
        euint32 liabilities;
        euint32 netAssetValue;
        euint32 leverageRatio;
        euint32 riskLevel; // 1 = Low, 2 = Medium, 3 = High
    }

    mapping(address => EncryptedRiskAnalysis) private analyses;

    event RiskAnalyzed(address indexed user);

    function analyze(
        inEuint32 calldata encryptedPortfolioValue,
        inEuint32 calldata encryptedCollateralValue,
        inEuint32 calldata encryptedLiabilities
    ) external {
        euint32 portfolioValue = FHE.asEuint32(encryptedPortfolioValue);
        euint32 collateralValue = FHE.asEuint32(encryptedCollateralValue);
        euint32 liabilities = FHE.asEuint32(encryptedLiabilities);

        // Net Asset Value (NAV) = (portfolioValue + collateralValue) > liabilities ? total - liabilities : 0
        euint32 totalAssets = FHE.add(portfolioValue, collateralValue);
        ebool isNavPositive = FHE.gt(totalAssets, liabilities);
        euint32 netAssetValue = FHE.select(isNavPositive, FHE.sub(totalAssets, liabilities), FHE.asEuint32(0));

        // Leverage Ratio = liabilities * 100 / collateralValue
        ebool isCollateralPositive = FHE.gt(collateralValue, FHE.asEuint32(0));
        euint32 leverageRatio = FHE.select(
            isCollateralPositive, 
            FHE.div(FHE.mul(liabilities, FHE.asEuint32(100)), collateralValue), 
            FHE.asEuint32(0)
        );

        // Risk Level (1 = Low, 2 = Medium, 3 = High)
        // High risk if leverage > 80% OR NAV < liabilities
        ebool isLeverageHigh = FHE.gt(leverageRatio, FHE.asEuint32(80));
        ebool isNavCritical = FHE.lt(netAssetValue, liabilities);
        ebool isHighRisk = FHE.or(isLeverageHigh, isNavCritical);

        // Medium risk if leverage > 50%
        ebool isMediumRisk = FHE.gt(leverageRatio, FHE.asEuint32(50));

        euint32 riskLevel = FHE.select(
            isHighRisk, 
            FHE.asEuint32(3), 
            FHE.select(isMediumRisk, FHE.asEuint32(2), FHE.asEuint32(1))
        );

        analyses[msg.sender] = EncryptedRiskAnalysis({
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
        Permission calldata permit
    ) external view onlySender(permit) returns (
        uint32 portfolioValue,
        uint32 collateralValue,
        uint32 liabilities,
        uint32 netAssetValue,
        uint32 leverageRatio,
        uint32 riskLevel
    ) {
        EncryptedRiskAnalysis memory analysis = analyses[msg.sender];
        return (
            FHE.decrypt(analysis.portfolioValue),
            FHE.decrypt(analysis.collateralValue),
            FHE.decrypt(analysis.liabilities),
            FHE.decrypt(analysis.netAssetValue),
            FHE.decrypt(analysis.leverageRatio),
            FHE.decrypt(analysis.riskLevel)
        );
    }
}
