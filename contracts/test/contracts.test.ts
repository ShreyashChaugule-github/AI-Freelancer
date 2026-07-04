import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { AgentRegistry, Reputation, PortfolioProof, Escrow, FreelancerMarketplace } from "../typechain-types";

describe("FreelancerAI Protocol", function () {
  let owner: HardhatEthersSigner;
  let client: HardhatEthersSigner;
  let agent: HardhatEthersSigner;
  let arbitrator: HardhatEthersSigner;

  let agentRegistry: AgentRegistry;
  let reputation: Reputation;
  let portfolioProof: PortfolioProof;
  let escrow: Escrow;
  let marketplace: FreelancerMarketplace;

  beforeEach(async function () {
    [owner, client, agent, arbitrator] = await ethers.getSigners();

    // 1. Deploy AgentRegistry
    const AgentRegistryFactory = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistryFactory.deploy();

    // 2. Deploy Reputation
    const ReputationFactory = await ethers.getContractFactory("Reputation");
    reputation = await ReputationFactory.deploy();

    // 3. Deploy PortfolioProof
    const PortfolioProofFactory = await ethers.getContractFactory("PortfolioProof");
    portfolioProof = await PortfolioProofFactory.deploy();

    // 4. Deploy Escrow (passing reputation & portfolio proof)
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(
      await reputation.getAddress(),
      await portfolioProof.getAddress()
    );

    // 5. Deploy FreelancerMarketplace
    const MarketplaceFactory = await ethers.getContractFactory("FreelancerMarketplace");
    marketplace = await MarketplaceFactory.deploy();

    // Configure permissions
    await reputation.setAuthorizedCaller(await escrow.getAddress(), true);
    await portfolioProof.setAuthorizedCaller(await escrow.getAddress(), true);
    await marketplace.setEscrowContract(await escrow.getAddress());
    await escrow.setArbitrator(arbitrator.address);
  });

  describe("Agent Registration", function () {
    it("Should allow an agent to register and query details", async function () {
      await agentRegistry.connect(agent).registerAgent(
        "Gemini Coder",
        "TypeScript, Solidity, Python",
        "ipfs://agent-metadata-hash",
        "ipfs://portfolio-hash"
      );

      expect(await agentRegistry.isAgentRegistered(agent.address)).to.be.true;

      const details = await agentRegistry.getAgent(agent.address);
      expect(details.name).to.equal("Gemini Coder");
      expect(details.skills).to.equal("TypeScript, Solidity, Python");
    });

    it("Should not allow duplicate registration", async function () {
      await agentRegistry.connect(agent).registerAgent(
        "Gemini Coder",
        "TypeScript",
        "ipfs://meta",
        "ipfs://port"
      );

      await expect(
        agentRegistry.connect(agent).registerAgent("Gemini Coder 2", "Go", "ipfs://meta", "ipfs://port")
      ).to.be.revertedWith("Agent already registered");
    });
  });

  describe("Marketplace & Escrow Flow", function () {
    const jobId = 1;
    const budget = ethers.parseEther("1.0"); // 1 MON
    const projectHash = ethers.id("FreelancerAI Project Deliverable SHA256");

    beforeEach(async function () {
      // Register Agent
      await agentRegistry.connect(agent).registerAgent(
        "Gemini Coder",
        "Solidity",
        "ipfs://agent-meta",
        "ipfs://portfolio"
      );

      // Create Job
      await marketplace.connect(client).createJob("ipfs://job-desc", budget);
    });

    it("Should allow agent to bid and client to accept & lock escrow", async function () {
      // Submit Proposal
      await marketplace.connect(agent).submitProposal(jobId, "ipfs://proposal-details", budget);

      const proposal = await marketplace.getProposal(jobId, agent.address);
      expect(proposal.bidAmount).to.equal(budget);

      // Accept Proposal & Lock Funds (from client account)
      const tx = await marketplace.connect(client).acceptProposal(jobId, agent.address, { value: budget });
      await expect(tx).to.emit(marketplace, "ProposalAccepted").withArgs(jobId, agent.address, budget);

      // Check Escrow State
      const escrowAgreement = await escrow.getEscrow(jobId);
      expect(escrowAgreement.client).to.equal(client.address);
      expect(escrowAgreement.freelancer).to.equal(agent.address);
      expect(escrowAgreement.amount).to.equal(budget);
      expect(escrowAgreement.status).to.equal(1); // EscrowStatus.Locked
    });

    it("Should release escrow, record proof, and increase reputation upon approval", async function () {
      // Setup: Bid and accept
      await marketplace.connect(agent).submitProposal(jobId, "ipfs://proposal-details", budget);
      await marketplace.connect(client).acceptProposal(jobId, agent.address, { value: budget });

      // Agent marks job as complete on-chain and submits project hash proof
      await marketplace.connect(agent).completeProject(jobId);
      await escrow.connect(agent).submitProjectHash(jobId, projectHash);

      // Verify that project hash is recorded in escrow agreement
      let escrowAgreement = await escrow.getEscrow(jobId);
      expect(escrowAgreement.projectHash).to.equal(projectHash);
      expect(escrowAgreement.hasSubmittedProof).to.be.true;

      // Client approves completion and releases funds
      const agentBalanceBefore = await ethers.provider.getBalance(agent.address);

      const approveTx = await escrow.connect(client).approveCompletion(jobId);
      await expect(approveTx).to.emit(escrow, "EscrowReleased").withArgs(jobId, agent.address, budget, projectHash);

      // Verify funds released to agent
      const agentBalanceAfter = await ethers.provider.getBalance(agent.address);
      expect(agentBalanceAfter - agentBalanceBefore).to.equal(budget);

      // Verify reputation increased
      const rep = await reputation.getReputation(agent.address);
      expect(rep.score).to.equal(10); // Reputation score increased
      expect(rep.completedJobs).to.equal(1);

      // Verify portfolio proof recorded
      expect(await portfolioProof.verifyProof(projectHash, agent.address)).to.be.true;
    });

    it("Should allow arbitrator or freelancer to refund client", async function () {
      await marketplace.connect(agent).submitProposal(jobId, "ipfs://proposal-details", budget);
      await marketplace.connect(client).acceptProposal(jobId, agent.address, { value: budget });

      // Arbitrator triggers refund
      const clientBalanceBefore = await ethers.provider.getBalance(client.address);
      await escrow.connect(arbitrator).refund(jobId);
      const clientBalanceAfter = await ethers.provider.getBalance(client.address);

      expect(clientBalanceAfter - clientBalanceBefore).to.equal(budget);

      const escrowAgreement = await escrow.getEscrow(jobId);
      expect(escrowAgreement.status).to.equal(3); // EscrowStatus.Refunded
    });
  });
});
