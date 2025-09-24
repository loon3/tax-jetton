import { TonClient, WalletContractV4, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, beginCell } from '@ton/core';
import dotenv from 'dotenv';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import { TaxJettonWallet } from './output/tax-jetton_TaxJettonWallet';
import { SmartTAXSDEX } from './output/dex-v8-simple-fees_SmartTAXSDEX';

dotenv.config();

const CONTRACTS = {
    TAXSTR_MASTER: 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf',
    DEX: 'EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS',
    TREASURY: 'EQAIXmV5HJf29JpvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW',
    DEPLOYER: 'EQCYlrz-F9Vharb6ct0Y2TuERderobVhqvnycvnQIHUHRm1c'
};

async function buyFromDex() {
    // Initialize client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TONCENTER_API_KEY,
    });

    // Initialize deployer wallet (buyer)
    if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not found in environment');
    }

    const deployerKey = await mnemonicToPrivateKey(process.env.PRIVATE_KEY.split(' '));
    const deployerWallet = WalletContractV4.create({ workchain: 0, publicKey: deployerKey.publicKey });
    const deployerContract = client.open(deployerWallet);

    console.log('👤 Deployer wallet:', deployerWallet.address.toString());
    console.log('🔄 DEX contract:', CONTRACTS.DEX);

    // Check deployer TON balance
    const deployerTonBalance = await deployerContract.getBalance();
    console.log('💰 Deployer TON balance:', Number(deployerTonBalance) / 1e9, 'TON');

    if (Number(deployerTonBalance) < 3e8) { // Less than 0.3 TON (0.2 for buy + 0.1 buffer for gas)
        throw new Error('❌ Insufficient TON balance! Need at least 0.3 TON for buying.');
    }

    // Check DEX state before buying
    const dex = client.open(SmartTAXSDEX.fromAddress(Address.parse(CONTRACTS.DEX)));
    
    console.log('\n📊 DEX State Before Buy:');
    try {
        const dexPrice = await dex.getGetPrice();
        console.log('💱 Current DEX price:', Number(dexPrice) / 1e9, 'TON per TAXSTR');
        
        const tonFeesCollected = await dex.getGetTonFeesCollected();
        console.log('💰 TON fees collected:', Number(tonFeesCollected) / 1e9, 'TON');
    } catch (error) {
        console.log('⚠️ Could not fetch DEX state:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check deployer TAXSTR balance before buy
    const jettonMaster = client.open(TaxJettonMaster.fromAddress(Address.parse(CONTRACTS.TAXSTR_MASTER)));
    let deployerTaxstrBalanceBefore = 0n;
    
    try {
        const deployerJettonWallet = await jettonMaster.getGetWalletAddress(deployerWallet.address);
        const deployerJetton = client.open(TaxJettonWallet.fromAddress(deployerJettonWallet));
        const deployerBalance = await deployerJetton.getGetWalletData();
        deployerTaxstrBalanceBefore = deployerBalance.balance;
        console.log('📊 Deployer TAXSTR balance before:', Number(deployerTaxstrBalanceBefore) / 1e9, 'TAXSTR');
    } catch (error) {
        console.log('📊 Deployer TAXSTR balance before: 0 TAXSTR (wallet not deployed)');
    }

    // Get DEX's TAXSTR wallet balance (required for BuyTokens)
    console.log('📊 Fetching DEX TAXSTR balance...');
    let dexTaxstrBalance = 0n;
    
    try {
        const dexJettonWallet = await jettonMaster.getGetWalletAddress(Address.parse(CONTRACTS.DEX));
        console.log('💰 DEX TAXSTR wallet:', dexJettonWallet.toString());
        
        const dexJetton = client.open(TaxJettonWallet.fromAddress(dexJettonWallet));
        const dexBalance = await dexJetton.getGetWalletData();
        dexTaxstrBalance = dexBalance.balance;
        console.log('📊 DEX TAXSTR balance:', Number(dexTaxstrBalance) / 1e9, 'TAXSTR');
    } catch (error) {
        throw new Error('❌ Could not fetch DEX TAXSTR balance: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    if (dexTaxstrBalance === 0n) {
        throw new Error('❌ DEX has no TAXSTR liquidity!');
    }

    // Create buy message
    const buyAmount = toNano('0.2'); // 0.2 TON
    const minTaxstrOut = 0n; // Accept any amount (for testing)
    
    console.log('💰 Buying with 0.2 TON from deployer wallet...');

    // Send buy transaction to DEX
    const seqno = await deployerContract.getSeqno();
    const deployerSender = deployerContract.sender(deployerKey.secretKey);
    
    const buyResult = await dex.send(
        deployerSender,
        { value: buyAmount }, // 0.2 TON for purchase
        {
            $$type: 'BuyTokens',
            min_taxs_out: minTaxstrOut,
            current_taxs_balance: dexTaxstrBalance
        }
    );

    console.log('✅ Buy transaction sent!');
    console.log('📍 Transaction seqno:', seqno);
    console.log('⏳ Waiting for confirmation...');

    // Wait for transaction confirmation
    let currentSeqno = seqno;
    while (currentSeqno === seqno) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        currentSeqno = await deployerContract.getSeqno();
    }

    console.log('🎉 Buy transaction confirmed!');
    
    // Wait a bit more for DEX processing
    console.log('⏳ Waiting for DEX processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check results after buy
    console.log('\n📊 Results After Buy:');
    
    // Check new TON balance
    const newDeployerTonBalance = await deployerContract.getBalance();
    console.log('💰 New deployer TON balance:', Number(newDeployerTonBalance) / 1e9, 'TON');
    console.log('📉 TON spent:', (Number(deployerTonBalance) - Number(newDeployerTonBalance)) / 1e9, 'TON');

    // Check new TAXSTR balance
    try {
        const deployerJettonWallet = await jettonMaster.getGetWalletAddress(deployerWallet.address);
        const deployerJetton = client.open(TaxJettonWallet.fromAddress(deployerJettonWallet));
        const deployerBalance = await deployerJetton.getGetWalletData();
        const taxstrGained = Number(deployerBalance.balance) - Number(deployerTaxstrBalanceBefore);
        console.log('📊 New deployer TAXSTR balance:', Number(deployerBalance.balance) / 1e9, 'TAXSTR');
        console.log('📈 TAXSTR gained:', taxstrGained / 1e9, 'TAXSTR');
        
        // Calculate efficiency (accounting for 10% tax on non-treasury wallets)
        const expectedEfficiency = 0.9; // 90% due to 10% tax
        console.log('⚡ Expected efficiency: 90% (10% tax applied)');
    } catch (error) {
        console.log('📊 New deployer TAXSTR balance: Could not check (wallet may still be deploying)');
    }

    // Check DEX state after buy
    console.log('\n📊 DEX State After Buy:');
    try {
        const newDexPrice = await dex.getGetPrice();
        console.log('💱 New DEX price:', Number(newDexPrice) / 1e9, 'TON per TAXSTR');
        
        const newTonFeesCollected = await dex.getGetTonFeesCollected();
        console.log('💰 New TON fees collected:', Number(newTonFeesCollected) / 1e9, 'TON');
    } catch (error) {
        console.log('⚠️ Could not fetch new DEX state:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n🎯 Buy operation completed!');
}

buyFromDex().catch(console.error);
