import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export function senderAccount(): Ed25519Keypair {
    // Please enter your test account secret or mnemonics
    const mnemonics = process.env.MNEMONICS;

    if (!mnemonics) {
        throw new Error("Mnemonics not found");
    }

    const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics);
    return testAccountObject;
}
