import * as fs from "fs";

import CetusClmmSDK, {
    Percentage,
    adjustForSlippage,
    d,
} from "@cetusprotocol/cetus-sui-clmm-sdk";
import { testnet } from "./config";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import BN from "bn.js";
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Pool Address: 0x24cf587b8ef333a9806485128527209e4d2740fb3e118d6837ae5bc184719e1c
 * "coinTypeA": "0x219d80b1be5d586ff3bdbfeaf4d051ec721442c3a6498a3222773c6945a73d9f::usdt::USDT",
 * "coinTypeB": "0x2::sui::SUI",
 */

async function main() {
    const TestnetSDK = new CetusClmmSDK(testnet);

    TestnetSDK.senderAddress = "0xb8624244a433f8040fc84f33c344f673a2412550c2a1c78b1f05e382a31a96ac";

    const a2b = false;
    const pool = await TestnetSDK.Pool.getPool(
        "0x8581097ba4ffe7e8cfed6146bd536cde5d08d0f94021fded8b62803922c824bf"
    );
    const byAmountIn = true;
    const amount = new BN(1000000);
    // slippage value
    const slippage = Percentage.fromDecimal(d(5));

    const swapTicks = await TestnetSDK.Pool.fetchTicks({
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
    });

    console.log("SwapTicks data:\n", swapTicks);

    // const swapTicks =  await  sdk.Pool.fetchTicksByRpc(pool.ticks_handle)

    console.log("swapTicks length: ", swapTicks.length);

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

    const signer = buildAccount();

    if (signer) {
        const transferTxn = await TestnetSDK.fullClient.sendTransaction(
            signer,
            swapPayload
        );
        console.log("swap: ", transferTxn);
    } else {
        console.log("issue with signer")
    }
}

function buildAccount(): Ed25519Keypair | undefined {
    // Please enter your test account secret or mnemonics
    const mnemonics = process.env.MNEMONICS;
    console.log(mnemonics);
    if (mnemonics !== undefined) {
        const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics);
        return testAccountObject;
    } else {
        console.error("####### Mnemonics Not Found #######");
    }
}

async function GetPools(TestnetSDK: any) {
    const pools = await TestnetSDK.Pool.getPoolsWithPage([]);
    console.log(`pool length: ${pools.length}`);

    // Convert the result to a JSON string
    const resultJson = JSON.stringify(pools, null, 2);

    fs.writeFile("result.json", resultJson, (err) => {
        if (err) {
            console.error("Error writing to file", err);
        } else {
            console.log("File has been written successfully");
        }
    });
}

main();
