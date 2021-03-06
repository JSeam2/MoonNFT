const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@openzeppelin/test-helpers');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');

describe('GovernorBravo', function() {
  let moon;
  let delegate;
  let delegator;
  let proxy;
  let signers;
  let dummyToken;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const DummyToken = await ethers.getContractFactory("DummyERC20"); 
    dummyToken = await DummyToken.deploy(
      "dummy",
      "DUMMY"
    )
    await dummyToken.deployed();


    const MoonNFT = await ethers.getContractFactory('MoonNFT');
    moon = await MoonNFT.deploy(
      "MoonNFT",
      "MOONNFT",
      signers[0].address
    );
    await moon.deployed();
    for (let i = 0; i < 15; i++) {
      await moon.connect(signers[1]).mint(20, { value: ethers.utils.parseEther("2.0")});
    } 
    await moon.delegate(signers[0].address);
    await moon.connect(signers[1]).delegate(signers[1].address);

    // Predetermine GovernorBravoDelegator address
    let nonce = await ethers.provider.getTransactionCount(signers[0].address);
    nonce = nonce + 3; // increment by 1 to account for next contract

    const rlp_encoded = ethers.utils.RLP.encode(
      [signers[0].address, ethers.BigNumber.from(nonce.toString()).toHexString()]
    );
    const contract_address_long = ethers.utils.keccak256(rlp_encoded);
    const contract_address = '0x'.concat(contract_address_long.substring(26));
    let adminAddr = ethers.utils.getAddress(contract_address);

    const Timelock = await ethers.getContractFactory("Timelock");
    timelock = await Timelock.deploy(
      adminAddr,
      172800 // 2 days
    );
    await timelock.deployed();

    const Delegate = await ethers.getContractFactory("GovernorBravoDelegate");
    delegate = await Delegate.deploy();
    await delegate.deployed();

    const Delegator = await ethers.getContractFactory("GovernorBravoDelegator");
    delegator = await Delegator.deploy(
      timelock.address,
      moon.address,
      signers[0].address,
      delegate.address,
      5760, // min voting period, in terms of number of blocks, this is around 22-24 hours
      1,  // min voting delay, in terms of number of blocks, this is around 14 seconds
      100,  // 100 moonNFT threshold
    );
    await delegator.deployed();

    // to use delegate calls
    proxy = await delegate.attach(delegator.address);

    proxy._initiate(ethers.constants.AddressZero);

    // send some eth to the timelock
    await signers[0].sendTransaction({
      to: timelock.address,
      value: ethers.utils.parseEther("1")
    });

    // send some dummy tokens to timelock
    await dummyToken.transfer(timelock.address, 1000);
    await moon.transferFrom(signers[0].address, timelock.address, 5);

    // advance by 2 blocks for getPriorVotes to be setup
    await time.advanceBlock();
    await time.advanceBlock();
  });

  it('It should show admin addresses correctly', async function() {
    expect(await proxy.admin()).to.equal(signers[0].address);
    expect(await timelock.admin()).to.equal(delegator.address);
  })

  it('It should show the balance of the timelock contract correctly', async function() {
    let balance = await ethers.provider.getBalance(timelock.address);
    expect(balance.toString()).to.equal(ethers.utils.parseEther("1"))

    balance = await dummyToken.balanceOf(timelock.address);
    expect(balance.toString()).to.equal("1000")
  });

  it('It should allow users to vote and execute on an eth fund transfer', async function() {
    let oldbalance = await ethers.provider.getBalance(signers[3].address);

    // propose something
    await proxy.propose(
      [signers[3].address],
      [ethers.utils.parseEther("0")],
      [ethers.utils.parseEther("0.1")],
      [""],
      [ethers.BigNumber.from(0)],
      "Send funds to 3rd signer"
    );
    // get state
    expect(await proxy.state(2)).to.equal(0);

    // get data
    let actions = await proxy.getActions(2);
    expect(actions[0][0]).to.equal(signers[3].address);
    expect(actions[1][0]).to.equal(ethers.utils.parseEther("0"));
    expect(actions[2][0]).to.equal(ethers.utils.parseEther("0.1"));
    expect(actions[3][0]).to.equal("");
    expect(actions[4][0]).to.equal("0x00");

    // vote
    await time.advanceBlock();
    await proxy.castVote(2, 1);
    await proxy.connect(signers[1]).castVote(2, 1);
    let receipt = await proxy.getReceipt(2, signers[0].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(100);
    receipt = await proxy.getReceipt(2, signers[1].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(300);

    let latestBlock = await time.latestBlock();
    latestBlock = latestBlock.toNumber();
    await time.advanceBlockTo(latestBlock + 5760 + 1);
    expect(await proxy.state(2)).to.equal(4);
    await proxy.queue(2);
    expect(await proxy.state(2)).to.equal(5);

    await time.increase(172800);
    await proxy.execute(2);
    expect(await proxy.state(2)).to.equal(7);

    let balance = await ethers.provider.getBalance(signers[3].address);
    expect(balance.toString()).to.equal(oldbalance.add(ethers.utils.parseEther("0.1")));

    balance = await ethers.provider.getBalance(timelock.address);
    expect(balance.toString()).to.equal(ethers.utils.parseEther("0.9"));
  });

  it('It should allow users to vote and have the executor execute an eth fund transfer', async function() {
    let oldbalance3 = await ethers.provider.getBalance(signers[3].address);

    // propose something
    await proxy.propose(
      [signers[3].address],
      [ethers.utils.parseEther("0.1")],
      [ethers.utils.parseEther("0.1")],
      [""],
      [ethers.BigNumber.from(0)],
      "Send funds to 3rd signer"
    );
    // get state
    expect(await proxy.state(2)).to.equal(0);

    // get data
    let actions = await proxy.getActions(2);
    expect(actions[0][0]).to.equal(signers[3].address);
    expect(actions[1][0]).to.equal(ethers.utils.parseEther("0.1"));
    expect(actions[2][0]).to.equal(ethers.utils.parseEther("0.1"));
    expect(actions[3][0]).to.equal("");
    expect(actions[4][0]).to.equal("0x00");

    // vote
    await time.advanceBlock();
    await proxy.castVote(2, 1);
    await proxy.connect(signers[2]).castVote(2, 1);
    let receipt = await proxy.getReceipt(2, signers[0].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(100);
    receipt = await proxy.getReceipt(2, signers[1].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(300);

    let latestBlock = await time.latestBlock();
    latestBlock = latestBlock.toNumber();
    await time.advanceBlockTo(latestBlock + 5760 + 1);
    expect(await proxy.state(2)).to.equal(4);
    await proxy.queue(2);
    expect(await proxy.state(2)).to.equal(5);

    await time.increase(172800);
    await proxy.connect(signers[1]).execute(2, {value: ethers.utils.parseEther("0.1")});
    expect(await proxy.state(2)).to.equal(7);

    let balance = await ethers.provider.getBalance(signers[3].address);
    expect(balance.toString()).to.equal(oldbalance3.add(ethers.utils.parseEther("0.1")));

    balance = await ethers.provider.getBalance(signers[1].address);
    expect(balance.toString().substring(0, 5)).to.equal("99998");

    balance = await ethers.provider.getBalance(timelock.address);
    expect(balance.toString()).to.equal(ethers.utils.parseEther("1.0"));
  });

  it('It should allow users to vote and execute on a token fund transfer', async function() {
    let oldbalance = await dummyToken.balanceOf(signers[3].address);

    const abiCoder = ethers.utils.defaultAbiCoder;
    const transferCalldata = abiCoder.encode(
      ['address', 'uint256'],
      [signers[3].address, 10]
    )

    // propose something
    await proxy.propose(
      [dummyToken.address],
      [ethers.utils.parseEther("0")],
      [ethers.utils.parseEther("0")],
      ["transfer(address,uint256)"],
      [transferCalldata],
      "Send funds to 3rd signer"
    );

    // get state
    expect(await proxy.state(2)).to.equal(0);

    // get data
    let actions = await proxy.getActions(2);
    expect(actions[0][0]).to.equal(dummyToken.address);
    expect(actions[1][0]).to.equal(ethers.utils.parseEther("0"));
    expect(actions[2][0]).to.equal(ethers.utils.parseEther("0"));
    expect(actions[3][0]).to.equal("transfer(address,uint256)");
    expect(actions[4][0]).to.equal(transferCalldata);

    // vote
    await time.advanceBlock();
    await proxy.castVote(2, 1);
    await proxy.connect(signers[2]).castVote(2, 1);
    let receipt = await proxy.getReceipt(2, signers[0].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(100);
    receipt = await proxy.getReceipt(2, signers[1].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(300);

    let latestBlock = await time.latestBlock();
    latestBlock = latestBlock.toNumber();
    await time.advanceBlockTo(latestBlock + 5760 + 1);
    expect(await proxy.state(2)).to.equal(4); 
    await proxy.queue(2);
    expect(await proxy.state(2)).to.equal(5);

    await time.increase(172800);
    await proxy.execute(2);
    expect(await proxy.state(2)).to.equal(7);

    let balance = await dummyToken.balanceOf(signers[3].address);
    expect(balance).to.equal(oldbalance + 10);
  });

  it('It should allow users to vote and execute on a NFT transfer', async function() {
    const abiCoder = ethers.utils.defaultAbiCoder;
    const transferCalldata = abiCoder.encode(
      ['address', 'address', 'uint256'],
      [timelock.address, signers[3].address, 5]
    )

    // propose something
    await proxy.propose(
      [moon.address],
      [ethers.utils.parseEther("0")],
      [ethers.utils.parseEther("0")],
      ["transferFrom(address,address,uint256)"],
      [transferCalldata],
      "Send NFT to 3rd signer"
    );

    // get state
    expect(await proxy.state(2)).to.equal(0);

    // get data
    let actions = await proxy.getActions(2);
    expect(actions[0][0]).to.equal(moon.address);
    expect(actions[1][0]).to.equal(ethers.utils.parseEther("0"));
    expect(actions[2][0]).to.equal(ethers.utils.parseEther("0"));
    expect(actions[3][0]).to.equal("transferFrom(address,address,uint256)");
    expect(actions[4][0]).to.equal(transferCalldata);

    // vote
    await time.advanceBlock();
    await proxy.castVote(2, 1);
    await proxy.connect(signers[2]).castVote(2, 1);
    let receipt = await proxy.getReceipt(2, signers[0].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(100);
    receipt = await proxy.getReceipt(2, signers[1].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(300);

    let latestBlock = await time.latestBlock();
    latestBlock = latestBlock.toNumber();
    await time.advanceBlockTo(latestBlock + 5760 + 1);
    expect(await proxy.state(2)).to.equal(4); 
    await proxy.queue(2);
    expect(await proxy.state(2)).to.equal(5);

    await time.increase(172800);
    await proxy.execute(2);
    expect(await proxy.state(2)).to.equal(7);

    let balance = await moon.balanceOf(signers[3].address);
    expect(balance).to.equal(1);
  });

  it('It should allow users to reject a proposal', async function() {
    const abiCoder = ethers.utils.defaultAbiCoder;
    const transferCalldata = abiCoder.encode(
      ['address', 'address', 'uint256'],
      [timelock.address, signers[3].address, 5]
    )

    // propose something
    await proxy.propose(
      [moon.address],
      [ethers.utils.parseEther("0")],
      [ethers.utils.parseEther("0")],
      ["transferFrom(address,address,uint256)"],
      [transferCalldata],
      "Send NFT to 3rd signer"
    );

    // get state
    expect(await proxy.state(2)).to.equal(0);

    // get data
    let actions = await proxy.getActions(2);
    expect(actions[0][0]).to.equal(moon.address);
    expect(actions[1][0]).to.equal(ethers.utils.parseEther("0"));
    expect(actions[2][0]).to.equal(ethers.utils.parseEther("0"));
    expect(actions[3][0]).to.equal("transferFrom(address,address,uint256)");
    expect(actions[4][0]).to.equal(transferCalldata);

    // vote
    await time.advanceBlock();
    await proxy.castVote(2, 1);
    await proxy.connect(signers[2]).castVote(2, 0);
    let receipt = await proxy.getReceipt(2, signers[0].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(1);
    expect(receipt[2]).to.equal(100);
    receipt = await proxy.getReceipt(2, signers[0].address);
    expect(receipt[0]).to.equal(true);
    expect(receipt[1]).to.equal(0);
    expect(receipt[2]).to.equal(300);

    let state = await proxy.state(2);
    expect(state).to.equal(3);
    await expect(proxy.queue(2)).to.be.reverted;
  });
});