import { TonClient, WalletContractV4, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano } from '@ton/core';
import dotenv from 'dotenv';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import { SmartTAXSDEX } from './output/dex-v8-simple-fees_SmartTAXSDEX';

dotenv.config();

const CONTRACTS = {
    TAXSTR_MASTER: 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf',
    DEX: 'EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS'
};

async function setDexWallet() {
    // Initialize client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TONCENTER_API_KEY,
    });

    // Initialize deployer wallet (DEX owner)
    if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not found in environment');
    }

    const deployerKey = await mnemonicToPrivateKey(process.env.PRIVATE_KEY.split(' '));
    const deployerWallet = WalletContractV4.create({ workchain: 0, publicKey: deployerKey.publicKey });
    const deployerContract = client.open(deployerWallet);

    console.log('👤 Deployer wallet (DEX owner):', deployerWallet.address.toString());
    console.log('🔄 DEX contract:', CONTRACTS.DEX);

    // Get DEX's TAXSTR wallet address
    const jettonMaster = client.open(TaxJettonMaster.fromAddress(Address.parse(CONTRACTS.TAXSTR_MASTER)));
    const dexJettonWallet = await jettonMaster.getGetWalletAddress(Address.parse(CONTRACTS.DEX));
    
    console.log('💰 DEX TAXSTR wallet address:', dexJettonWallet.toString());

    // Check current DEX state
    const dex = client.open(SmartTAXSDEX.fromAddress(Address.parse(CONTRACTS.DEX)));
    
    console.log('\n📊 Current DEX State:');
    try {
        const currentWallet = await dex.getGetDexTaxsWallet();
        console.log('🔗 Current DEX TAXS wallet:', currentWallet?.toString() || 'Not set');
    } catch (error) {
        console.log('🔗 Current DEX TAXS wallet: Not set or error fetching');
    }

    // Send SetDEXWallet message
    console.log('\n🔧 Setting DEX TAXSTR wallet address...');

    const seqno = await deployerContract.getSeqno();
    const deployerSender = deployerContract.sender(deployerKey.secretKey);
    
    const setWalletResult = await dex.send(
        deployerSender,
        { value: toNano('0.1') }, // Gas fee
        {
            $$type: 'SetDEXWallet',
            dex_taxs_wallet: dexJettonWallet
        }
    );

    console.log('✅ SetDEXWallet transaction sent!');
    console.log('📍 Transaction seqno:', seqno);
    console.log('⏳ Waiting for confirmation...');

    // Wait for transaction confirmation
    let currentSeqno = seqno;
    while (currentSeqno === seqno) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        currentSeqno = await deployerContract.getSeqno();
    }

    console.log('🎉 SetDEXWallet transaction confirmed!');
    
    // Wait a bit more for processing
    console.log('⏳ Waiting for DEX processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check new DEX state
    console.log('\n📊 New DEX State:');
    try {
        const newWallet = await dex.getGetDexTaxsWallet();
        console.log('🔗 New DEX TAXS wallet:', newWallet?.toString() || 'Still not set');
        
        if (newWallet && newWallet.toString() === dexJettonWallet.toString()) {
            console.log('✅ DEX wallet address successfully set!');
        } else {
            console.log('❌ DEX wallet address was not set correctly');
        }
    } catch (error) {
        console.log('❌ Error checking new DEX state:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n🎯 DEX wallet setup completed!');
}

setDexWallet().catch(console.error);

