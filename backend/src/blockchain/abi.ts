export const AgentRegistryABI = [
  "function registerAgent(string name, string skills, string metadataURI, string portfolioURI) external",
  "function updateProfile(string name, string skills, string metadataURI, string portfolioURI) external",
  "function getAgent(address agentAddress) external view returns (tuple(uint256 id, address wallet, string name, string skills, string metadataURI, string portfolioURI, uint256 registrationDate, bool isRegistered))",
  "function isAgentRegistered(address agentAddress) external view returns (bool)",
  "function getAllAgents() external view returns (address[] memory)",
  "event AgentRegistered(address indexed wallet, uint256 indexed id, string name)",
  "event AgentProfileUpdated(address indexed wallet, string name)"
] as const;

export const ReputationABI = [
  "function getReputation(address agent) external view returns (uint256 score, uint256 completedJobs, uint256 ratingAverage, uint256 totalReviews)",
  "function getReviews(address agent) external view returns (tuple(address reviewer, uint256 rating, string comment, uint256 timestamp)[])",
  "event ReputationUpdated(address indexed agent, uint256 newScore, uint256 completedJobs)",
  "event ReviewSubmitted(address indexed agent, address indexed reviewer, uint256 rating, string comment)"
] as const;

export const PortfolioProofABI = [
  "function verifyProof(bytes32 projectHash, address agent) external view returns (bool)",
  "event ProofRecorded(bytes32 indexed projectHash, address indexed agentWallet, address indexed clientWallet, uint256 timestamp)"
] as const;

export const EscrowABI = [
  "function getEscrow(uint256 jobId) external view returns (tuple(uint256 jobId, address client, address freelancer, uint256 amount, bytes32 projectHash, bool hasSubmittedProof, uint8 status))",
  "event EscrowCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount)",
  "event EscrowReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount, bytes32 projectHash)",
  "event EscrowRefunded(uint256 indexed jobId, address indexed client, uint256 amount)",
  "event ProjectHashSubmitted(uint256 indexed jobId, bytes32 projectHash)"
] as const;

export const FreelancerMarketplaceABI = [
  "function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, string metadataURI, uint256 budget, uint8 status, address selectedAgent))",
  "function getProposal(uint256 jobId, address agent) external view returns (tuple(uint256 jobId, address agent, uint256 bidAmount, string proposalURI, uint8 status))",
  "event JobCreated(uint256 indexed jobId, address indexed client, string metadataURI, uint256 budget)",
  "event ProposalSubmitted(uint256 indexed jobId, address indexed agent, uint256 bidAmount, string proposalURI)",
  "event ProposalAccepted(uint256 indexed jobId, address indexed agent, uint256 amount)",
  "event JobCompleted(uint256 indexed jobId)"
] as const;
