import { TonClient } from '@ton/ton';
import { Address } from '@ton/core';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkWorkingMetadata() {
    console.log('🔍 Analyzing Working Contract Metadata...\n');
    
    // Working contract from TONViewer
    const workingContractAddress = 'kQBmao2MIgdMldVpuLy-b3d70N3MKe5OAzCWl6s98-qKxFLy';
    // Our current contract
    const ourContractAddress = 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf';
    
    console.log(`🎯 Working Contract: ${workingContractAddress}`);
    console.log(`📍 Our Contract: ${ourContractAddress}`);
    
    const apiKey = process.env.TONCENTER_API_KEY;
    
    // Initialize TON client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: apiKey
    });
    
    console.log('\n═══════════════════════════════════════');
    console.log('📊 WORKING CONTRACT ANALYSIS');
    console.log('═══════════════════════════════════════');
    
    try {
        // Analyze the working contract
        const workingContract = client.open(
            TaxJettonMaster.fromAddress(Address.parse(workingContractAddress))
        );
        
        const workingData = await workingContract.getGetJettonData();
        
        console.log(`✅ Working Contract Data:`);
        console.log(`   Total Supply: ${Number(workingData.total_supply) / 1e9} TAXSTR`);
        console.log(`   Admin: ${workingData.admin_address?.toString() || 'None'}`);
        console.log(`   Content Type: ${typeof workingData.jetton_content}`);
        console.log(`   Content: ${workingData.jetton_content}`);
        
        // Try to parse the content structure
        if (workingData.jetton_content) {
            try {
                const contentSlice = workingData.jetton_content.asSlice();
                const firstByte = contentSlice.loadUint(8);
                console.log(`   Metadata Format: ${firstByte === 0 ? 'On-chain' : firstByte === 1 ? 'Off-chain' : 'Unknown'} (${firstByte})`);
                
                if (firstByte === 1) {
                    // Off-chain format - should have URL
                    try {
                        const url = contentSlice.loadStringTail();
                        console.log(`   Metadata URL: ${url}`);
                    } catch (e) {
                        console.log(`   Could not parse URL from content`);
                    }
                } else if (firstByte === 0) {
                    // On-chain format - should have dictionary
                    console.log(`   On-chain metadata detected`);
                }
            } catch (e) {
                console.log(`   Could not parse content structure: ${e}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Failed to analyze working contract: ${error}`);
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('📊 OUR CONTRACT ANALYSIS');
    console.log('═══════════════════════════════════════');
    
    try {
        // Analyze our contract
        const ourContract = client.open(
            TaxJettonMaster.fromAddress(Address.parse(ourContractAddress))
        );
        
        const ourData = await ourContract.getGetJettonData();
        
        console.log(`📍 Our Contract Data:`);
        console.log(`   Total Supply: ${Number(ourData.total_supply) / 1e9} TAXSTR`);
        console.log(`   Admin: ${ourData.admin_address?.toString() || 'None'}`);
        console.log(`   Content Type: ${typeof ourData.jetton_content}`);
        console.log(`   Content: ${ourData.jetton_content}`);
        
        // Try to parse our content structure
        if (ourData.jetton_content) {
            try {
                const contentSlice = ourData.jetton_content.asSlice();
                const firstByte = contentSlice.loadUint(8);
                console.log(`   Metadata Format: ${firstByte === 0 ? 'On-chain' : firstByte === 1 ? 'Off-chain' : 'Unknown'} (${firstByte})`);
                
                if (firstByte === 1) {
                    // Off-chain format - should have URL
                    try {
                        const url = contentSlice.loadStringTail();
                        console.log(`   Metadata URL: ${url}`);
                    } catch (e) {
                        console.log(`   Could not parse URL from content`);
                    }
                } else if (firstByte === 0) {
                    // On-chain format - should have dictionary
                    console.log(`   On-chain metadata detected`);
                }
            } catch (e) {
                console.log(`   Could not parse content structure: ${e}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Failed to analyze our contract: ${error}`);
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('🔧 RECOMMENDATIONS');
    console.log('═══════════════════════════════════════');
    
    console.log(`\n📋 Based on the working contract analysis:`);
    console.log(`   1. Check the metadata format used (on-chain vs off-chain)`);
    console.log(`   2. If off-chain, verify the URL structure and hosting`);
    console.log(`   3. If on-chain, check the dictionary structure`);
    console.log(`   4. Update our contract to match the working format`);
    
    console.log(`\n🔗 Working Contract Explorer:`);
    console.log(`   TONViewer: https://testnet.tonviewer.com/${workingContractAddress}`);
    console.log(`   TONScan: https://testnet.tonscan.org/address/${workingContractAddress}`);
    
    console.log(`\n🔗 Our Contract Explorer:`);
    console.log(`   TONViewer: https://testnet.tonviewer.com/${ourContractAddress}`);
    console.log(`   TONScan: https://testnet.tonscan.org/address/${ourContractAddress}`);
}

// Run analysis
checkWorkingMetadata()
    .then(() => {
        console.log('\n🎉 Metadata analysis completed!');
    })
    .catch((error) => {
        console.error('💥 Analysis failed:', error);
        process.exit(1);
    });


