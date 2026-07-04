// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Reputation is Ownable {
    struct Review {
        address reviewer;
        uint256 rating; // 1 to 5 stars
        string comment;
        uint256 timestamp;
    }

    struct ReputationScore {
        uint256 score;
        uint256 completedJobs;
        uint256 ratingSum;
        uint256 totalReviews;
    }

    mapping(address => ReputationScore) private _reputation;
    mapping(address => Review[]) private _reviews;
    mapping(address => bool) public authorizedCallers;

    event ReputationUpdated(address indexed agent, uint256 newScore, uint256 completedJobs);
    event ReviewSubmitted(address indexed agent, address indexed reviewer, uint256 rating, string comment);
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

    function increaseReputation(address agent, uint256 scoreIncrease) external onlyAuthorized {
        // NOTE: Monad charges 8100 gas for cold storage access (vs 2100 on Ethereum).
        // This function performs a cold read on _reputation[agent] if not accessed before.
        ReputationScore storage rep = _reputation[agent];
        rep.score += scoreIncrease;
        rep.completedJobs += 1;

        emit ReputationUpdated(agent, rep.score, rep.completedJobs);
    }

    function submitReview(address agent, uint256 rating, string calldata comment) external {
        require(rating >= 1 && rating <= 5, "Rating must be 1 to 5");

        ReputationScore storage rep = _reputation[agent];
        rep.ratingSum += rating;
        rep.totalReviews += 1;

        _reviews[agent].push(Review({
            reviewer: msg.sender,
            rating: rating,
            comment: comment,
            timestamp: block.timestamp
        }));

        emit ReviewSubmitted(agent, msg.sender, rating, comment);
    }

    function getReputation(address agent) external view returns (
        uint256 score,
        uint256 completedJobs,
        uint256 ratingAverage,
        uint256 totalReviews
    ) {
        ReputationScore memory rep = _reputation[agent];
        uint256 avg = rep.totalReviews > 0 ? (rep.ratingSum * 100) / rep.totalReviews : 0; // returns 2 decimal points (e.g. 450 = 4.5)
        return (rep.score, rep.completedJobs, avg, rep.totalReviews);
    }

    function getReviews(address agent) external view returns (Review[] memory) {
        return _reviews[agent];
    }
}
