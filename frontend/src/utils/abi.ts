export const AgentRegistryABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "skills", "type": "string" },
      { "internalType": "string", "name": "metadataURI", "type": "string" },
      { "internalType": "string", "name": "portfolioURI", "type": "string" }
    ],
    "name": "registerAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "skills", "type": "string" },
      { "internalType": "string", "name": "metadataURI", "type": "string" },
      { "internalType": "string", "name": "portfolioURI", "type": "string" }
    ],
    "name": "updateProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "agentAddress", "type": "address" }
    ],
    "name": "getAgent",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address", "name": "wallet", "type": "address" },
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "skills", "type": "string" },
          { "internalType": "string", "name": "metadataURI", "type": "string" },
          { "internalType": "string", "name": "portfolioURI", "type": "string" },
          { "internalType": "uint256", "name": "registrationDate", "type": "uint256" },
          { "internalType": "bool", "name": "isRegistered", "type": "bool" }
        ],
        "internalType": "struct AgentRegistry.Agent",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "agentAddress", "type": "address" }
    ],
    "name": "isAgentRegistered",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const ReputationABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "agent", "type": "address" }
    ],
    "name": "getReputation",
    "outputs": [
      { "internalType": "uint256", "name": "score", "type": "uint256" },
      { "internalType": "uint256", "name": "completedJobs", "type": "uint256" },
      { "internalType": "uint256", "name": "ratingAverage", "type": "uint256" },
      { "internalType": "uint256", "name": "totalReviews", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const EscrowABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "jobId", "type": "uint256" }
    ],
    "name": "getEscrow",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "jobId", "type": "uint256" },
          { "internalType": "address", "name": "client", "type": "address" },
          { "internalType": "address", "name": "freelancer", "type": "address" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "bytes32", "name": "projectHash", "type": "bytes32" },
          { "internalType": "bool", "name": "hasSubmittedProof", "type": "bool" },
          { "internalType": "uint8", "name": "status", "type": "uint8" }
        ],
        "internalType": "struct Escrow.EscrowAgreement",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "jobId", "type": "uint256" }
    ],
    "name": "approveCompletion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "jobId", "type": "uint256" }
    ],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const FreelancerMarketplaceABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "metadataURI", "type": "string" },
      { "internalType": "uint256", "name": "budget", "type": "uint256" }
    ],
    "name": "createJob",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "internalType": "address", "name": "agent", "type": "address" }
    ],
    "name": "acceptProposal",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "jobId", "type": "uint256" }
    ],
    "name": "getJobProposals",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
