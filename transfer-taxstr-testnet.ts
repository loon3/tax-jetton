import { TonClient, WalletContractV4, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, beginCell } from '@ton/core';
import dotenv from 'dotenv';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import { TaxJettonWallet } from './output/tax-jetton_TaxJettonWallet';

dotenv.config();

const CONTRACTS = {
    TAXSTR_MASTER: 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf',
    TREASURY: 'EQAIXmV5HJf29JpvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW',
    DEPLOYER: 'EQCYlrz-F9Vharb6ct0Y2TuERderobVhqvnycvnQIHUHRm1c'
};

async function transferTaxstr() {
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
    console.log('👤 Deployer wallet:', CONTRACTS.DEPLOYER);

    // Get treasury jetton wallet address
    const jettonMaster = client.open(TaxJettonMaster.fromAddress(Address.parse(CONTRACTS.TAXSTR_MASTER)));
    const treasuryJettonWallet = await jettonMaster.getGetWalletAddress(treasuryWallet.address);
    
    console.log('💰 Treasury TAXSTR wallet:', treasuryJettonWallet.toString());

    // Check treasury balance before transfer
    const treasuryJetton = client.open(TaxJettonWallet.fromAddress(treasuryJettonWallet));
    const treasuryBalance = await treasuryJetton.getGetWalletData();
    console.log('📊 Treasury TAXSTR balance:', (Number(treasuryBalance.balance) / 1e9).toFixed(0), 'TAXSTR');

    // Create transfer message
    const transferAmount = toNano(100_000_000); // 100M TAXSTR
    const forwardAmount = toNano('0.01'); // Forward amount for notification

    console.log('🔄 Sending 100M TAXSTR from treasury to deployer...');

    // Send transaction
    const seqno = await treasuryContract.getSeqno();
    const treasurySender = treasuryContract.sender(treasuryKey.secretKey);
    
    const transferResult = await treasuryJetton.send(
        treasurySender,
        { value: toNano('0.2') }, // Gas fee
        {
            $$type: 'TokenTransfer',
            query_id: 0n,
            amount: transferAmount,
            destination: Address.parse(CONTRACTS.DEPLOYER),
            response_destination: treasuryWallet.address,
            custom_payload: null,
            forward_ton_amount: forwardAmount,
            forward_payload: beginCell().endCell().asSlice()
        }
    );

    console.log('✅ Transfer transaction sent!');
    console.log('📍 Transaction seqno:', seqno);
    console.log('⏳ Waiting for confirmation...');

    // Wait for transaction confirmation
    let currentSeqno = seqno;
    while (currentSeqno === seqno) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        currentSeqno = await treasuryContract.getSeqno();
    }

    console.log('🎉 Transfer confirmed!');
    
    // Check balances after transfer
    const newTreasuryBalance = await treasuryJetton.getGetWalletData();
    console.log('📊 New treasury TAXSTR balance:', (Number(newTreasuryBalance.balance) / 1e9).toFixed(0), 'TAXSTR');

    // Check deployer balance
    const deployerJettonWallet = await jettonMaster.getGetWalletAddress(Address.parse(CONTRACTS.DEPLOYER));
    console.log('💰 Deployer TAXSTR wallet:', deployerJettonWallet.toString());
    
    try {
        const deployerJetton = client.open(TaxJettonWallet.fromAddress(deployerJettonWallet));
        const deployerBalance = await deployerJetton.getGetWalletData();
        console.log('📊 Deployer TAXSTR balance:', (Number(deployerBalance.balance) / 1e9).toFixed(0), 'TAXSTR');
    } catch (error) {
        console.log('📊 Deployer TAXSTR balance: 0 TAXSTR (wallet not yet deployed)');
    }
}

transferTaxstr().catch(console.error);
