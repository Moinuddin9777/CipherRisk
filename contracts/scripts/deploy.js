import hre from "hardhat";

async function main() {
  console.log("Starting contract deployment process for CipherRisk...");

  // 1. Deploy TransparentRiskEngine
  console.log("Deploying TransparentRiskEngine...");
  const TransparentRiskEngine = await hre.ethers.getContractFactory("TransparentRiskEngine");
  const transparentRiskEngine = await TransparentRiskEngine.deploy();
  await transparentRiskEngine.waitForDeployment();
  const transparentAddress = await transparentRiskEngine.getAddress();
  console.log(`✅ TransparentRiskEngine deployed to: ${transparentAddress}`);

  // 2. Deploy ConfidentialRiskEngine
  console.log("Deploying ConfidentialRiskEngine...");
  const ConfidentialRiskEngine = await hre.ethers.getContractFactory("ConfidentialRiskEngine");
  const confidentialRiskEngine = await ConfidentialRiskEngine.deploy();
  await confidentialRiskEngine.waitForDeployment();
  const confidentialAddress = await confidentialRiskEngine.getAddress();
  console.log(`✅ ConfidentialRiskEngine deployed to: ${confidentialAddress}`);

  console.log("\nCipherRisk Deployment completed successfully!");
  console.log("---------------------------------------------");
  console.log(`TransparentRiskEngine address: ${transparentAddress}`);
  console.log(`ConfidentialRiskEngine address: ${confidentialAddress}`);
  console.log("---------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
