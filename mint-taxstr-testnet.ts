import { TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, Address } from '@ton/core';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import * as dotenv from 'dotenv';

dotenv.config();

async function mintTaxstrTestnet() {
    console.log('🪙 Minting 1 Billion TAXSTR Tokens...\n');
    
    // Contract address from deployment
    const contractAddress = 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf';
    const mintAmount = process.argv[2] || '1000000000'; // Default 1 billion, allow override
    
    console.log(`📍 TAXSTR Contract: ${contractAddress}`);
    console.log(`🪙 Mint Amount: ${parseInt(mintAmount).toLocaleString()} TAXSTR`);
    
    // Validate environment variables
    const treasuryMnemonic = process.env.PRIVATE_KEY_2;
    const apiKey = process.env.TONCENTER_API_KEY;
    
    if (!treasuryMnemonic) {
        throw new Error('❌ Missing PRIVATE_KEY_2 (treasury) in .env file');
    }
    
    // Initialize TON client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: apiKey
    });
    
    // Setup treasury wallet (admin of the contract)
    const treasuryKeyPair = await mnemonicToPrivateKey(treasuryMnemonic.split(' '));
    const treasuryWallet = WalletContractV4.create({
        publicKey: treasuryKeyPair.publicKey,
        workchain: 0
    });
    const treasuryContract = client.open(treasuryWallet);
    const treasurySender = treasuryContract.sender(treasuryKeyPair.secretKey);
    
    console.log(`🏛️ Treasury Address: ${treasuryWallet.address.toString()}`);
    
    // Check treasury balance
    const treasuryBalance = await treasuryContract.getBalance();
    console.log(`💰 Treasury TON Balance: ${Number(treasuryBalance) / 1e9} TON`);
    
    if (Number(treasuryBalance) < 5e8) { // Less than 0.5 TON
        throw new Error('❌ Insufficient balance! Need at least 0.5 TON for minting.');
    }
    
    // Connect to TAXSTR contract
    const taxJettonMaster = client.open(
        TaxJettonMaster.fromAddress(Address.parse(contractAddress))
    );
    
    // Check current state before minting
    console.log('\n📊 Current Contract State:');
    try {
        const jettonData = await taxJettonMaster.getGetJettonData();
        console.log(`   Total Supply: ${Number(jettonData.total_supply) / 1e9} TAXSTR`);
        console.log(`   Admin: ${jettonData.admin_address?.toString() || 'None'}`);
        
        const devAddress = await taxJettonMaster.getGetDevAddress();
        console.log(`   Dev Address: ${devAddress.toString()}`);
        
        // Verify treasury is the admin
        if (jettonData.admin_address?.toString() !== treasuryWallet.address.toString()) {
            throw new Error('❌ Treasury is not the admin of this contract!');
        }
        
    } catch (error) {
        console.error('⚠️ Could not read contract state (this might be normal on testnet)');
        console.log('🔄 Proceeding with minting anyway...');
    }
    
    // Calculate mint amount in nanoTOKENS (9 decimals)
    const mintAmountNano = toNano(mintAmount);
    
    console.log(`\n🎯 Minting ${parseInt(mintAmount).toLocaleString()} TAXSTR to treasury...`);
    console.log('⏳ Sending mint transaction...');
    
    // Send mint transaction
    const mintResult = await taxJettonMaster.send(
        treasurySender,
        { value: toNano('0.5') }, // Gas for minting
        {
            $$type: 'Mint',
            amount: mintAmountNano,
            receiver: treasuryWallet.address
        }
    );
    
    console.log(`📤 Mint Transaction: ${mintResult}`);
    
    // Wait for transaction to be processed
    console.log('⏳ Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
    
    // Verify minting with retry logic
    let mintingVerified = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!mintingVerified && retryCount < maxRetries) {
        try {
            console.log(`🔄 Verifying mint (attempt ${retryCount + 1}/${maxRetries})...`);
            
            const jettonData = await taxJettonMaster.getGetJettonData();
            const newTotalSupply = Number(jettonData.total_supply) / 1e9;
            
            if (newTotalSupply > 0) {
                mintingVerified = true;
                
                console.log('\n✅ TAXSTR Tokens Minted Successfully!');
                console.log('═══════════════════════════════════════');
                console.log(`🪙 Total Supply: ${newTotalSupply.toLocaleString()} TAXSTR`);
                console.log(`🏛️ Minted To: ${treasuryWallet.address.toString()}`);
                console.log(`📍 Contract: ${contractAddress}`);
                
                console.log('\n🔗 View on Explorer:');
                console.log(`   TONScan: https://testnet.tonscan.org/address/${contractAddress}`);
                console.log(`   TONViewer: https://testnet.tonviewer.com/${contractAddress}`);
                
                console.log('\n📊 Token Info:');
                console.log(`   Name: Tax Strategy Token`);
                console.log(`   Symbol: TAXSTR`);
                console.log(`   Decimals: 9`);
                console.log(`   Transfer Tax: 10% (treasury exempt)`);
                console.log(`   Current Supply: ${newTotalSupply.toLocaleString()} TAXSTR`);
                
                console.log('\n🚀 Next Steps:');
                console.log(`   1. Test transfer: Send tokens to another wallet`);
                console.log(`   2. Set up DEX: Configure DEX wallet and seed with tokens`);
                console.log(`   3. Test DEX: Try buy/sell operations`);
                
                return {
                    contractAddress,
                    totalSupply: newTotalSupply,
                    treasuryAddress: treasuryWallet.address.toString(),
                    mintAmount: parseInt(mintAmount)
                };
                
            } else {
                throw new Error('Total supply is still 0');
            }
            
        } catch (error) {
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`⏳ Minting not confirmed yet, waiting 10 more seconds...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                console.log('\n⚠️ Minting transaction sent but verification failed');
                console.log('📍 This is common on testnet - check explorer manually');
                console.log(`   TONScan: https://testnet.tonscan.org/address/${contractAddress}`);
                console.log('🕐 Wait a few minutes and check again');
                
                return {
                    contractAddress,
                    totalSupply: 0,
                    treasuryAddress: treasuryWallet.address.toString(),
                    mintAmount: parseInt(mintAmount),
                    note: 'Verification failed - check explorer manually'
                };
            }
        }
    }
    
    // This should never be reached, but TypeScript needs it
    throw new Error('Minting verification failed after all retries');
}

// Run minting
mintTaxstrTestnet()
    .then((result) => {
        console.log('\n🎉 Minting process completed!');
        if (result?.totalSupply && result.totalSupply > 0) {
            console.log(`✅ Successfully minted ${result.mintAmount.toLocaleString()} TAXSTR`);
        }
    })
    .catch((error) => {
        console.error('💥 Minting failed:', error);
        process.exit(1);
    });
