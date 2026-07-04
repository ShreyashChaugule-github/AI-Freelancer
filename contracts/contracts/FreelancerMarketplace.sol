// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IEscrow {
    function createEscrow(uint256 jobId, address client, address freelancer) external payable;
    function submitProjectHash(uint256 jobId, bytes32 projectHash) external;
}

contract FreelancerMarketplace is Ownable {
    enum JobStatus { Open, Active, Completed, Closed }
    enum ProposalStatus { Pending, Accepted, Rejected }

    struct Job {
        uint256 id;
        address client;
        string metadataURI; // IPFS or Firestore doc reference
        uint256 budget;
        JobStatus status;
        address selectedAgent;
    }

    struct Proposal {
        uint256 jobId;
        address agent;
        uint256 bidAmount;
        string proposalURI; // IPFS or Firestore doc reference
        ProposalStatus status;
    }

    uint256 private _nextJobId = 1;
    IEscrow public escrowContract;

    mapping(uint256 => Job) private _jobs;
    // jobId => AgentAddress => Proposal
    mapping(uint256 => mapping(address => Proposal)) private _proposals;
    // jobId => list of agent addresses that submitted proposals
    mapping(uint256 => address[]) private _jobProposals;

    event JobCreated(uint256 indexed jobId, address indexed client, string metadataURI, uint256 budget);
    event ProposalSubmitted(uint256 indexed jobId, address indexed agent, uint256 bidAmount, string proposalURI);
    event ProposalAccepted(uint256 indexed jobId, address indexed agent, uint256 amount);
    event JobCompleted(uint256 indexed jobId);
    event EscrowContractUpdated(address indexed newEscrow);

    constructor() Ownable(msg.sender) {}

    function setEscrowContract(address _escrow) external onlyOwner {
        escrowContract = IEscrow(_escrow);
        emit EscrowContractUpdated(_escrow);
    }

    function createJob(string calldata metadataURI, uint256 budget) external {
        uint256 jobId = _nextJobId++;
        _jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            metadataURI: metadataURI,
            budget: budget,
            status: JobStatus.Open,
            selectedAgent: address(0)
        });

        emit JobCreated(jobId, msg.sender, metadataURI, budget);
    }

    function submitProposal(
        uint256 jobId,
        string calldata proposalURI,
        uint256 bidAmount
    ) external {
        Job storage job = _jobs[jobId];
        require(job.status == JobStatus.Open, "Job is not open for proposals");
        require(_proposals[jobId][msg.sender].agent == address(0), "Proposal already submitted");

        _proposals[jobId][msg.sender] = Proposal({
            jobId: jobId,
            agent: msg.sender,
            bidAmount: bidAmount,
            proposalURI: proposalURI,
            status: ProposalStatus.Pending
        });

        _jobProposals[jobId].push(msg.sender);

        emit ProposalSubmitted(jobId, msg.sender, bidAmount, proposalURI);
    }

    function acceptProposal(uint256 jobId, address agent) external payable {
        Job storage job = _jobs[jobId];
        require(job.client == msg.sender, "Only job owner can accept proposals");
        require(job.status == JobStatus.Open, "Job is not open");
        
        Proposal storage proposal = _proposals[jobId][agent];
        require(proposal.agent != address(0), "Proposal does not exist");
        require(proposal.status == ProposalStatus.Pending, "Proposal is not pending");
        require(msg.value == proposal.bidAmount, "Must lock exact bid amount in escrow");
        require(address(escrowContract) != address(0), "Escrow contract not set");

        job.status = JobStatus.Active;
        job.selectedAgent = agent;
        proposal.status = ProposalStatus.Accepted;

        // Forward funds and create escrow on-chain
        escrowContract.createEscrow{value: msg.value}(jobId, job.client, agent);

        emit ProposalAccepted(jobId, agent, msg.value);
    }

    function completeProject(uint256 jobId) external {
        Job storage job = _jobs[jobId];
        require(job.selectedAgent == msg.sender, "Only selected agent can complete");
        require(job.status == JobStatus.Active, "Job is not active");

        job.status = JobStatus.Completed;

        emit JobCompleted(jobId);
    }

    // View Functions
    function getJob(uint256 jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }

    function getProposal(uint256 jobId, address agent) external view returns (Proposal memory) {
        return _proposals[jobId][agent];
    }

    function getJobProposals(uint256 jobId) external view returns (address[] memory) {
        return _jobProposals[jobId];
    }
}
