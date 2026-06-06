// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TransparentRiskEngine {
    struct RiskAnalysis {
        uint256 portfolioValue;
        uint256 collateralValue;
        uint256 liabilities;
        uint256 netAssetValue;
        uint256 leverageRatio; // Percentage (0-100+)
        uint256 riskLevel; // 1 = Low, 2 = Medium, 3 = High
        uint256 timestamp;
    }

    mapping(address => RiskAnalysis) public analyses;

    event RiskAnalyzed(
        address indexed user,
        uint256 portfolioValue,
        uint256 collateralValue,
        uint256 liabilities,
        uint256 netAssetValue,
        uint256 leverageRatio,
        uint256 riskLevel
    );

    function analyze(
        uint256 _portfolioValue,
        uint256 _collateralValue,
        uint256 _liabilities
    ) external {
        uint256 nav = (_portfolioValue + _collateralValue) > _liabilities 
            ? (_portfolioValue + _collateralValue) - _liabilities 
            : 0;

        uint256 leverage = _collateralValue > 0 
            ? (_liabilities * 100) / _collateralValue 
            : 0;

        uint256 riskLevel = 1; // Low
        if (leverage > 80 || nav < _liabilities) {
            riskLevel = 3; // High
        } else if (leverage > 50) {
            riskLevel = 2; // Medium
        }

        analyses[msg.sender] = RiskAnalysis({
            portfolioValue: _portfolioValue,
            collateralValue: _collateralValue,
            liabilities: _liabilities,
            netAssetValue: nav,
            leverageRatio: leverage,
            riskLevel: riskLevel,
            timestamp: block.timestamp
        });

        emit RiskAnalyzed(
            msg.sender,
            _portfolioValue,
            _collateralValue,
            _liabilities,
            nav,
            leverage,
            riskLevel
        );
    }

    function getAnalysis(address _user) external view returns (RiskAnalysis memory) {
        return analyses[_user];
    }
}
