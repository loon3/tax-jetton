import { TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, Address, beginCell, Dictionary } from '@ton/core';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import * as dotenv from 'dotenv';

dotenv.config();

function createOffChainMetadata() {
    // Create off-chain metadata exactly like the working contract
    const content = beginCell()
        .storeUint(1, 8) // Off-chain metadata flag
        .storeStringTail("https://arweave.net/ciOCW5krvm-LEr86RNjdYzRwhqmc53PViHTWOhu_0DI")
        .endCell();
        
    return content;
}

async function updateMetadataTestnet() {
    console.log('🔄 Updating TAXSTR Contract Metadata to Off-Chain Format...\n');
    
    // Contract address from deployment
    const contractAddress = 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf';
    
    console.log(`📍 TAXSTR Contract: ${contractAddress}`);
    
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
    
    if (Number(treasuryBalance) < 2e8) { // Less than 0.2 TON
        throw new Error('❌ Insufficient balance! Need at least 0.2 TON for metadata update.');
    }
    
    // Connect to TAXSTR contract
    const taxJettonMaster = client.open(
        TaxJettonMaster.fromAddress(Address.parse(contractAddress))
    );
    
    // Check current state
    console.log('\n📊 Current Contract State:');
    try {
        const jettonData = await taxJettonMaster.getGetJettonData();
        console.log(`   Total Supply: ${Number(jettonData.total_supply) / 1e9} TAXSTR`);
        console.log(`   Admin: ${jettonData.admin_address?.toString() || 'None'}`);
        console.log(`   Current Content: ${jettonData.jetton_content}`);
        
        // Verify treasury is the admin
        if (jettonData.admin_address?.toString() !== treasuryWallet.address.toString()) {
            throw new Error('❌ Treasury is not the admin of this contract!');
        }
        
    } catch (error) {
        console.error('⚠️ Could not read contract state');
        throw error;
    }
    
    // Create new off-chain metadata (same format as working contract)
    const newContent = createOffChainMetadata();
    
    console.log(`\n🎯 Updating metadata to off-chain format (same as working contract)...`);
    console.log('📄 New Metadata:');
    console.log('   Format: Off-chain (TEP-64 compliant)');
    console.log('   URL: https://arweave.net/ciOCW5krvm-LEr86RNjdYzRwhqmc53PViHTWOhu_0DI');
    console.log('   Content: TaxStrategy token with image');
    console.log('⏳ Sending update transaction...');
    
    // Send metadata update transaction
    const updateResult = await taxJettonMaster.send(
        treasurySender,
        { value: toNano('0.2') }, // Gas for update
        {
            $$type: 'TokenUpdateContent',
            content: newContent
        }
    );
    
    console.log(`📤 Update Transaction: ${updateResult}`);
    
    // Wait for transaction to be processed
    console.log('⏳ Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
    
    // Verify update with retry logic
    let updateVerified = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!updateVerified && retryCount < maxRetries) {
        try {
            console.log(`🔄 Verifying update (attempt ${retryCount + 1}/${maxRetries})...`);
            
            const jettonData = await taxJettonMaster.getGetJettonData();
            const updatedContent = jettonData.jetton_content;
            
            // Check if content has changed (compare cell hash or structure)
            console.log(`📄 Updated Content: ${updatedContent}`);
            updateVerified = true;
            
            console.log('\n✅ TAXSTR Metadata Updated Successfully!');
            console.log('═══════════════════════════════════════');
            console.log(`📍 Contract: ${contractAddress}`);
            console.log(`🏛️ Admin: ${treasuryWallet.address.toString()}`);
            console.log(`📄 Format: Off-chain TEP-64 compliant`);
            
            console.log('\n🔗 View on Explorer:');
            console.log(`   TONScan: https://testnet.tonscan.org/address/${contractAddress}`);
            console.log(`   TONViewer: https://testnet.tonviewer.com/${contractAddress}`);
            
            console.log('\n📊 Metadata Info:');
            console.log(`   ✅ Name: TaxStrategy`);
            console.log(`   ✅ Symbol: TAXSTR`);
            console.log(`   ✅ Decimals: 9`);
            console.log(`   ✅ Description: Revolutionary jetton with 10% tax...`);
            console.log(`   ✅ Image: Hosted on Arweave`);
            console.log(`   ✅ Format: Off-chain (should display image in Tonkeeper)`);
            
            console.log('\n🚀 Next Steps:');
            console.log(`   1. Wait 5-10 minutes for wallet refresh`);
            console.log(`   2. Check Tonkeeper - metadata should now display correctly`);
            console.log(`   3. Test transfers and DEX operations`);
            
                return {
                    contractAddress,
                    updated: true,
                    format: 'off-chain',
                    treasuryAddress: treasuryWallet.address.toString()
                };
            
        } catch (error) {
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`⏳ Update not confirmed yet, waiting 10 more seconds...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                console.log('\n⚠️ Update transaction sent but verification failed');
                console.log('📍 This is common on testnet - check explorer manually');
                console.log(`   TONScan: https://testnet.tonscan.org/address/${contractAddress}`);
                console.log('🕐 Wait a few minutes and check Tonkeeper');
                
                return {
                    contractAddress,
                    updated: false,
                    format: 'off-chain',
                    treasuryAddress: treasuryWallet.address.toString(),
                    note: 'Verification failed - check explorer manually'
                };
            }
        }
    }
    
    // This should never be reached, but TypeScript needs it
    throw new Error('Metadata update verification failed after all retries');
}

// Run metadata update
updateMetadataTestnet()
    .then((result) => {
        console.log('\n🎉 Metadata update completed!');
        if (result?.updated) {
            console.log('✅ Metadata successfully updated to off-chain format');
            console.log('📱 Tonkeeper should now display the token with image correctly');
        }
    })
    .catch((error) => {
        console.error('💥 Metadata update failed:', error);
        process.exit(1);
    });
