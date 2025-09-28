import { TonClient, WalletContractV4, Address } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
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

async function checkDexState() {
    // Initialize client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TONCENTER_API_KEY,
    });

    console.log('🔍 Checking DEX and wallet states...\n');

    // Check DEX contract state
    const dex = client.open(SmartTAXSDEX.fromAddress(Address.parse(CONTRACTS.DEX)));
    
    console.log('📊 DEX Contract State:');
    try {
        const dexPrice = await dex.getGetPrice();
        console.log('💱 Current price:', Number(dexPrice) / 1e9, 'TON per TAXSTR');
        
        const tonFeesCollected = await dex.getGetTonFeesCollected();
        console.log('💰 TON fees collected:', Number(tonFeesCollected) / 1e9, 'TON');

        // Check if DEX wallet is set
        try {
            const dexWalletAddress = await dex.getGetDexTaxsWallet();
            console.log('🔗 DEX TAXS wallet address set:', dexWalletAddress?.toString() || 'Not set');
        } catch (error) {
            console.log('🔗 DEX TAXS wallet address: Could not fetch');
        }
    } catch (error) {
        console.log('❌ Error fetching DEX state:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check DEX TON balance
    try {
        const dexTonBalance = await client.getBalance(Address.parse(CONTRACTS.DEX));
        console.log('💰 DEX TON balance:', Number(dexTonBalance) / 1e9, 'TON');
    } catch (error) {
        console.log('❌ Error fetching DEX TON balance:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check DEX TAXSTR balance
    const jettonMaster = client.open(TaxJettonMaster.fromAddress(Address.parse(CONTRACTS.TAXSTR_MASTER)));
    
    console.log('\n📊 DEX TAXSTR Wallet State:');
    try {
        const dexJettonWallet = await jettonMaster.getGetWalletAddress(Address.parse(CONTRACTS.DEX));
        console.log('💰 DEX TAXSTR wallet address:', dexJettonWallet.toString());
        
        const dexJetton = client.open(TaxJettonWallet.fromAddress(dexJettonWallet));
        const dexBalance = await dexJetton.getGetWalletData();
        console.log('📊 DEX TAXSTR balance:', Number(dexBalance.balance) / 1e9, 'TAXSTR');
        console.log('👤 DEX TAXSTR wallet owner:', dexBalance.owner.toString());
        console.log('🔗 DEX TAXSTR wallet jetton master:', dexBalance.jetton.toString());
    } catch (error) {
        console.log('❌ Error fetching DEX TAXSTR balance:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check Treasury state
    console.log('\n📊 Treasury State:');
    try {
        const treasuryJettonWallet = await jettonMaster.getGetWalletAddress(Address.parse(CONTRACTS.TREASURY));
        console.log('💰 Treasury TAXSTR wallet:', treasuryJettonWallet.toString());
        
        const treasuryJetton = client.open(TaxJettonWallet.fromAddress(treasuryJettonWallet));
        const treasuryBalance = await treasuryJetton.getGetWalletData();
        console.log('📊 Treasury TAXSTR balance:', Number(treasuryBalance.balance) / 1e9, 'TAXSTR');
    } catch (error) {
        console.log('❌ Error fetching Treasury state:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check Deployer state
    console.log('\n📊 Deployer State:');
    try {
        // Deployer TON balance
        const deployerKey = await mnemonicToPrivateKey(process.env.PRIVATE_KEY!.split(' '));
        const deployerWallet = WalletContractV4.create({ workchain: 0, publicKey: deployerKey.publicKey });
        const deployerContract = client.open(deployerWallet);
        const deployerTonBalance = await deployerContract.getBalance();
        console.log('💰 Deployer TON balance:', Number(deployerTonBalance) / 1e9, 'TON');

        // Deployer TAXSTR balance
        const deployerJettonWallet = await jettonMaster.getGetWalletAddress(deployerWallet.address);
        console.log('💰 Deployer TAXSTR wallet:', deployerJettonWallet.toString());
        
        try {
            const deployerJetton = client.open(TaxJettonWallet.fromAddress(deployerJettonWallet));
            const deployerBalance = await deployerJetton.getGetWalletData();
            console.log('📊 Deployer TAXSTR balance:', Number(deployerBalance.balance) / 1e9, 'TAXSTR');
        } catch (error) {
            console.log('📊 Deployer TAXSTR balance: 0 (wallet not active or deployed)');
        }
    } catch (error) {
        console.log('❌ Error fetching Deployer state:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check total supply
    console.log('\n📊 Token Supply:');
    try {
        const jettonData = await jettonMaster.getGetJettonData();
        console.log('🏦 Total TAXSTR supply:', Number(jettonData.total_supply) / 1e9, 'TAXSTR');
        console.log('👑 Admin address:', jettonData.admin_address.toString());
        console.log('🔗 TAXSTR master address:', CONTRACTS.TAXSTR_MASTER);
    } catch (error) {
        console.log('❌ Error fetching token supply:', error instanceof Error ? error.message : 'Unknown error');
    }
}

checkDexState().catch(console.error);


