// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEX {
    address public tokenA;
    address public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed trader, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

   function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 liquidityMinted) {
    require(amountA > 0 && amountB > 0, "Cannot add zero liquidity");

    // Transfer tokens to DEX
    IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
    IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

    uint256 newTotalLiquidity = totalLiquidity;

    if (newTotalLiquidity == 0) {
        // First provider: sqrt(amountA/1e18 * amountB/1e18) * 1e18
        uint256 amountADecimals = amountA / 1e18;
        uint256 amountBDecimals = amountB / 1e18;
        liquidityMinted = sqrt(amountADecimals * amountBDecimals) * 1e18;
    } else {
        // Subsequent: proportional to reserve ratio
        uint256 liquidityBasedOnA = (amountA * totalLiquidity) / reserveA;
        uint256 liquidityBasedOnB = (amountB * totalLiquidity) / reserveB;
        liquidityMinted = liquidityBasedOnA < liquidityBasedOnB ? liquidityBasedOnA : liquidityBasedOnB;
    }

    liquidity[msg.sender] += liquidityMinted;
    totalLiquidity = newTotalLiquidity + liquidityMinted;
    reserveA += amountA;
    reserveB += amountB;

    emit LiquidityAdded(msg.sender, amountA, amountB, liquidityMinted);
    return liquidityMinted;
}


    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

   function removeLiquidity(uint256 liquidityAmount) external returns (uint256 amountA, uint256 amountB) {
    require(liquidityAmount > 0, "Cannot remove zero liquidity");
    require(liquidity[msg.sender] >= liquidityAmount, "Insufficient liquidity");

    amountA = (reserveA * liquidityAmount) / totalLiquidity;
    amountB = (reserveB * liquidityAmount) / totalLiquidity;

    require(amountA > 0 && amountB > 0, "Invalid amounts");

    liquidity[msg.sender] -= liquidityAmount;
    totalLiquidity -= liquidityAmount;
    reserveA -= amountA;
    reserveB -= amountB;

    IERC20(tokenA).transfer(msg.sender, amountA);
    IERC20(tokenB).transfer(msg.sender, amountB);

    emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityAmount);
    return (amountA, amountB);
}


    function swapAForB(uint256 amountAIn) external returns (uint256 amountBOut) {
        revert("TODO");
    }

    function swapBForA(uint256 amountBIn) external returns (uint256 amountAOut) {
        revert("TODO");
    }

    function getPrice() external view returns (uint256 price) {
        if (reserveA == 0) return 0;
        return (reserveB * 1e18) / reserveA; // Price of A in terms of B
    }

    function getReserves() external view returns (uint256 reserveA_, uint256 reserveB_) {
        return (reserveA, reserveB);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        revert("TODO");
    }
}
