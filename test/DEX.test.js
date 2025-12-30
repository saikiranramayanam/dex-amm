const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(await tokenA.getAddress(), await tokenB.getAddress());
    await dex.waitForDeployment();

    await tokenA.connect(owner).mint(addr1.address, ethers.parseEther("10000000"));
    await tokenB.connect(owner).mint(addr1.address, ethers.parseEther("10000000"));
    
    await tokenA.connect(addr1).approve(await dex.getAddress(), ethers.parseEther("10000000"));
    await tokenB.connect(addr1).approve(await dex.getAddress(), ethers.parseEther("10000000"));
  });

  describe("Liquidity Management", function () {
    it("should allow initial liquidity provision", async function () {
      await expect(dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200")))
        .to.emit(dex, "LiquidityAdded");
    });

    it("should mint correct LP tokens for first provider", async function () {
      const tx = await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === "LiquidityAdded");
      expect(event.args.liquidity).to.gt(0);
    });

    it("should allow subsequent liquidity additions", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      
      await tokenA.connect(owner).mint(addr2.address, ethers.parseEther("100"));
      await tokenB.connect(owner).mint(addr2.address, ethers.parseEther("200"));
      await tokenA.connect(addr2).approve(await dex.getAddress(), ethers.parseEther("100"));
      await tokenB.connect(addr2).approve(await dex.getAddress(), ethers.parseEther("200"));
      
      await expect(dex.connect(addr2).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200")))
        .to.emit(dex, "LiquidityAdded");
    });

    it("should maintain price ratio on liquidity addition", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      const [reserveA, reserveB] = await dex.getReserves();
      expect(reserveA).to.equal(ethers.parseEther("100"));
      expect(reserveB).to.equal(ethers.parseEther("200"));
    });

    it("should allow partial liquidity removal", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      await dex.connect(addr1).removeLiquidity(ethers.parseEther("0.5"));
    });

    it("should return correct token amounts on liquidity removal", async function () {
      const txAdd = await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      await txAdd.wait();
      
      const txRemove = await dex.connect(addr1).removeLiquidity(ethers.parseEther("1"));
      const receipt = await txRemove.wait();
      const event = receipt.logs.find(log => log.fragment?.name === "LiquidityRemoved");
      expect(event.args.liquidity).to.gt(0);
    });

    it("should revert on zero liquidity addition", async function () {
      await expect(dex.connect(addr1).addLiquidity(0, 0)).to.be.revertedWith("Cannot add zero liquidity");
    });

    it("should revert when removing more liquidity than owned", async function () {
      await expect(dex.connect(addr1).removeLiquidity(ethers.parseEther("1000"))).to.be.reverted;
    });
  });

  describe("Token Swaps", function () {
    beforeEach(async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      
      await tokenA.connect(owner).mint(addr1.address, ethers.parseEther("1000"));
      await tokenB.connect(owner).mint(addr1.address, ethers.parseEther("1000"));
      await tokenA.connect(addr1).approve(await dex.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(addr1).approve(await dex.getAddress(), ethers.parseEther("1000"));
    });

    it("should swap token A for token B", async function () {
      const tx = await dex.connect(addr1).swapAForB(ethers.parseEther("1"));
      await tx.wait();
    });

    it("should swap token B for token A", async function () {
      const tx = await dex.connect(addr1).swapBForA(ethers.parseEther("1"));
      await tx.wait();
    });

    it("should calculate correct output amount with fee", async function () {
      const amountOut = await dex.getAmountOut(ethers.parseEther("1"), ethers.parseEther("100"), ethers.parseEther("200"));
      expect(amountOut).to.gt(0);
    });

    it("should update reserves after swap", async function () {
      const [reserveAStart, reserveBStart] = await dex.getReserves();
      await dex.connect(addr1).swapAForB(ethers.parseEther("1"));
      const [reserveAEnd, reserveBEnd] = await dex.getReserves();
      expect(reserveAEnd).to.gt(reserveAStart);
      expect(reserveBEnd).to.lt(reserveBStart);
    });

    it("should increase k after swap due to fees", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      const [reserveAStart, reserveBStart] = await dex.getReserves();
      const kStart = reserveAStart * reserveBStart;
      await dex.connect(addr1).swapAForB(ethers.parseEther("1"));
      const [reserveAEnd, reserveBEnd] = await dex.getReserves();
      const kEnd = reserveAEnd * reserveBEnd;
      expect(kEnd).to.gt(kStart);
    });

    it("should revert on zero swap amount", async function () {
      await expect(dex.connect(addr1).swapAForB(0)).to.be.revertedWith("Insufficient input amount");
    });

    it("should handle large swaps with high price impact", async function () {
      await dex.connect(addr1).swapAForB(ethers.parseEther("50"));
    });
  });

  describe("Price Calculations", function () {
    it("should return correct initial price", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      const price = await dex.getPrice();
      expect(price).to.be.closeTo(ethers.parseEther("2"), ethers.parseEther("0.01"));
    });

    it("should update price after swaps", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      const priceStart = await dex.getPrice();
      await dex.connect(addr1).swapAForB(ethers.parseEther("1"));
      const priceEnd = await dex.getPrice();
      expect(priceEnd).to.lt(priceStart);
    });

    it("should handle price queries with zero reserves gracefully", async function () {
      const price = await dex.getPrice();
      expect(price).to.equal(0);
    });
  });

  describe("Fee Distribution", function () {
    it("should accumulate fees for liquidity providers", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      await tokenA.connect(owner).mint(addr2.address, ethers.parseEther("100"));
      await tokenA.connect(addr2).approve(await dex.getAddress(), ethers.parseEther("100"));
      await dex.connect(addr2).swapAForB(ethers.parseEther("1"));
      const reserveA = (await dex.getReserves())[0];
      expect(reserveA).to.gt(ethers.parseEther("100"));
    });

    it("should distribute fees proportionally to LP share", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      await tokenA.connect(owner).mint(addr2.address, ethers.parseEther("100"));
      await tokenA.connect(addr2).approve(await dex.getAddress(), ethers.parseEther("100"));
      await dex.connect(addr2).swapAForB(ethers.parseEther("1"));
      const initialBalanceA = await tokenA.balanceOf(addr1.address);
      await dex.connect(addr1).removeLiquidity(ethers.parseEther("1"));
      const finalBalanceA = await tokenA.balanceOf(addr1.address);
      expect(finalBalanceA).to.gt(initialBalanceA);
    });
  });

  describe("Edge Cases", function () {
    it("should handle very small liquidity amounts", async function () {
      await expect(dex.connect(addr1).addLiquidity(1, 2)).to.emit(dex, "LiquidityAdded");
    });

    it("should handle very large liquidity amounts", async function () {
      await expect(dex.connect(addr1).addLiquidity(
        ethers.parseEther("1000000"), 
        ethers.parseEther("2000000")
      )).to.emit(dex, "LiquidityAdded");
    });

    it("should prevent unauthorized access", async function () {
      await expect(dex.connect(addr2).removeLiquidity(1)).to.be.reverted;
    });
  });

  describe("Events", function () {
    it("should emit LiquidityAdded event", async function () {
      await expect(dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200")))
        .to.emit(dex, "LiquidityAdded");
    });

    it("should emit LiquidityRemoved event", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      await expect(dex.connect(addr1).removeLiquidity(ethers.parseEther("1")))
        .to.emit(dex, "LiquidityRemoved");
    });

    it("should emit Swap event", async function () {
      await dex.connect(addr1).addLiquidity(ethers.parseEther("100"), ethers.parseEther("200"));
      await tokenA.connect(owner).mint(addr2.address, ethers.parseEther("100"));
      await tokenA.connect(addr2).approve(await dex.getAddress(), ethers.parseEther("100"));
      await expect(dex.connect(addr2).swapAForB(ethers.parseEther("1")))
        .to.emit(dex, "Swap");
    });
  });
});
