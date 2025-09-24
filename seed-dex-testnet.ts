import { TonClient, WalletContractV4, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, beginCell } from '@ton/core';
import dotenv from 'dotenv';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import { TaxJettonWallet } from './output/tax-jetton_TaxJettonWallet';

dotenv.config();

const CONTRACTS = {
    TAXSTR_MASTER: 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf',
    DEX: 'EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS',
    TREASURY: 'EQAIXmV5HJf29JpvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW'
};

async function seedDex() {
    // Initialize client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TONCENTER_API_KEY,
    });

    // Initialize treasury wallet (sender)
    if (!process.env.PRIVATE_KEY_2) {
        throw new Error('PRIVATE_KEY_2 not found in environment');
    }

    const treasuryKey = await mnemonicToPrivateKey(process.env.PRIVATE_KEY_2.split(' '));
    const treasuryWallet = WalletContractV4.create({ workchain: 0, publicKey: treasuryKey.publicKey });
    const treasuryContract = client.open(treasuryWallet);

    console.log('🏛️ Treasury wallet:', treasuryWallet.address.toString());
    console.log('🔄 DEX contract:', CONTRACTS.DEX);

    // Get treasury jetton wallet address
    const jettonMaster = client.open(TaxJettonMaster.fromAddress(Address.parse(CONTRACTS.TAXSTR_MASTER)));
    const treasuryJettonWallet = await jettonMaster.getGetWalletAddress(treasuryWallet.address);
    
    console.log('💰 Treasury TAXSTR wallet:', treasuryJettonWallet.toString());

    // Check treasury balance before seeding
    const treasuryJetton = client.open(TaxJettonWallet.fromAddress(treasuryJettonWallet));
    const treasuryBalance = await treasuryJetton.getGetWalletData();
    console.log('📊 Treasury TAXSTR balance:', (Number(treasuryBalance.balance) / 1e9).toFixed(0), 'TAXSTR');

    // Create seeding transfer message (transfer to DEX)
    const seedAmount = toNano(500_000_000); // 500M TAXSTR
    const forwardAmount = toNano('0.05'); // Forward amount for DEX notification
    
    // Create forward payload for DEX seeding (if needed)
    const forwardPayload = beginCell()
        .storeStringRefTail('Seed DEX with TAXSTR') // Simple message
        .endCell();

    console.log('🌱 Seeding DEX with 500M TAXSTR...');

    // Check if treasury has enough balance
    if (Number(treasuryBalance.balance) < Number(seedAmount)) {
        throw new Error('Insufficient TAXSTR balance in treasury');
    }

    // Send transaction
    const seqno = await treasuryContract.getSeqno();
    const treasurySender = treasuryContract.sender(treasuryKey.secretKey);
    
    const seedResult = await treasuryJetton.send(
        treasurySender,
        { value: toNano('0.3') }, // Gas fee (higher for DEX interaction)
        {
            $$type: 'TokenTransfer',
            query_id: 0n,
            amount: seedAmount,
            destination: Address.parse(CONTRACTS.DEX),
            response_destination: treasuryWallet.address,
            custom_payload: null,
            forward_ton_amount: forwardAmount,
            forward_payload: forwardPayload.asSlice()
        }
    );

    console.log('✅ DEX seeding transaction sent!');
    console.log('📍 Transaction seqno:', seqno);
    console.log('⏳ Waiting for confirmation...');

    // Wait for transaction confirmation
    let currentSeqno = seqno;
    while (currentSeqno === seqno) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        currentSeqno = await treasuryContract.getSeqno();
    }

    console.log('🎉 DEX seeding confirmed!');
    
    // Check balances after seeding
    const newTreasuryBalance = await treasuryJetton.getGetWalletData();
    console.log('📊 New treasury TAXSTR balance:', (Number(newTreasuryBalance.balance) / 1e9).toFixed(0), 'TAXSTR');

    // Check DEX TAXSTR wallet balance
    try {
        const dexJettonWallet = await jettonMaster.getGetWalletAddress(Address.parse(CONTRACTS.DEX));
        console.log('💰 DEX TAXSTR wallet:', dexJettonWallet.toString());
        
        const dexJetton = client.open(TaxJettonWallet.fromAddress(dexJettonWallet));
        const dexBalance = await dexJetton.getGetWalletData();
        console.log('📊 DEX TAXSTR balance:', (Number(dexBalance.balance) / 1e9).toFixed(0), 'TAXSTR');
    } catch (error) {
        console.log('📊 DEX TAXSTR balance: Unable to check (wallet may not be deployed yet)');
    }
}

seedDex().catch(console.error);
