const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying DEX contracts...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Account index: 0\n");

  // Deploy Token A
  console.log("📦 Deploying Token A (TKA)...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Token A", "TKA");
  await tokenA.waitForDeployment();
  console.log("✅ Token A deployed to:", await tokenA.getAddress());

  // Deploy Token B
  console.log("📦 Deploying Token B (TKB)...");
  const tokenB = await MockERC20.deploy("Token B", "TKB");
  await tokenB.waitForDeployment();
  console.log("✅ Token B deployed to:", await tokenB.getAddress());

  // Deploy DEX
  console.log("\n🔄 Deploying DEX...");
  const DEX = await hre.ethers.getContractFactory("DEX");
  const dex = await DEX.deploy(await tokenA.getAddress(), await tokenB.getAddress());
  await dex.waitForDeployment();
  console.log("✅ DEX deployed to:", await dex.getAddress());

  // Mint initial tokens for testing
  console.log("\n💰 Minting test tokens...");
  const amount = hre.ethers.parseEther("10000000");
  
  await tokenA.connect(deployer).mint(deployer.address, amount);
  await tokenB.connect(deployer).mint(deployer.address, amount);
  console.log("✅ Minted 10M tokens to deployer");

  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("\n📋 Contract Addresses:");
  console.log("Token A (TKA):", await tokenA.getAddress());
  console.log("Token B (TKB):", await tokenB.getAddress());
  console.log("DEX:", await dex.getAddress());
  
  console.log("\n✅ Ready for testing: npx hardhat test");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exitCode = 1;
  });
