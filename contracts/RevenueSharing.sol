// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./CarbonCreditToken.sol";

/**
 * @title RevenueSharing
 * @dev Handles revenue distribution from carbon credit sales
 */
contract RevenueSharing is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    CarbonCreditToken public carbonToken;

    struct RevenueShare {
        uint256 projectId;
        address ngoAddress;
        address communityAddress;
        address governmentAddress;
        uint256 ngoShare; // Percentage (basis points: 100 = 1%)
        uint256 communityShare;
        uint256 governmentShare;
        uint256 totalRevenue;
        uint256 distributedAmount;
        bool isActive;
    }

    struct Distribution {
        uint256 distributionId;
        uint256 revenueShareId;
        uint256 amount;
        address recipient;
        uint256 timestamp;
        string description;
    }

    Counters.Counter private _revenueShareIds;
    Counters.Counter private _distributionIds;

    mapping(uint256 => RevenueShare) public revenueShares;
    mapping(uint256 => Distribution) public distributions;
    mapping(uint256 => uint256[]) public revenueShareDistributions;
    mapping(address => uint256[]) public recipientDistributions;

    // Default revenue sharing percentages (basis points)
    uint256 public constant DEFAULT_NGO_SHARE = 4000; // 40%
    uint256 public constant DEFAULT_COMMUNITY_SHARE = 4000; // 40%
    uint256 public constant DEFAULT_GOVERNMENT_SHARE = 2000; // 20%

    // Events
    event RevenueShareCreated(uint256 indexed revenueShareId, uint256 indexed projectId);
    event RevenueDistributed(uint256 indexed distributionId, address indexed recipient, uint256 amount);
    event RevenueShareUpdated(uint256 indexed revenueShareId, uint256 ngoShare, uint256 communityShare, uint256 governmentShare);

    modifier onlyValidShares(uint256 ngoShare, uint256 communityShare, uint256 governmentShare) {
        require(ngoShare + communityShare + governmentShare == 10000, "Shares must total 100%");
        _;
    }

    constructor(address _carbonToken) {
        carbonToken = CarbonCreditToken(_carbonToken);
    }

    /**
     * @dev Create a new revenue sharing agreement for a project
     */
    function createRevenueShare(
        uint256 projectId,
        address ngoAddress,
        address communityAddress,
        address governmentAddress,
        uint256 ngoShare,
        uint256 communityShare,
        uint256 governmentShare
    ) external onlyOwner onlyValidShares(ngoShare, communityShare, governmentShare) returns (uint256) {
        require(ngoAddress != address(0), "Invalid NGO address");
        require(communityAddress != address(0), "Invalid community address");
        require(governmentAddress != address(0), "Invalid government address");

        _revenueShareIds.increment();
        uint256 revenueShareId = _revenueShareIds.current();

        revenueShares[revenueShareId] = RevenueShare({
            projectId: projectId,
            ngoAddress: ngoAddress,
            communityAddress: communityAddress,
            governmentAddress: governmentAddress,
            ngoShare: ngoShare,
            communityShare: communityShare,
            governmentShare: governmentShare,
            totalRevenue: 0,
            distributedAmount: 0,
            isActive: true
        });

        emit RevenueShareCreated(revenueShareId, projectId);
        return revenueShareId;
    }

    /**
     * @dev Update revenue sharing percentages
     */
    function updateRevenueShare(
        uint256 revenueShareId,
        uint256 ngoShare,
        uint256 communityShare,
        uint256 governmentShare
    ) external onlyOwner onlyValidShares(ngoShare, communityShare, governmentShare) {
        require(revenueShares[revenueShareId].isActive, "Revenue share not found or inactive");

        RevenueShare storage share = revenueShares[revenueShareId];
        share.ngoShare = ngoShare;
        share.communityShare = communityShare;
        share.governmentShare = governmentShare;

        emit RevenueShareUpdated(revenueShareId, ngoShare, communityShare, governmentShare);
    }

    /**
     * @dev Add revenue to a project (called when carbon credits are sold)
     */
    function addRevenue(uint256 revenueShareId, uint256 amount) external onlyOwner {
        require(revenueShares[revenueShareId].isActive, "Revenue share not found or inactive");
        require(amount > 0, "Amount must be greater than 0");

        RevenueShare storage share = revenueShares[revenueShareId];
        share.totalRevenue += amount;
    }

    /**
     * @dev Distribute revenue to stakeholders
     */
    function distributeRevenue(uint256 revenueShareId) external onlyOwner nonReentrant {
        RevenueShare storage share = revenueShares[revenueShareId];
        require(share.isActive, "Revenue share not found or inactive");

        uint256 availableAmount = share.totalRevenue - share.distributedAmount;
        require(availableAmount > 0, "No revenue to distribute");

        // Calculate individual shares
        uint256 ngoAmount = (availableAmount * share.ngoShare) / 10000;
        uint256 communityAmount = (availableAmount * share.communityShare) / 10000;
        uint256 governmentAmount = (availableAmount * share.governmentShare) / 10000;

        // Distribute to NGO
        if (ngoAmount > 0) {
            _createDistribution(revenueShareId, ngoAmount, share.ngoAddress, "NGO revenue share");
            payable(share.ngoAddress).transfer(ngoAmount);
        }

        // Distribute to community
        if (communityAmount > 0) {
            _createDistribution(revenueShareId, communityAmount, share.communityAddress, "Community revenue share");
            payable(share.communityAddress).transfer(communityAmount);
        }

        // Distribute to government
        if (governmentAmount > 0) {
            _createDistribution(revenueShareId, governmentAmount, share.governmentAddress, "Government revenue share");
            payable(share.governmentAddress).transfer(governmentAmount);
        }

        share.distributedAmount = share.totalRevenue;
    }

    /**
     * @dev Create a distribution record
     */
    function _createDistribution(
        uint256 revenueShareId,
        uint256 amount,
        address recipient,
        string memory description
    ) internal {
        _distributionIds.increment();
        uint256 distributionId = _distributionIds.current();

        Distribution memory distribution = Distribution({
            distributionId: distributionId,
            revenueShareId: revenueShareId,
            amount: amount,
            recipient: recipient,
            timestamp: block.timestamp,
            description: description
        });

        distributions[distributionId] = distribution;
        revenueShareDistributions[revenueShareId].push(distributionId);
        recipientDistributions[recipient].push(distributionId);

        emit RevenueDistributed(distributionId, recipient, amount);
    }

    /**
     * @dev Get revenue share details
     */
    function getRevenueShare(uint256 revenueShareId) external view returns (RevenueShare memory) {
        return revenueShares[revenueShareId];
    }

    /**
     * @dev Get distributions for a revenue share
     */
    function getRevenueShareDistributions(uint256 revenueShareId) external view returns (uint256[] memory) {
        return revenueShareDistributions[revenueShareId];
    }

    /**
     * @dev Get distributions for a recipient
     */
    function getRecipientDistributions(address recipient) external view returns (uint256[] memory) {
        return recipientDistributions[recipient];
    }

    /**
     * @dev Get distribution details
     */
    function getDistribution(uint256 distributionId) external view returns (Distribution memory) {
        return distributions[distributionId];
    }

    /**
     * @dev Calculate pending distribution amounts
     */
    function getPendingDistribution(uint256 revenueShareId) external view returns (
        uint256 ngoAmount,
        uint256 communityAmount,
        uint256 governmentAmount
    ) {
        RevenueShare storage share = revenueShares[revenueShareId];
        uint256 availableAmount = share.totalRevenue - share.distributedAmount;

        ngoAmount = (availableAmount * share.ngoShare) / 10000;
        communityAmount = (availableAmount * share.communityShare) / 10000;
        governmentAmount = (availableAmount * share.governmentShare) / 10000;
    }

    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
