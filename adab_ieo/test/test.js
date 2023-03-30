const ADAB = artifacts.require("ADAB");
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js');

contract("ADAB IEO token test", async accounts => {
    let instance;
    let contractAddress;
    let blockTimestamp;
    let reserveFundAddress;
    let fundHoldingAddress;
    let advisorAddress;
    let owner;
    let i = 1;

    beforeEach(async () => {
        instance = await ADAB.new('0x5ee9987d42F93ab8A8A4B3929994A356Bf043BD7',
            '0xaC09F21FF555Ce68A1C3e65008e26D4574f6F051', '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
            '0x3f894C649eDf4B10FDc30412811Cd173921C23F6');
        contractAddress = instance.address;
        console.log("Contract address: " + contractAddress);

        owner =     accounts[0];

        reserveFundAddress = await instance._reserveFundAddress();
        fundHoldingAddress = await instance._fundHoldingAddress();
        advisorAddress = await instance._advisorAddress();

        //start always with 1st period
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            params: ["1548676801"],
            id: i++
        }, function (err, result) {
            console.log(result);
        });

        let block = await web3.eth.getBlock('latest');
        blockTimestamp = block.timestamp;

        console.log("block timestamp before test: " + blockTimestamp);
    });

    it("should distribute private sales token for type 1", async () => {
        let meta = instance;
        let account = accounts[1];
        let account2 = accounts[2];
        let account3 = accounts[3];
        let myAmount = "12";
        let myBonus = "10";
        let ownerBalance1 = await meta.balanceOf(owner)

        await meta.distributeTokenWithBonus(account, web3.utils.toWei(myAmount, 'ether'), web3.utils.toWei(myBonus, 'ether'), false);
        let holding = await meta.holdingOf(account)
        assert.equal(holding.toString(), web3.utils.toWei((myAmount).toString(), 'ether'));

        let balance = await meta.balanceOf(account)
        assert.equal(balance.valueOf(), web3.utils.toWei((parseInt(myAmount) + parseInt(myBonus)).toString(), 'ether'));

        let ownerBalance2 = await meta.balanceOf(owner)
        assert.notEqual(ownerBalance1, ownerBalance2);

        let bonus = await meta.bonusOf(account)
        assert.equal(bonus[0].valueOf(), 0);
        assert.equal(bonus[1].valueOf(), 0);
        assert.equal(bonus[2].valueOf(), web3.utils.toWei((myBonus).toString(), 'ether'));

        await truffleAssert.fails(meta.distributeTokenWithBonus(account3, 1, 1, false,{from: account3}), truffleAssert.ErrorType.REVERT, "Can" +
            " be called only by owner.");

        await meta.transfer(account2, holding.valueOf(), {from: account});
        holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), 0);
        await truffleAssert.fails(meta.transfer(account2, 1, {from: account}), truffleAssert.ErrorType.REVERT, "Not enough Token Balance.");
        holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), 0);

        await meta.distributeTokenWithBonus(account, web3.utils.toWei(myAmount, 'ether'), web3.utils.toWei(myBonus, 'ether'), true);

        let ownerBalance3 = await meta.balanceOf(owner)
        assert.equal(ownerBalance2.toString(), ownerBalance3.toString());
    });

    it("should distribute regular tokens", async () => {
        let meta = instance;
        let account = accounts[5];
        let account2 = accounts[6];
        let myAmount = 100;
        let myBonus = 50;
        await meta.distributeTokenWithBonus(account, web3.utils.toWei(myAmount.toString(), 'ether'),
            web3.utils.toWei(myBonus.toString(), 'ether'), false);
        let holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), web3.utils.toWei((myAmount).toString(), 'ether'));

        let balance = await meta.balanceOf(account)
        assert.equal(balance.toString(), web3.utils.toWei((myAmount + myBonus).toString(), 'ether'));

        let bonus = await meta.bonusOf(account)
        assert.equal(bonus[0].toString(), 0);
        assert.equal(bonus[1].toString(), 0);
        assert.equal(bonus[2].toString(), web3.utils.toWei(myBonus.toString(), 'ether'));

        await truffleAssert.fails(meta.transfer(account2, holding.valueOf() + 1, {from: account}), truffleAssert.ErrorType.REVERT);

        await meta.transfer(account2, holding.valueOf(), {from: account});
        holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), 0);
        await truffleAssert.fails(meta.transfer(account2, 1, {from: account}), truffleAssert.ErrorType.REVERT);
        holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), 0);

        await meta.withdrawBonus(account);
        bonus = await meta.bonusOf(account)

        assert.equal(bonus[0].toString(), 0);
        assert.equal(bonus[1].toString(), 0);
        assert.equal(bonus[2].toString(), web3.utils.toWei(myBonus.toString(), 'ether'));

        holding = await meta.holdingOf(account);
        assert.equal(holding.valueOf(), 0);


        let totalBonus = await meta.totalBonusOf(account);
        assert.equal(totalBonus.toString(), web3.utils.toWei((myBonus).toString(), 'ether'));

        // bonus withdrawal for accounts where is NO bonus is not possible
        await truffleAssert.fails(meta.withdrawBonus(account2), truffleAssert.ErrorType.REVERT);
    });

    it("should finalize IEO", async () => {
        let meta = instance;
        let account = accounts[6];
        // send 1 ether to contract account
        await web3.eth.sendTransaction({
            from: account,
            to: contractAddress,
            value: web3.utils.toWei("1", "ether")
        });

        // check contract balance
        let contractBalance = await web3.eth.getBalance(contractAddress);
        assert.equal(web3.utils.fromWei(contractBalance.toString(), 'ether'), "1");

        let date = new Date(blockTimestamp * 1000);
        console.log("Current time: " + date);

        // try to finaliseIEO
        await truffleAssert.fails(meta.finaliseIEO(), truffleAssert.ErrorType.REVERT, "Function called too early.");

        // try to safeWithdrawal ether
        await truffleAssert.fails(meta.safeWithdrawal(), truffleAssert.ErrorType.REVERT, "IEO must be stopped.");

        // move time forward to IEO end date
        console.log("Setting IEO end date");
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            params: ["1558828801"],
            id: 12345
        }, function (err, result) {
        });

        // check block timestamp after time movement
        let block = await web3.eth.getBlock('latest');
        blockTimestamp = block.timestamp;
        console.log("new block timestamp: " + blockTimestamp);
        date = new Date(blockTimestamp * 1000);
        console.log("Current time: " + date);

        // check if IEO finished
        assert.equal(blockTimestamp, "1558828801");

        let fundHoldingBalance = await meta.holdingOf(fundHoldingAddress);
        assert.equal(web3.utils.fromWei(fundHoldingBalance.toString(), 'ether'), "195544547");

        let advisorBalance = await meta.balanceOf(advisorAddress);
        assert.equal(advisorBalance.toString(), web3.utils.toWei("10500000", 'ether'));

        let reserveFundHolding = await meta.balanceOf(reserveFundAddress);
        assert.equal(reserveFundHolding.toString(), web3.utils.toWei("63000000", 'ether'));

        let totalAmount = parseInt(fundHoldingBalance.toString()) + parseInt(advisorBalance.toString()) + parseInt(reserveFundHolding.toString());

        await meta.finaliseIEO();

        await truffleAssert.fails(meta.distributeTokenWithBonus(account, 1, 1, false), truffleAssert.ErrorType.REVERT, "IEO" +
            " must be in progress");

        // send 1 ether to contract account
        await truffleAssert.fails(web3.eth.sendTransaction({
            from: account,
            to: contractAddress,
            value: web3.utils.toWei("1", "ether")
        }), "IEO must be in progress");

        //check if fundHolding account balance is 0
        fundHoldingBalance = await meta.balanceOf(fundHoldingAddress);
        assert.equal(fundHoldingBalance.valueOf(), 0);

        //check if advisor account balance is 0
        advisorBalance = await meta.balanceOf(advisorAddress);
        assert.equal(advisorBalance.toString(), 0);

        //check if reserveFund account balance is 0
        reserveFundHolding = await meta.holdingOf(reserveFundAddress);
        assert.equal(reserveFundHolding.toString(), 0);

        //check if reserveFund account balance is equal to totalAmount
        assert.equal(parseInt((await meta.balanceOf(reserveFundAddress)).toString()).toFixed(), totalAmount.toFixed());

        //get initial account balance
        let fundHoldingBalanceEth1 = await web3.eth.getBalance(fundHoldingAddress);

        await meta.safeWithdrawal();

        //get contract balance after safeWithdrawal
        contractBalance = await web3.eth.getBalance(contractAddress);
        assert.equal(contractBalance.toString(), 0);

        //get funding account balance after safeWithdrawal
        let fundHoldingBalanceEth = await web3.eth.getBalance(fundHoldingAddress);
        assert.isAbove(new BigNumber(fundHoldingBalanceEth.toString()).minus(new BigNumber(fundHoldingBalanceEth1.toString())).toNumber(), 0);
    });

    it("should allow to change phases timestamps", async () => {
        let meta = instance;

        let firstPhaseStartTimestamp = await meta.bonusPhaseStartTimestamp();
        let firstPhaseEndTimestamp = await meta.bonusPhaseEndTimestamp();

        // assert.equal(firstPhaseStartTimestamp.toString(), "1555372800");
        // assert.equal(firstPhaseEndTimestamp.toString(), "1556236799");
        // assert.equal(secondPhaseStartTimestamp.toString(), "1556755200");
        // assert.equal(secondPhaseEndTimestamp.toString(), "1558828799");

        await meta.changeBonusPhaseTimestamp(1554681900, 1556668999);

        firstPhaseStartTimestamp = await meta.bonusPhaseStartTimestamp();
        firstPhaseEndTimestamp = await meta.bonusPhaseEndTimestamp();

        assert.equal(firstPhaseStartTimestamp.toString(), "1554681900");
        assert.equal(firstPhaseEndTimestamp.toString(), "1556668999");

    });

    it("should allow to withdraw bonuses according to freeze periods", async () => {
        let meta = instance;
        let account = accounts[9];
        let account2 = accounts[3];
        let myAmount = 100;
        let myBonus = 50;

        await meta.distributeTokenWithBonus(account, web3.utils.toWei(myAmount.toString(), 'ether'), web3.utils.toWei(myBonus.toString(), 'ether'), false);
        let balance = await meta.balanceOf(account)
        assert.equal(balance.toString(), web3.utils.toWei((myAmount + myBonus).toString(), 'ether'));

        let holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), web3.utils.toWei((myAmount).toString(), 'ether'));

        await meta.transfer(account2, holding.valueOf(), {from: account});
        holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), 0);

        await truffleAssert.fails(meta.transfer(account2, balance.valueOf(), {from: account}), truffleAssert.ErrorType.REVERT, "Not enough Token Balance");

        //move to 1 month after IEO end
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            params: ["1561507201"],
            id: 12345
        }, function (err, result) {
        });

        // try to unlock 1st month bonus
        await meta.withdrawBonus(account);

        //check current holding
        holding = await meta.holdingOf(account)
        assert.equal(holding.toString(), "0");

        //transfer available amount of tokens to another address
        await meta.transfer(account2, holding.valueOf(), {from: account});

        balance = await meta.balanceOf(account)
        assert.equal(balance.valueOf(), web3.utils.toWei(myBonus.toString(), 'ether'));

        //transfer frozen amount - should fail
        // await truffleAssert.fails(meta.transfer(account2, holding.valueOf(), {from: account}), truffleAssert.ErrorType.REVERT, "Not enough Token Balance");

        //move to 3 month after IEO end
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            params: ["1566777601"],
            id: 12345
        }, function (err, result) {
        });

        // try to unlock 3rd month bonus
        await meta.withdrawBonus(account);

        holding = await meta.holdingOf(account)
        assert.equal(holding.toString(), "0");

        //transfer available amount of tokens to another address
        await meta.transfer(account2, holding.valueOf(), {from: account});

        // no more withdrawable balance left
        holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), 0);

        // total amount left to withdraw
        balance = await meta.balanceOf(account)
        assert.equal(balance.toString(), web3.utils.toWei((myBonus).toString(), 'ether'));

        // //try to withdraw bonus before waiting 12 month
        // await truffleAssert.fails(meta.transfer(account2, balance.valueOf(), {from: account}),
        // truffleAssert.ErrorType.REVERT, "Not enough Token Balance");

        //move to 6 month after IEO end
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            params: ["1574726401"],
            id: 12345
        }, function (err, result) {
        });

        // try to unlock 6th month bonus
        await meta.withdrawBonus(account);

        holding = await meta.holdingOf(account)
        assert.equal(holding.toString(), web3.utils.toWei(myBonus.toString(), 'ether'));

        //transfer available amount of tokens to another address
        await meta.transfer(account2, holding.valueOf(), {from: account});

        // no more withdrawable balance left
        holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), 0);

        // no more total balance left
        balance = await meta.balanceOf(account)
        assert.equal(balance.toString(), 0);

        await truffleAssert.fails(meta.transfer(account2, 1, {from: account}), truffleAssert.ErrorType.REVERT, "Not" +
            " enough Token Balance");
    });

    it("should allow to burn tokens for any investor", async () => {
        let meta = instance;
        let account = accounts[9];
        let account2 = accounts[3];
        let myAmount = 100;
        let myBonus = 50;

        let totalSupply = await meta.totalSupply();

        await meta.distributeTokenWithBonus(account, web3.utils.toWei(myAmount.toString(), 'ether'), web3.utils.toWei(myBonus.toString(), 'ether'), false);
        let balance = await meta.balanceOf(account)
        assert.equal(balance.toString(), web3.utils.toWei((myAmount + myBonus).toString(), 'ether'));

        await meta.burn(account, web3.utils.toWei(myBonus.toString(), 'ether'));

        let holding = await meta.holdingOf(account)
        assert.equal(holding.valueOf(), web3.utils.toWei((myBonus).toString(), 'ether'));

        balance = await meta.balanceOf(account)
        assert.equal(balance.toString(), web3.utils.toWei((myAmount).toString(), 'ether'));

        let totalSupply1 = await meta.totalSupply();
        assert.equal(web3.utils.fromWei(totalSupply1.toString(), 'ether'),
            web3.utils.fromWei((totalSupply.valueOf()).toString(), 'ether').toString() - 50);
    });
})
;