// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CarbonCreditToken
 * @dev ERC-20 token representing verified carbon credits from blue carbon projects
 */
contract CarbonCreditToken is ERC20, Ownable, Pausable {
    using Counters for Counters.Counter;

    // Structs
    struct Project {
        uint256 projectId;
        string projectName;
        string location;
        uint256 totalArea; // in square meters
        uint256 carbonCreditsIssued;
        uint256 verificationTimestamp;
        bool isVerified;
        address projectOwner;
        ProjectType projectType;
        string ipfsHash; // For storing project metadata
    }

    struct Verification {
        uint256 verificationId;
        uint256 projectId;
        address verifier;
        uint256 carbonCredits;
        uint256 timestamp;
        string verificationData; // IPFS hash of verification documents
        bool isApproved;
    }

    enum ProjectType { MANGROVE, SEAGRASS, SALT_MARSH }

    // State variables
    Counters.Counter private _projectIds;
    Counters.Counter private _verificationIds;
    
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Verification) public verifications;
    mapping(address => bool) public authorizedVerifiers;
    mapping(address => uint256[]) public userProjects;
    
    // Events
    event ProjectCreated(uint256 indexed projectId, string projectName, address indexed owner);
    event ProjectVerified(uint256 indexed projectId, uint256 carbonCredits, address indexed verifier);
    event CarbonCreditsMinted(uint256 indexed projectId, address indexed to, uint256 amount);
    event VerifierAuthorized(address indexed verifier, bool status);

    // Modifiers
    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender], "Not authorized verifier");
        _;
    }

    modifier projectExists(uint256 projectId) {
        require(projects[projectId].projectId != 0, "Project does not exist");
        _;
    }

    constructor() ERC20("Blue Carbon Credit", "BCC") {
        _mint(msg.sender, 1000000 * 10**decimals()); // Initial supply
    }

    /**
     * @dev Create a new blue carbon project
     */
    function createProject(
        string memory projectName,
        string memory location,
        uint256 totalArea,
        ProjectType projectType,
        string memory ipfsHash
    ) external returns (uint256) {
        require(bytes(projectName).length > 0, "Project name required");
        require(totalArea > 0, "Area must be greater than 0");

        _projectIds.increment();
        uint256 projectId = _projectIds.current();

        projects[projectId] = Project({
            projectId: projectId,
            projectName: projectName,
            location: location,
            totalArea: totalArea,
            carbonCreditsIssued: 0,
            verificationTimestamp: 0,
            isVerified: false,
            projectOwner: msg.sender,
            projectType: projectType,
            ipfsHash: ipfsHash
        });

        userProjects[msg.sender].push(projectId);

        emit ProjectCreated(projectId, projectName, msg.sender);
        return projectId;
    }

    /**
     * @dev Submit verification data for a project
     */
    function submitVerification(
        uint256 projectId,
        uint256 carbonCredits,
        string memory verificationData
    ) external onlyAuthorizedVerifier projectExists(projectId) {
        require(carbonCredits > 0, "Carbon credits must be greater than 0");
        require(!projects[projectId].isVerified, "Project already verified");

        _verificationIds.increment();
        uint256 verificationId = _verificationIds.current();

        verifications[verificationId] = Verification({
            verificationId: verificationId,
            projectId: projectId,
            verifier: msg.sender,
            carbonCredits: carbonCredits,
            timestamp: block.timestamp,
            verificationData: verificationData,
            isApproved: false
        });

        // Auto-approve for demo purposes (in production, this would require multi-sig)
        _approveVerification(verificationId);
    }

    /**
     * @dev Approve verification and mint carbon credits
     */
    function _approveVerification(uint256 verificationId) internal {
        Verification storage verification = verifications[verificationId];
        Project storage project = projects[verification.projectId];

        verification.isApproved = true;
        project.isVerified = true;
        project.carbonCreditsIssued = verification.carbonCredits;
        project.verificationTimestamp = block.timestamp;

        // Mint carbon credits to project owner
        _mint(project.projectOwner, verification.carbonCredits * 10**decimals());

        emit ProjectVerified(verification.projectId, verification.carbonCredits, verification.verifier);
        emit CarbonCreditsMinted(verification.projectId, project.projectOwner, verification.carbonCredits);
    }

    /**
     * @dev Authorize or revoke verifier status
     */
    function setVerifierStatus(address verifier, bool status) external onlyOwner {
        authorizedVerifiers[verifier] = status;
        emit VerifierAuthorized(verifier, status);
    }

    /**
     * @dev Get project details
     */
    function getProject(uint256 projectId) external view returns (Project memory) {
        return projects[projectId];
    }

    /**
     * @dev Get user's projects
     */
    function getUserProjects(address user) external view returns (uint256[] memory) {
        return userProjects[user];
    }

    /**
     * @dev Calculate carbon credits based on area and project type
     * This is a simplified calculation - in production, use scientific models
     */
    function calculateCarbonCredits(uint256 area, ProjectType projectType) public pure returns (uint256) {
        uint256 creditsPerSqm;
        
        if (projectType == ProjectType.MANGROVE) {
            creditsPerSqm = 2; // 2 credits per sqm for mangroves
        } else if (projectType == ProjectType.SEAGRASS) {
            creditsPerSqm = 1; // 1 credit per sqm for seagrass
        } else if (projectType == ProjectType.SALT_MARSH) {
            creditsPerSqm = 1; // 1 credit per sqm for salt marshes
        }
        
        return area * creditsPerSqm;
    }

    /**
     * @dev Pause/unpause contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override transfer functions to respect pause
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}
