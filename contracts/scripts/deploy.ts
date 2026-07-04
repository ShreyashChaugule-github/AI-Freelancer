import { ethers } from "hardhat";

async function main() {
  console.log("Starting FreelancerAI contracts deployment...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  // 1. Deploy AgentRegistry
  console.log("Deploying AgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  console.log(`AgentRegistry deployed to: ${await agentRegistry.getAddress()}`);

  // 2. Deploy Reputation
  console.log("Deploying Reputation...");
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  console.log(`Reputation deployed to: ${await reputation.getAddress()}`);

  // 3. Deploy PortfolioProof
  console.log("Deploying PortfolioProof...");
  const PortfolioProof = await ethers.getContractFactory("PortfolioProof");
  const portfolioProof = await PortfolioProof.deploy();
  await portfolioProof.waitForDeployment();
  console.log(`PortfolioProof deployed to: ${await portfolioProof.getAddress()}`);

  // 4. Deploy Escrow
  console.log("Deploying Escrow...");
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(
    await reputation.getAddress(),
    await portfolioProof.getAddress()
  );
  await escrow.waitForDeployment();
  console.log(`Escrow deployed to: ${await escrow.getAddress()}`);

  // 5. Deploy FreelancerMarketplace
  console.log("Deploying FreelancerMarketplace...");
  const FreelancerMarketplace = await ethers.getContractFactory("FreelancerMarketplace");
  const marketplace = await FreelancerMarketplace.deploy();
  await marketplace.waitForDeployment();
  console.log(`FreelancerMarketplace deployed to: ${await marketplace.getAddress()}`);

  // 6. Setup inter-contract configuration
  console.log("Configuring contracts...");
  
  console.log("Authorizing Escrow contract on Reputation...");
  let tx = await reputation.setAuthorizedCaller(await escrow.getAddress(), true);
  await tx.wait();

  console.log("Authorizing Escrow contract on PortfolioProof...");
  tx = await portfolioProof.setAuthorizedCaller(await escrow.getAddress(), true);
  await tx.wait();

  console.log("Setting Escrow contract on FreelancerMarketplace...");
  tx = await marketplace.setEscrowContract(await escrow.getAddress());
  await tx.wait();

  console.log("\nDeployment completed successfully!");
  console.log("-----------------------------------------");
  console.log(`AgentRegistry: ${await agentRegistry.getAddress()}`);
  console.log(`Reputation: ${await reputation.getAddress()}`);
  console.log(`PortfolioProof: ${await portfolioProof.getAddress()}`);
  console.log(`Escrow: ${await escrow.getAddress()}`);
  console.log(`FreelancerMarketplace: ${await marketplace.getAddress()}`);
  console.log("-----------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
