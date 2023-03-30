const Migrations = artifacts.require("ADAB");

module.exports = function(deployer) {
  deployer.deploy(Migrations,  '0x5ee9987d42F93ab8A8A4B3929994A356Bf043BD7',
      '0xaC09F21FF555Ce68A1C3e65008e26D4574f6F051', '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
      '0x3f894C649eDf4B10FDc30412811Cd173921C23F6');
};
