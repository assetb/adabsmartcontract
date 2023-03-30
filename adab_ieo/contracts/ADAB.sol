pragma solidity 0.5.6;

import "./IERC20.sol";
import "./SafeMath.sol";
import "./ERC20Detailed.sol";

contract ADAB is IERC20, ERC20Detailed {

    using SafeMath for uint256;

    uint8 constant BONUS = 5;
    uint32 constant IEOEND = 1558828800; //Sunday, May 26, 2019 12:00:00 AM
    uint32 public bonusPhaseStartTimestamp;
    uint32 public bonusPhaseEndTimestamp;
    uint256 private _totalSupply;
    uint256 private _preSaleAmount;

    bool IEOInProgress = true;

    address public _fundHoldingAddress;
    address public _reserveFundAddress;
    address public _marketingAndBountyAddress;
    address public _teamAddress;
    address public _advisorAddress;

    mapping(uint8 => uint32) private termsInMonth;
    mapping(uint8 => mapping(address => uint256)) _bonuses;
    mapping(address => uint256) private _investors;
    mapping(address => uint256) private _balances;

    event FundTransfer(address indexed to, uint value, bool isContribution);
    event Burn(address indexed burner, uint256 value);

    constructor (address marketingAndBountyAddress,
        address reserveFundAddress,
        address teamAddress,
        address advisorAddress) ERC20Detailed("ADAB Token", "ADAB", 18) public {
        _totalSupply = 350000000000000000000000000;
        _fundHoldingAddress = msg.sender;
        _marketingAndBountyAddress = marketingAndBountyAddress;
        _reserveFundAddress = reserveFundAddress;
        _teamAddress = teamAddress;
        _advisorAddress = advisorAddress;

        //marketing and bounty share
        _preSaleAmount = 49455453000000000000000000;
        _balances[_fundHoldingAddress] = 195544547000000000000000000; // 245 000 000 - 49 455 453 (presale)
        _bonuses[3][_marketingAndBountyAddress] = 875000000000000000000000;
        _bonuses[6][_marketingAndBountyAddress] = 875000000000000000000000;
        _bonuses[12][_marketingAndBountyAddress] = 700000000000000000000000;
        _bonuses[24][_marketingAndBountyAddress] = 1050000000000000000000000;

        //reserve fund - initial setup
        _balances[_reserveFundAddress] = 63000000000000000000000000;

        //team share
        _bonuses[3][_teamAddress] = 7000000000000000000000000;
        _bonuses[12][_teamAddress] = 7000000000000000000000000;
        _bonuses[24][_teamAddress] = 7000000000000000000000000;
        _bonuses[48][_teamAddress] = 7000000000000000000000000;

        // advisor share
        _balances[_advisorAddress] = 2625000000000000000000000;
        _bonuses[6][_advisorAddress] = 2625000000000000000000000;
        _bonuses[12][_advisorAddress] = 5250000000000000000000000;

        bonusPhaseStartTimestamp = 1555372800; //Tuesday, April 16, 2019 12:00:00 AM
        bonusPhaseEndTimestamp = 1556236799; // Thursday, April 25, 2019 11:59:59 PM

        termsInMonth[1] = 1561507200; // Wednesday, June 26, 2019 12:00:00 AM
        termsInMonth[3] = 1566777600; //Monday, August 26, 2019 12:00:00 AM
        termsInMonth[6] = 1574726400; //Tuesday, November 26, 2019 12:00:00 AM
        termsInMonth[12] = 1590451200; //Tuesday, May 26, 2020 12:00:00 AM
        termsInMonth[24] = 1621987200; //Wednesday, May 26, 2021 12:00:00 AM
        termsInMonth[48] = 1685059200; //Friday, May 26, 2023 12:00:00 AM
    }

    modifier onlyOwner() {
        require(msg.sender == _fundHoldingAddress, "Can be called only by owner");
        _;
    }

    modifier onlyIEOInProgress() {
        require(IEOInProgress, "IEO must be in progress");
        _;
    }

    modifier onlyAfter(uint _time) {
        require(now > _time, "Function called too early.");
        _;
    }

    function() external payable onlyIEOInProgress {
        _investors[msg.sender] = _investors[msg.sender].add(msg.value);
        emit FundTransfer(msg.sender, msg.value, true);
    }

    function finaliseIEO() external onlyIEOInProgress onlyAfter(IEOEND) {
        uint256 reserveFundBalance = holdingOf(_reserveFundAddress).add(holdingOf(_fundHoldingAddress)).add(balanceOf(_advisorAddress));
        _bonuses[6][_reserveFundAddress] = reserveFundBalance.mul(25).div(100);
        _bonuses[12][_reserveFundAddress] = reserveFundBalance.mul(25).div(100);
        _bonuses[24][_reserveFundAddress] = reserveFundBalance.mul(20).div(100);
        _bonuses[48][_reserveFundAddress] = reserveFundBalance.mul(30).div(100);

        _balances[_fundHoldingAddress] = 0;
        _balances[_reserveFundAddress] = 0;

        _balances[_advisorAddress] = 0;
        _bonuses[6][_advisorAddress] = 0;
        _bonuses[12][_advisorAddress] = 0;

        IEOInProgress = false;
    }

    function safeWithdrawal() public onlyOwner {
        require(!IEOInProgress, "IEO must be stopped");
        uint balance = address(this).balance;
        require(balance > 0, "Contract doesn't hold any ether as of now");
        address(msg.sender).transfer(balance);
        emit FundTransfer(msg.sender, balance, false);
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function investorContribution(address investor) public view returns (uint256){
        return _investors[investor];
    }

    function balanceOf(address owner) public view returns (uint256) {
        return holdingOf(owner).add(totalBonusOf(owner));
    }

    function holdingOf(address owner) public view returns (uint256){
        return _balances[owner];
    }

    function bonusOf(address owner) public view returns (uint256, uint256, uint256, uint256, uint256, uint256){
        return (
        _bonuses[1][owner],
        _bonuses[3][owner],
        _bonuses[6][owner],
        _bonuses[12][owner],
        _bonuses[24][owner],
        _bonuses[48][owner]
        );
    }

    function transfer(address to, uint256 value) external returns (bool){
        require(to != address(0), "Incorrect recipient address");
        require(_balances[msg.sender] >= value, "Not enough Token Balance");
        _balances[msg.sender] = _balances[msg.sender].sub(value);
        _balances[to] = _balances[to].add(value);
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function distributeTokenWithBonus(
        address to,
        uint256 value,
        uint256 bonus,
        bool isPreSale)
    public onlyOwner onlyIEOInProgress returns (bool){
        require(to != address(0), "Incorrect recipient address");
        if (isPreSale){
            require(_preSaleAmount >= value + bonus, "Insufficient tokens");
            _preSaleAmount = _preSaleAmount.sub(value).sub(bonus);
        } else {
            require(_balances[msg.sender] >= value + bonus, "Insufficient tokens");
            _balances[msg.sender] = _balances[msg.sender].sub(value).sub(bonus);
        }
        _balances[to] = _balances[to].add(value);
        _bonuses[6][to] = _bonuses[6][to].add(bonus);
        emit Transfer(msg.sender, to, value.add(bonus));
        return true;
    }

    function distributeTokens(address to, uint256 value) external returns (bool){
        return distributeTokenWithBonus(to, value, calculateBonus(value), false);
    }

    function changeBonusPhaseTimestamp(uint32 start, uint32 end) external onlyOwner {
        bonusPhaseStartTimestamp = start;
        bonusPhaseEndTimestamp = end;
    }

    function calculateBonus(uint256 value) private view returns (uint256){
        if (now >= bonusPhaseStartTimestamp && now <= bonusPhaseEndTimestamp) {
            return value.mul(BONUS).div(100);
        } else {
            return 0;
        }
    }

    function withdrawMyBonus() external {
        return withdrawBonus(msg.sender);
    }

    function withdrawBonus(address owner) public {
        require(totalBonusOf(owner) > 0, "Total Bonus should be more than 0");
        if (currentAvailableBonusOf(1,owner) > 0) {
            withdrawBonusOf(1,owner);
        }
        if (currentAvailableBonusOf(3,owner) > 0) {
            withdrawBonusOf(3,owner);
        }
        if (currentAvailableBonusOf(6,owner) > 0) {
            withdrawBonusOf(6,owner);
        }
        if (currentAvailableBonusOf(12,owner) > 0) {
            withdrawBonusOf(12,owner);
        }
        if (currentAvailableBonusOf(24,owner) > 0) {
            withdrawBonusOf(24,owner);
        }
        if (currentAvailableBonusOf(48,owner) > 0) {
            withdrawBonusOf(48,owner);
        }
    }

    function totalBonusOf(address owner) public view returns (uint256) {
        return _bonuses[1][owner].add(_bonuses[3][owner]).add(_bonuses[6][owner]).
        add(_bonuses[12][owner]).add(_bonuses[24][owner]).add(_bonuses[48][owner]);
    }

    function currentAvailableBonusOf(uint8 month, address owner) internal view returns (uint256){
        if (_bonuses[month][owner] == 0 || now <= termsInMonth[month]) {
            return 0;
        } else {
            return _bonuses[month][owner];
        }
    }

    function withdrawBonusOf(uint8 month, address owner) internal onlyAfter(termsInMonth[month]) {
        require(_bonuses[month][owner] > 0, "No withdrawal bonus available");
        _balances[owner] = _balances[owner].add(_bonuses[month][owner]);
        _bonuses[month][owner] = 0;
    }

    function burn(address who, uint256 value) external onlyOwner {
        require(value <= _balances[who]);
        _balances[who] = _balances[who].sub(value);
        _totalSupply = _totalSupply.sub(value);
        emit Burn(who, value);
        emit Transfer(who, address(0), value);
    }
}
