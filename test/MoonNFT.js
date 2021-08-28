const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require("@openzeppelin/test-helpers");

describe('MoonNFT', function() {
  let moon;
  let signers;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const Moon = await ethers.getContractFactory('MoonNFT');
    moon = await Moon.deploy(
      "MoonNFT",
      "MOONNFT",
      signers[0].address
    );
    await moon.deployed();
  });

  it('It should display name and symbol correctly', async function() {
    // Sanity check to see if everything is working properly
    expect(await moon.name()).to.equal('MoonNFT');
    expect(await moon.symbol()).to.equal('MOONNFT');
  });

  it('It should display the owner correctly', async function() {
    expect(await moon.owner()).to.equal(signers[0].address);
  });

  it('It should display the balance of the owner correctly upon initialization', async function() {
    expect(await moon.balanceOf(await moon.owner())).to.equal(100);
  });

  it("It should only allow all onlyOwner functions can only be executed by owner", async function() {
    await expect(moon.connect(signers[3]).pause()).to.be.reverted;
    await expect(moon.connect(signers[3]).unpause()).to.be.reverted;
    await expect(moon.connect(signers[3]).transferOwnership(signers[3].address)).to.be.reverted;
    await expect(moon.connect(signers[3]).renounceOwnership(signers[3].address)).to.be.reverted;
    await expect(moon.connect(signers[3]).setBaseURI("test")).to.be.reverted;
  });

  it("It should only allow the owner to change baseURI", async function() {
    await moon.setBaseURI("test");
    expect(await moon.baseURI()).to.equal("test");
  });

  it('It should only minting tokens under correct conditions', async function () {
    await moon.mint(1, {value: ethers.utils.parseEther("0.1")});
    expect(await moon.totalSupply()).to.equal(101);
    expect(await moon.balanceOf(signers[0].address)).to.equal(101);
    expect(await moon.ownerOf(101)).to.equal(signers[0].address);
    expect(await moon.tokenOfOwnerByIndex(signers[0].address, 100)).to.equal(101);
    expect(await moon.tokenByIndex(100)).to.equal(101);

    await expect(moon.mint(30, {value: ethers.utils.parseEther("3")})).to.be.reverted;
    await expect(moon.mint(10, {value: ethers.utils.parseEther("0.1")})).to.be.reverted;
  });

  it('It should not allow double voting', async function () {
    let currentVotes = await moon.getCurrentVotes(signers[0].address);
    let blockNumber = await ethers.provider.getBlockNumber();
    let priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("0");
    expect(priorVotes.toString()).to.equal("0");

    await moon.delegate(signers[0].address);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("100");
    expect(priorVotes.toString()).to.equal("0");

    await moon.delegate(signers[0].address);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("100");
    expect(priorVotes.toString()).to.equal("100");

    await moon.transferFrom(signers[0].address, signers[1].address, 1);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("99");
    expect(priorVotes.toString()).to.equal("100");
    currentVotes = await moon.getCurrentVotes(signers[1].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[1].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("0");
    expect(priorVotes.toString()).to.equal("0");

    await moon.connect(signers[1]).delegate(signers[1].address);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("99");
    expect(priorVotes.toString()).to.equal("99");
    currentVotes = await moon.getCurrentVotes(signers[1].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[1].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("1");
    expect(priorVotes.toString()).to.equal("0");

    await moon.connect(signers[1]).delegate(signers[1].address);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("99");
    expect(priorVotes.toString()).to.equal("99");
    currentVotes = await moon.getCurrentVotes(signers[1].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[1].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("1");
    expect(priorVotes.toString()).to.equal("1");
  });

  it('It should show the right number of delegated votes', async function () {
    let currentVotes = await moon.getCurrentVotes(signers[0].address);
    let blockNumber = await ethers.provider.getBlockNumber();
    let priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("0");
    expect(priorVotes.toString()).to.equal("0");

    await moon.delegate(signers[0].address);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("100");
    expect(priorVotes.toString()).to.equal("0");

    await moon.mint(1, {value: ethers.utils.parseEther("0.1")})
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("101");
    expect(priorVotes.toString()).to.equal("100");

    await moon.mint(1, {value: ethers.utils.parseEther("0.1")})
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("102");
    expect(priorVotes.toString()).to.equal("101");

    await moon.transferFrom(signers[0].address, signers[1].address, 1);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("101");
    expect(priorVotes.toString()).to.equal("102");
    currentVotes = await moon.getCurrentVotes(signers[1].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[1].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("0");
    expect(priorVotes.toString()).to.equal("0");
    await moon.connect(signers[1]).delegate(signers[1].address);
    currentVotes = await moon.getCurrentVotes(signers[1].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[1].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("1");
    expect(priorVotes.toString()).to.equal("0");

    await moon.transferFrom(signers[0].address, signers[1].address, 2);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("100");
    expect(priorVotes.toString()).to.equal("101");
    currentVotes = await moon.getCurrentVotes(signers[1].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[1].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("2");
    expect(priorVotes.toString()).to.equal("1");

    await moon.transferFrom(signers[0].address, signers[1].address, 3);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("99");
    expect(priorVotes.toString()).to.equal("100");
    currentVotes = await moon.getCurrentVotes(signers[1].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[1].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("3");
    expect(priorVotes.toString()).to.equal("2");

    await moon.transferFrom(signers[0].address, signers[1].address, 4);
    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("98");
    expect(priorVotes.toString()).to.equal("99");
    currentVotes = await moon.getCurrentVotes(signers[1].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[1].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("4");
    expect(priorVotes.toString()).to.equal("3");
  });

  it('It should allow owner of tokens to delegate by signature', async function() {
    let currentVotes = await moon.getCurrentVotes(signers[0].address);
    let blockNumber = await ethers.provider.getBlockNumber();
    let priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("0");
    expect(priorVotes.toString()).to.equal("0");

    let domain = {
      name: "MoonNFT",
      chainId: 31337,  // for testing on hardhat
      verifyingContract: moon.address,
    }

    let types = {
      Delegation: [
        {name: 'delegatee', type: 'address'},
        {name: 'nonce', type: 'uint256'},
        {name: 'expiry', type: 'uint256'},
      ]
    }

    let timeNow = await time.latest();
    expiry = ethers.BigNumber.from(timeNow.toString()).add(10);

    let values = {
      delegatee: signers[0].address,
      nonce: 0,
      expiry: expiry
    }

    let signature = await signers[0]._signTypedData(domain, types, values);
    signature = signature.substring(2);
    let r = '0x' + signature.substring(0,64);
    let s = '0x' + signature.substring(64,128);
    let v = parseInt(signature.substring(128,130), 16);

    await moon.delegateBySig(
      signers[0].address,
      0,
      expiry,
      v, r, s);

    currentVotes = await moon.getCurrentVotes(signers[0].address);
    blockNumber = await ethers.provider.getBlockNumber();
    priorVotes = await moon.getPriorVotes(signers[0].address, blockNumber - 1);
    expect(currentVotes.toString()).to.equal("100");
    expect(priorVotes.toString()).to.equal("0");
  });

  it("It should allow the owner to set timelock and withdraw the specific amount of tokens", async function() {
    await moon.connect(signers[2]).mint(20, { value: ethers.utils.parseEther("2")});
    await expect(moon.withdraw()).to.be.reverted;
    let oldBalance3 = await ethers.provider.getBalance(signers[3].address);
    let oldBalance0 = await ethers.provider.getBalance(signers[0].address);
    await moon.setTimelock(signers[3].address);
    await moon.withdraw();
    let newBalance3 = await ethers.provider.getBalance(signers[3].address);
    let newBalance0 = await ethers.provider.getBalance(signers[0].address);
    expect(oldBalance3.add(ethers.utils.parseEther("1"))).to.equal(newBalance3);
    expect(oldBalance0.add(ethers.utils.parseEther("1")).toString().substring(0,5)).to.equal(newBalance0.toString().substring(0,5));
  });
});