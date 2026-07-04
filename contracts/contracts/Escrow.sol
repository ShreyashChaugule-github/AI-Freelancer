// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IReputation {
    function increaseReputation(address agent, uint256 scoreIncrease) external;
}

interface IPortfolioProof {
    function recordProof(bytes32 projectHash, address agent, address client) external;
}

contract Escrow is Ownable, ReentrancyGuard {
    enum EscrowStatus { Inactive, Locked, Released, Refunded }

    struct EscrowAgreement {
        uint256 jobId;
        address client;
        address freelancer;
        uint256 amount;
        bytes32 projectHash;
        bool hasSubmittedProof;
        EscrowStatus status;
    }

    IReputation public reputationContract;
    IPortfolioProof public portfolioProofContract;

    // jobId => EscrowAgreement
    mapping(uint256 => EscrowAgreement) private _escrows;
    address public arbitrator;

    event EscrowCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount);
    event EscrowReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount, bytes32 projectHash);
    event EscrowRefunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event ArbitratorUpdated(address indexed newArbitrator);
    event ProjectHashSubmitted(uint256 indexed jobId, bytes32 projectHash);

    modifier onlyClient(uint256 jobId) {
        require(_escrows[jobId].client == msg.sender, "Only client can call");
        _;
    }

    modifier onlyFreelancer(uint256 jobId) {
        require(_escrows[jobId].freelancer == msg.sender, "Only freelancer can call");
        _;
    }

    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Only arbitrator can call");
        _;
    }

    constructor(address _reputation, address _portfolioProof) Ownable(msg.sender) {
        reputationContract = IReputation(_reputation);
        portfolioProofContract = IPortfolioProof(_portfolioProof);
        arbitrator = msg.sender;
    }

    function setArbitrator(address _arbitrator) external onlyOwner {
        arbitrator = _arbitrator;
        emit ArbitratorUpdated(_arbitrator);
    }

    function createEscrow(
        uint256 jobId,
        address client,
        address freelancer
    ) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than zero");
        require(client != address(0), "Invalid client address");
        require(freelancer != address(0), "Invalid freelancer address");
        require(_escrows[jobId].status == EscrowStatus.Inactive, "Escrow already exists for jobId");

        _escrows[jobId] = EscrowAgreement({
            jobId: jobId,
            client: client,
            freelancer: freelancer,
            amount: msg.value,
            projectHash: bytes32(0),
            hasSubmittedProof: false,
            status: EscrowStatus.Locked
        });

        emit EscrowCreated(jobId, client, freelancer, msg.value);
    }

    function submitProjectHash(uint256 jobId, bytes32 projectHash) external onlyFreelancer(jobId) {
        EscrowAgreement storage agreement = _escrows[jobId];
        require(agreement.status == EscrowStatus.Locked, "Escrow is not locked");
        agreement.projectHash = projectHash;
        agreement.hasSubmittedProof = true;

        emit ProjectHashSubmitted(jobId, projectHash);
    }

    function approveCompletion(uint256 jobId) external onlyClient(jobId) nonReentrant {
        EscrowAgreement storage agreement = _escrows[jobId];
        require(agreement.status == EscrowStatus.Locked, "Escrow is not locked");
        require(agreement.hasSubmittedProof, "Freelancer did not submit project hash");

        agreement.status = EscrowStatus.Released;
        uint256 amount = agreement.amount;
        address freelancer = agreement.freelancer;

        // Release funds
        (bool success, ) = freelancer.call{value: amount}("");
        require(success, "Transfer failed");

        // Update Reputation (increase by 10 points)
        try reputationContract.increaseReputation(freelancer, 10) {} catch {}

        // Record Portfolio Proof
        try portfolioProofContract.recordProof(agreement.projectHash, freelancer, agreement.client) {} catch {}

        emit EscrowReleased(jobId, freelancer, amount, agreement.projectHash);
    }

    function refund(uint256 jobId) external nonReentrant {
        EscrowAgreement storage agreement = _escrows[jobId];
        require(agreement.status == EscrowStatus.Locked, "Escrow is not locked");
        // Only arbitrator can refund, or client can refund if freelancer consents (for demo, owner/arbitrator does it)
        require(msg.sender == arbitrator || msg.sender == agreement.freelancer, "Not authorized to refund");

        agreement.status = EscrowStatus.Refunded;
        uint256 amount = agreement.amount;
        address client = agreement.client;

        (bool success, ) = client.call{value: amount}("");
        require(success, "Transfer failed");

        emit EscrowRefunded(jobId, client, amount);
    }

    function getEscrow(uint256 jobId) external view returns (EscrowAgreement memory) {
        return _escrows[jobId];
    }
}
