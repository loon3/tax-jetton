import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { beginCell, toNano } from '@ton/core';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import * as dotenv from 'dotenv';

dotenv.config();

async function deployTaxstrTestnet() {
    console.log('🚀 Deploying TAXSTR Token Contract to Testnet...\n');
    
    // Validate environment variables
    const deployerMnemonic = process.env.PRIVATE_KEY;
    const treasuryMnemonic = process.env.PRIVATE_KEY_2;
    const apiKey = process.env.TONCENTER_API_KEY;
    
    if (!deployerMnemonic || !treasuryMnemonic) {
        throw new Error('❌ Missing PRIVATE_KEY or PRIVATE_KEY_2 in .env file');
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
    
    // Check deployer balance
    const deployerBalance = await deployerContract.getBalance();
    console.log(`💰 Deployer Balance: ${Number(deployerBalance) / 1e9} TON`);
    
    if (Number(deployerBalance) < 1e9) { // Less than 1 TON
        throw new Error('❌ Insufficient balance! Need at least 1 TON for deployment.');
    }
    
    // Create metadata content (same as sandbox tests)
    const content = beginCell()
        .storeStringRefTail("https://arweave.net/ciOCW5krvm-LEr86RNjdYzRwhqmc53PViHTWOhu_0DI")
        .endCell();
    
    console.log('📄 Using metadata URL: https://arweave.net/ciOCW5krvm-LEr86RNjdYzRwhqmc53PViHTWOhu_0DI');
    
    // Deploy TAXSTR contract
    const taxJettonMaster = client.open(
        await TaxJettonMaster.fromInit(content, treasuryWallet.address)
    );
    
    console.log(`🎯 Contract Address: ${taxJettonMaster.address.toString()}`);
    console.log('⏳ Deploying contract...');
    
    // Send deployment transaction
    const deployResult = await taxJettonMaster.send(
        deployerSender,
        { value: toNano('0.8') }, // Increased for safety
        { $$type: 'Deploy', queryId: 0n }
    );
    
    console.log(`📤 Deploy Transaction: ${deployResult}`);
    
    // Wait for deployment to complete
    console.log('⏳ Waiting for deployment confirmation...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    // Verify deployment
    try {
        const jettonData = await taxJettonMaster.getGetJettonData();
        
        console.log('\n✅ TAXSTR Contract Deployed Successfully!');
        console.log('═══════════════════════════════════════');
        console.log(`📍 Contract Address: ${taxJettonMaster.address.toString()}`);
        console.log(`📊 Total Supply: ${Number(jettonData.total_supply) / 1e9} TAXSTR`);
        console.log(`👑 Admin Address: ${jettonData.admin_address?.toString() || 'None'}`);
        console.log(`🏛️ Treasury Address: ${treasuryWallet.address.toString()}`);
        console.log(`📄 Metadata: ${jettonData.jetton_content}`);
        
        // Get dev address from contract
        const devAddress = await taxJettonMaster.getGetDevAddress();
        console.log(`🔧 Dev Address: ${devAddress.toString()}`);
        
        console.log('\n🔗 View on Explorer:');
        console.log(`   TONScan: https://testnet.tonscan.org/address/${taxJettonMaster.address.toString()}`);
        console.log(`   TONViewer: https://testnet.tonviewer.com/${taxJettonMaster.address.toString()}`);
        
        console.log('\n📋 Contract Info:');
        console.log(`   Name: Tax Strategy Token`);
        console.log(`   Symbol: TAXSTR`);
        console.log(`   Decimals: 9`);
        console.log(`   Transfer Tax: 10% (exempt for treasury)`);
        console.log(`   Current Supply: 0 TAXSTR (ready for minting)`);
        
        return {
            contractAddress: taxJettonMaster.address.toString(),
            treasuryAddress: treasuryWallet.address.toString(),
            deployerAddress: deployerWallet.address.toString(),
            adminAddress: jettonData.admin_address?.toString(),
            devAddress: devAddress.toString()
        };
        
    } catch (error) {
        console.error('❌ Failed to verify deployment:', error);
        throw error;
    }
}

// Run deployment
deployTaxstrTestnet()
    .then((result) => {
        console.log('\n🎉 Deployment completed successfully!');
        console.log('📁 Contract addresses saved for DEX deployment.');
    })
    .catch((error) => {
        console.error('💥 Deployment failed:', error);
        process.exit(1);
    });
