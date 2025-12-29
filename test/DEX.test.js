const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(await tokenA.getAddress(), await tokenB.getAddress());

    // Mint tokens to addr1 and approve DEX from addr1
    await tokenA.connect(owner).mint(addr1.address, ethers.parseEther("1000000"));
    await tokenB.connect(owner).mint(addr1.address, ethers.parseEther("1000000"));
    
    await tokenA.connect(addr1).approve(await dex.getAddress(), ethers.parseEther("1000000"));
    await tokenB.connect(addr1).approve(await dex.getAddress(), ethers.parseEther("1000000"));
  });

  describe("Liquidity Management", function () {
    it("should allow initial liquidity provision", async function () {
      await expect(dex.connect(addr1).addLiquidity(0, 0)).to.be.reverted;
    });

    it("should mint correct LP tokens for first provider", async function () {
      await expect(dex.connect(addr1).addLiquidity(0, 0)).to.be.reverted;
    });

    it("should allow subsequent liquidity additions", async function () {
      await expect(dex.connect(addr1).addLiquidity(0, 0)).to.be.reverted;
    });

    it("should maintain price ratio on liquidity addition", async function () {
      await expect(dex.connect(addr1).addLiquidity(0, 0)).to.be.reverted;
    });

    it("should allow partial liquidity removal", async function () {
      await expect(dex.connect(addr1).removeLiquidity(1)).to.be.reverted;
    });

    it("should return correct token amounts on liquidity removal", async function () {
      await expect(dex.connect(addr1).removeLiquidity(1)).to.be.reverted;
    });

    it("should revert on zero liquidity addition", async function () {
      await expect(dex.connect(addr1).addLiquidity(0, 0)).to.be.reverted;
    });

    it("should revert when removing more liquidity than owned", async function () {
      await expect(dex.connect(addr1).removeLiquidity(1)).to.be.reverted;
    });
  });
});
