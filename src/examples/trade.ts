import CetusClmmSDK, {
    Percentage,
    adjustForSlippage,
    d,
} from "@cetusprotocol/cetus-sui-clmm-sdk";
import BN from "bn.js";

import { testnet } from "../config";
import { senderAccount } from "../utils/senderAccount";

async function main() {
    // instance of CetusClmmSDK for Sui testnet
    const TestnetSDK = new CetusClmmSDK(testnet);
    // get singer from the mnemonics
    const signer = senderAccount();
    // setup the senderAddress
    TestnetSDK.senderAddress = signer.toSuiAddress();

    // a2b if true swap asset a -> asset b and vice versa
    // you can get pool details with getPool and learn which asset is which
    const a2b = false;

    // fetch pool details such as
    //  "poolAddress", "poolType", "coinTypeA", "coinTypeB","ticks_handle", "name" and much more
    const pool = await TestnetSDK.Pool.getPool(
        "0x8581097ba4ffe7e8cfed6146bd536cde5d08d0f94021fded8b62803922c824bf" // One of the pool from Cetus on Sui testnet
    );
    // tells if given amount for in token or out token
    const byAmountIn = true;
    // amount to be traded
    const amount = new BN(1000000);
    // slippage value
    const slippage = Percentage.fromDecimal(d(5));

    const swapTicks = await TestnetSDK.Pool.fetchTicks({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
    });

    console.log("SwapTicks data:\n", swapTicks);

    const res = TestnetSDK.Swap.calculateRates({
        decimalsA: 0,
        decimalsB: 9,
        a2b,
        byAmountIn,
        amount,
        swapTicks,
        currentPool: pool,
    });

    console.log("calculateRates###res###", {
        estimatedAmountIn: res.estimatedAmountIn.toString(),
        estimatedAmountOut: res.estimatedAmountOut.toString(),
        estimatedEndSqrtPrice: res.estimatedEndSqrtPrice.toString(),
        estimatedFeeAmount: res.estimatedFeeAmount.toString(),
        isExceed: res.isExceed,
        extraComputeLimit: res.extraComputeLimit,
        amount: res.amount.toString(),
        aToB: res.aToB,
        byAmountIn: res.byAmountIn,
    });

    const toAmount = byAmountIn
        ? res.estimatedAmountOut
        : res.estimatedAmountIn;
    const amountLimit = adjustForSlippage(toAmount, slippage, !byAmountIn);

    // build swap Payload
    const swapPayload = await TestnetSDK.Swap.createSwapTransactionPayload({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        a2b,
        by_amount_in: byAmountIn,
        amount: res.amount.toString(),
        amount_limit: amountLimit.toString(),
    });

    if (signer) {
        const transferTxn = await TestnetSDK.fullClient.sendTransaction(
            signer,
            swapPayload
        );
        console.log("swap: ", transferTxn);
    } else {
        console.log("issue with signer");
    }
}

main();
