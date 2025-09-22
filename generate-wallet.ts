import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4, WalletContractV3R2 } from "@ton/ton";
import { Address } from "@ton/core";

async function generateWallet() {
    console.log("🔐 Generating new TON wallet...\n");

    // Generate new mnemonic
    const mnemonic = await mnemonicNew(24);
    console.log("📝 Mnemonic (24 words):");
    console.log(mnemonic.join(" "));
    console.log();

    // Generate key pair from mnemonic
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    
    // Create V4 wallet (most common)
    const walletV4 = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });

    // Create V3R2 wallet (alternative)
    const walletV3R2 = WalletContractV3R2.create({
        workchain: 0,
        publicKey: keyPair.publicKey
    });

    console.log("🏦 Wallet Addresses:");
    console.log(`V4:   ${walletV4.address.toString()}`);
    console.log(`V3R2: ${walletV3R2.address.toString()}`);
    console.log();

    console.log("🌐 Testnet Addresses:");
    console.log(`V4:   ${walletV4.address.toString({ testOnly: true })}`);
    console.log(`V3R2: ${walletV3R2.address.toString({ testOnly: true })}`);
    console.log();

    console.log("🔑 Private Key (hex):");
    console.log(keyPair.secretKey.toString("hex"));
    console.log();

    console.log("📋 Add this to your .env file:");
    console.log(`PRIVATE_KEY="${mnemonic.join(" ")}"`);
    console.log();

    console.log("💰 To get testnet TON:");
    console.log("1. Visit: https://faucet.tonwhales.com/");
    console.log(`2. Send testnet TON to: ${walletV4.address.toString({ testOnly: true })}`);
    console.log();

    console.log("🚀 To deploy your jetton:");
    console.log("1. Copy the mnemonic to your .env file");
    console.log("2. Get some testnet TON from the faucet");
    console.log("3. Run: npm run verifier:testnet");
}

generateWallet().catch(console.error);
