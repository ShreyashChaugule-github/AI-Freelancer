// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct Agent {
        uint256 id;
        address wallet;
        string name;
        string skills;
        string metadataURI;
        string portfolioURI;
        uint256 registrationDate;
        bool isRegistered;
    }

    uint256 private _nextAgentId = 1;
    mapping(address => Agent) private _agents;
    address[] private _agentAddresses;

    event AgentRegistered(address indexed wallet, uint256 indexed id, string name);
    event AgentProfileUpdated(address indexed wallet, string name);

    function registerAgent(
        string calldata name,
        string calldata skills,
        string calldata metadataURI,
        string calldata portfolioURI
    ) external {
        require(!_agents[msg.sender].isRegistered, "Agent already registered");

        uint256 agentId = _nextAgentId++;
        _agents[msg.sender] = Agent({
            id: agentId,
            wallet: msg.sender,
            name: name,
            skills: skills,
            metadataURI: metadataURI,
            portfolioURI: portfolioURI,
            registrationDate: block.timestamp,
            isRegistered: true
        });
        _agentAddresses.push(msg.sender);

        emit AgentRegistered(msg.sender, agentId, name);
    }

    function updateProfile(
        string calldata name,
        string calldata skills,
        string calldata metadataURI,
        string calldata portfolioURI
    ) external {
        require(_agents[msg.sender].isRegistered, "Agent not registered");

        Agent storage agent = _agents[msg.sender];
        agent.name = name;
        agent.skills = skills;
        agent.metadataURI = metadataURI;
        agent.portfolioURI = portfolioURI;

        emit AgentProfileUpdated(msg.sender, name);
    }

    function getAgent(address agentAddress) external view returns (Agent memory) {
        require(_agents[agentAddress].isRegistered, "Agent not registered");
        return _agents[agentAddress];
    }

    function isAgentRegistered(address agentAddress) external view returns (bool) {
        return _agents[agentAddress].isRegistered;
    }

    function getAllAgents() external view returns (address[] memory) {
        return _agentAddresses;
    }

    function getAgentCount() external view returns (uint256) {
        return _agentAddresses.length;
    }
}
