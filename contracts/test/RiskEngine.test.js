import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("TransparentRiskEngine", function () {
  let riskEngine;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const TransparentRiskEngine = await ethers.getContractFactory("TransparentRiskEngine");
    riskEngine = await TransparentRiskEngine.deploy();
    await riskEngine.waitForDeployment();
  });

  it("Should classify Low Risk portfolio correctly", async function () {
    // Portfolio: 200,000, Collateral: 100,000, Liabilities: 30,000
    // NAV = 200k + 100k - 30k = 270k
    // Leverage = 30k * 100 / 100k = 30%
    // Risk = 1 (Low)
    const tx = await riskEngine.analyze(200000, 100000, 30000);
    await tx.wait();

    const result = await riskEngine.getAnalysis(owner.address);

    expect(result.portfolioValue).to.equal(200000n);
    expect(result.collateralValue).to.equal(100000n);
    expect(result.liabilities).to.equal(30000n);
    expect(result.netAssetValue).to.equal(270000n);
    expect(result.leverageRatio).to.equal(30n);
    expect(result.riskLevel).to.equal(1n);
  });

  it("Should classify Medium Risk portfolio correctly", async function () {
    // Leverage = 60%, Risk = 2 (Medium)
    const tx = await riskEngine.analyze(100000, 100000, 60000);
    await tx.wait();

    const result = await riskEngine.getAnalysis(owner.address);
    expect(result.leverageRatio).to.equal(60n);
    expect(result.riskLevel).to.equal(2n);
  });

  it("Should classify High Risk portfolio correctly", async function () {
    // Leverage = 90%, Risk = 3 (High)
    const tx = await riskEngine.analyze(100000, 100000, 90000);
    await tx.wait();

    const result = await riskEngine.getAnalysis(owner.address);
    expect(result.leverageRatio).to.equal(90n);
    expect(result.riskLevel).to.equal(3n);
  });
});
