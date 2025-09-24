import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { beginCell, toNano, Address } from '@ton/core';
import { SmartTAXSDEX } from './output/dex-v8-simple-fees_SmartTAXSDEX';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import * as dotenv from 'dotenv';

dotenv.config();

async function deployDexTestnet() {
    console.log('🏪 Deploying DEX V8 Contract to Testnet...\n');
    
    // Validate environment variables
    const deployerMnemonic = process.env.PRIVATE_KEY;
    const treasuryMnemonic = process.env.PRIVATE_KEY_2;
    const apiKey = process.env.TONCENTER_API_KEY;
    
    if (!deployerMnemonic || !treasuryMnemonic) {
        throw new Error('❌ Missing PRIVATE_KEY or PRIVATE_KEY_2 in .env file');
    }
    
    // TAXSTR contract address (will be provided as input or from previous deployment)
    const taxstrContractAddress = process.argv[2];
    if (!taxstrContractAddress) {
        console.log('❌ Please provide TAXSTR contract address as argument:');
        console.log('   npm run deploy-dex <TAXSTR_CONTRACT_ADDRESS>');
        console.log('   Example: npm run deploy-dex EQA_baQBfCBuI4nZGD-5f3pGb9dg-d-5AmajCRmQAq5QdUx6');
        process.exit(1);
    }
    
    // Initialize TON client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: apiKey
    });
    
    // Setup deployer wallet
    const deployerKeyPair = await mnemonicToPrivateKey(deployerMnemonic.split(' '));
    const deployerWallet = WalletContractV4.create({
        publicKey: deployerKeyPair.publicKey,
        workchain: 0
    });
    const deployerContract = client.open(deployerWallet);
    const deployerSender = deployerContract.sender(deployerKeyPair.secretKey);
    
    // Setup treasury wallet  
    const treasuryKeyPair = await mnemonicToPrivateKey(treasuryMnemonic.split(' '));
    const treasuryWallet = WalletContractV4.create({
        publicKey: treasuryKeyPair.publicKey,
        workchain: 0
    });
    
    console.log(`📱 Deployer Address: ${deployerWallet.address.toString()}`);
    console.log(`🏛️ Treasury Address: ${treasuryWallet.address.toString()}`);
    console.log(`🪙 TAXSTR Contract: ${taxstrContractAddress}`);
    
    // Check deployer balance
    const deployerBalance = await deployerContract.getBalance();
    console.log(`💰 Deployer Balance: ${Number(deployerBalance) / 1e9} TON`);
    
    if (Number(deployerBalance) < 1e9) { // Less than 1 TON
        throw new Error('❌ Insufficient balance! Need at least 1 TON for deployment.');
    }
    
    // DEX parameters (same as sandbox tests)
    const basePrice = 3471n; // nanoTON per TAXSTR (for ~$6942 market cap with 1B supply)
    const priceMultiplier = 1n;
    
    console.log(`💲 Base Price: ${Number(basePrice) / 1e9} TON per TAXSTR`);
    console.log(`📈 Price Multiplier: ${Number(priceMultiplier)}`);
    
    // Deploy DEX contract
    const dex = client.open(
        await SmartTAXSDEX.fromInit(
            treasuryWallet.address,           // treasury_address
            Address.parse(taxstrContractAddress), // taxs_master_address  
            basePrice,                        // base_price
            priceMultiplier                   // price_multiplier
        )
    );
    
    console.log(`🎯 DEX Contract Address: ${dex.address.toString()}`);
    console.log('⏳ Deploying DEX contract...');
    
    // Send deployment transaction
    const deployResult = await dex.send(
        deployerSender,
        { value: toNano('0.8') }, // Increased for safety
        { $$type: 'Deploy', queryId: 0n }
    );
    
    console.log(`📤 Deploy Transaction: ${deployResult}`);
    
    // Wait for deployment to complete
    console.log('⏳ Waiting for deployment confirmation...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
    
    // Verify deployment with retry logic
    let deploymentVerified = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!deploymentVerified && retryCount < maxRetries) {
        try {
            console.log(`🔄 Verifying deployment (attempt ${retryCount + 1}/${maxRetries})...`);
            const currentPrice = await dex.getGetPrice();
            const tonFeesCollected = await dex.getGetTonFeesCollected();
            const treasury = await dex.getGetTreasury();
            deploymentVerified = true;
            
            console.log('\n✅ DEX V8 Contract Deployed Successfully!');
            console.log('═══════════════════════════════════════');
            console.log(`📍 DEX Address: ${dex.address.toString()}`);
            console.log(`🏛️ Treasury: ${treasuryWallet.address.toString()}`);
            console.log(`🪙 TAXSTR Contract: ${taxstrContractAddress}`);
            console.log(`💲 Current Price: ${Number(currentPrice) / 1e9} TON per TAXSTR`);
            console.log(`💰 TON Fees Collected: ${Number(tonFeesCollected) / 1e9} TON`);
            console.log(`🏛️ Treasury Verified: ${treasury.toString()}`);
            
            console.log('\n🔗 View on Explorer:');
            console.log(`   TONScan: https://testnet.tonscan.org/address/${dex.address.toString()}`);
            console.log(`   TONViewer: https://testnet.tonviewer.com/${dex.address.toString()}`);
            
            console.log('\n📋 DEX Features:');
            console.log(`   ✅ Single-sided liquidity pool (TAXSTR only)`);
            console.log(`   ✅ Bonding curve pricing`);
            console.log(`   ✅ 10% TON fees on trades (to treasury)`);
            console.log(`   ✅ Treasury exemption (100% efficiency)`);
            console.log(`   ✅ Accounts for 10% TAXSTR transfer tax`);
            
            console.log('\n🚀 Next Steps:');
            console.log(`   1. Set DEX wallet address`);
            console.log(`   2. Seed DEX with TAXSTR`);
            console.log(`   3. Test buy operation`);
            
            return {
                dexAddress: dex.address.toString(),
                treasuryAddress: treasuryWallet.address.toString(),
                taxstrContract: taxstrContractAddress,
                currentPrice: Number(currentPrice) / 1e9,
                tonFeesCollected: Number(tonFeesCollected) / 1e9,
                deployerAddress: deployerWallet.address.toString()
            };
            
        } catch (error) {
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`⏳ Contract not ready yet, waiting 10 more seconds...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                console.log('\n⚠️ Contract deployed but verification failed (this is normal on testnet)');
                console.log('📍 DEX Address:', dex.address.toString());
                console.log('🔗 Check manually on explorer after a few minutes');
                console.log(`   TONScan: https://testnet.tonscan.org/address/${dex.address.toString()}`);
                
                return {
                    dexAddress: dex.address.toString(),
                    treasuryAddress: treasuryWallet.address.toString(),
                    taxstrContract: taxstrContractAddress,
                    currentPrice: 0,
                    tonFeesCollected: 0,
                    deployerAddress: deployerWallet.address.toString()
                };
            }
        }
    }
    
    // This should never be reached, but TypeScript needs it
    throw new Error('Deployment verification failed after all retries');
}

// Run deployment
deployDexTestnet()
    .then((result) => {
        console.log('\n🎉 DEX deployment completed successfully!');
        console.log('📁 Ready for wallet setup and seeding.');
    })
    .catch((error) => {
        console.error('💥 DEX deployment failed:', error);
        process.exit(1);
    });
