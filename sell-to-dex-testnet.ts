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

async function sellToDex() {
    // Initialize client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TONCENTER_API_KEY,
    });

    // Initialize deployer wallet (seller)
    if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not found in environment');
    }

    const deployerKey = await mnemonicToPrivateKey(process.env.PRIVATE_KEY.split(' '));
    const deployerWallet = WalletContractV4.create({ workchain: 0, publicKey: deployerKey.publicKey });
    const deployerContract = client.open(deployerWallet);

    console.log('👤 Deployer wallet (seller):', deployerWallet.address.toString());
    console.log('🔄 DEX contract:', CONTRACTS.DEX);

    // Check deployer TON balance
    const deployerTonBalance = await deployerContract.getBalance();
    console.log('💰 Deployer TON balance:', Number(deployerTonBalance) / 1e9, 'TON');

    if (Number(deployerTonBalance) < 2e8) { // Less than 0.2 TON for gas
        throw new Error('❌ Insufficient TON balance! Need at least 0.2 TON for selling gas fees.');
    }

    // Check DEX state before selling
    const dex = client.open(SmartTAXSDEX.fromAddress(Address.parse(CONTRACTS.DEX)));
    
    console.log('\n📊 DEX State Before Sell:');
    try {
        const dexPrice = await dex.getGetPrice();
        console.log('💱 Current DEX price:', Number(dexPrice) / 1e9, 'TON per TAXSTR');
        
        const tonFeesCollected = await dex.getGetTonFeesCollected();
        console.log('💰 TON fees collected:', Number(tonFeesCollected) / 1e9, 'TON');

        // Check DEX TON balance (available for payouts)
        const dexTonBalance = await client.getBalance(Address.parse(CONTRACTS.DEX));
        console.log('💰 DEX TON balance (available for payouts):', Number(dexTonBalance) / 1e9, 'TON');
    } catch (error) {
        console.log('⚠️ Could not fetch DEX state:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check deployer TAXSTR balance before sell
    const jettonMaster = client.open(TaxJettonMaster.fromAddress(Address.parse(CONTRACTS.TAXSTR_MASTER)));
    let deployerTaxstrBalanceBefore = 0n;
    
    try {
        const deployerJettonWallet = await jettonMaster.getGetWalletAddress(deployerWallet.address);
        const deployerJetton = client.open(TaxJettonWallet.fromAddress(deployerJettonWallet));
        const deployerBalance = await deployerJetton.getGetWalletData();
        deployerTaxstrBalanceBefore = deployerBalance.balance;
        console.log('📊 Deployer TAXSTR balance before:', Number(deployerTaxstrBalanceBefore) / 1e9, 'TAXSTR');
    } catch (error) {
        throw new Error('❌ Could not fetch deployer TAXSTR balance');
    }

    // Get DEX's TAXSTR wallet balance (required for RequestSell)
    console.log('\n📊 Fetching DEX TAXSTR balance...');
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

    // Sell parameters
    const sellAmount = toNano(10_000); // 10,000 TAXSTR
    
    console.log('\n💰 Selling 10,000 TAXSTR to DEX...');

    // Step 1: Send RequestSell message for validation
    console.log('📤 Step 1: Sending RequestSell for validation...');
    
    const seqno1 = await deployerContract.getSeqno();
    const deployerSender = deployerContract.sender(deployerKey.secretKey);
    
    const requestSellResult = await dex.send(
        deployerSender,
        { value: toNano('0.1') }, // Gas fee for RequestSell
        {
            $$type: 'RequestSell',
            amount: sellAmount,
            current_taxs_balance: dexTaxstrBalance
        }
    );

    console.log('✅ RequestSell transaction sent!');
    console.log('📍 Transaction seqno:', seqno1);
    console.log('⏳ Waiting for RequestSell confirmation...');

    // Wait for RequestSell confirmation
    let currentSeqno = seqno1;
    while (currentSeqno === seqno1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        currentSeqno = await deployerContract.getSeqno();
    }

    console.log('✅ RequestSell confirmed!');
    
    // Wait a bit for DEX processing
    console.log('⏳ Waiting for DEX validation...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Step 2: Send TAXSTR tokens to DEX (this will trigger the actual sell)
    console.log('\n📤 Step 2: Sending TAXSTR tokens to DEX...');
    
    const deployerJettonWallet = await jettonMaster.getGetWalletAddress(deployerWallet.address);
    const deployerJetton = client.open(TaxJettonWallet.fromAddress(deployerJettonWallet));
    
    // Create forward payload for sell
    const forwardPayload = beginCell()
        .storeStringRefTail('Sell TAXSTR to DEX')
        .endCell();
    
    const seqno2 = await deployerContract.getSeqno();
    
    const sellResult = await deployerJetton.send(
        deployerSender,
        { value: toNano('0.3') }, // Gas fee for token transfer
        {
            $$type: 'TokenTransfer',
            query_id: 0n,
            amount: sellAmount,
            destination: Address.parse(CONTRACTS.DEX),
            response_destination: deployerWallet.address,
            custom_payload: null,
            forward_ton_amount: toNano('0.05'), // Forward gas for DEX processing
            forward_payload: forwardPayload.asSlice()
        }
    );

    console.log('✅ Sell transaction sent!');
    console.log('📍 Transaction seqno:', seqno2);
    console.log('⏳ Waiting for sell confirmation...');

    // Wait for transaction confirmation
    let currentSeqno2 = seqno2;
    while (currentSeqno2 === seqno2) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        currentSeqno2 = await deployerContract.getSeqno();
    }

    console.log('🎉 Sell transaction confirmed!');
    
    // Wait for DEX processing
    console.log('⏳ Waiting for DEX processing...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Check results after sell
    console.log('\n📊 Results After Sell:');
    
    // Check new TON balance
    const newDeployerTonBalance = await deployerContract.getBalance();
    console.log('💰 New deployer TON balance:', Number(newDeployerTonBalance) / 1e9, 'TON');
    console.log('📈 TON gained:', (Number(newDeployerTonBalance) - Number(deployerTonBalance)) / 1e9, 'TON');

    // Check new TAXSTR balance
    try {
        const deployerBalance = await deployerJetton.getGetWalletData();
        const taxstrChange = Number(deployerBalance.balance) - Number(deployerTaxstrBalanceBefore);
        console.log('📊 New deployer TAXSTR balance:', Number(deployerBalance.balance) / 1e9, 'TAXSTR');
        console.log('📉 TAXSTR sold:', Math.abs(taxstrChange) / 1e9, 'TAXSTR');
        
        // Calculate efficiency (accounting for 10% tax on non-treasury wallets)
        const expectedEfficiency = 0.9; // 90% due to 10% tax
        console.log('⚡ Expected efficiency: 90% (10% tax applied)');
    } catch (error) {
        console.log('📊 New deployer TAXSTR balance: Could not check');
    }

    // Check DEX state after sell
    console.log('\n📊 DEX State After Sell:');
    try {
        const newDexPrice = await dex.getGetPrice();
        console.log('💱 New DEX price:', Number(newDexPrice) / 1e9, 'TON per TAXSTR');
        
        const newTonFeesCollected = await dex.getGetTonFeesCollected();
        console.log('💰 New TON fees collected:', Number(newTonFeesCollected) / 1e9, 'TON');

        const newDexTonBalance = await client.getBalance(Address.parse(CONTRACTS.DEX));
        console.log('💰 New DEX TON balance:', Number(newDexTonBalance) / 1e9, 'TON');
    } catch (error) {
        console.log('⚠️ Could not fetch new DEX state:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n🎯 Sell operation completed!');
}

sellToDex().catch(console.error);


