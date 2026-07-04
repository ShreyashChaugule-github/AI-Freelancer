// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PortfolioProof is Ownable {
    struct Proof {
        bytes32 projectHash;
        uint256 timestamp;
        address agentWallet;
        address clientWallet;
        bool exists;
    }

    mapping(bytes32 => Proof) private _proofs;
    mapping(address => bytes32[]) private _agentProofs;
    mapping(address => bool) public authorizedCallers;

    event ProofRecorded(bytes32 indexed projectHash, address indexed agentWallet, address indexed clientWallet, uint256 timestamp);
    event CallerAuthorized(address indexed caller, bool isAuthorized);

    modifier onlyAuthorized() {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Caller is not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setAuthorizedCaller(address caller, bool isAuthorized) external onlyOwner {
        authorizedCallers[caller] = isAuthorized;
        emit CallerAuthorized(caller, isAuthorized);
    }

    function recordProof(bytes32 projectHash, address agent, address client) external onlyAuthorized {
        require(!_proofs[projectHash].exists, "Proof already exists");

        _proofs[projectHash] = Proof({
            projectHash: projectHash,
            timestamp: block.timestamp,
            agentWallet: agent,
            clientWallet: client,
            exists: true
        });

        _agentProofs[agent].push(projectHash);

        emit ProofRecorded(projectHash, agent, client, block.timestamp);
    }

    function verifyProof(bytes32 projectHash, address agent) external view returns (bool) {
        if (!_proofs[projectHash].exists) {
            return false;
        }
        return _proofs[projectHash].agentWallet == agent;
    }

    function getProof(bytes32 projectHash) external view returns (
        bytes32 hash,
        uint256 timestamp,
        address agentWallet,
        address clientWallet
    ) {
        require(_proofs[projectHash].exists, "Proof does not exist");
        Proof memory p = _proofs[projectHash];
        return (p.projectHash, p.timestamp, p.agentWallet, p.clientWallet);
    }

    function getAgentProofs(address agent) external view returns (bytes32[] memory) {
        return _agentProofs[agent];
    }
}
