import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, beginCell } from '@ton/core';
import * as dotenv from 'dotenv';

dotenv.config();

async function sendTonToTreasury() {
    console.log('💰 Sending TON to Treasury for minting...\n');
    
    const amount = process.argv[2] || '1'; // Default 1 TON, allow override
    console.log(`💸 Transfer Amount: ${amount} TON`);
    
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
    
    // Setup deployer wallet (sender)
    const deployerKeyPair = await mnemonicToPrivateKey(deployerMnemonic.split(' '));
    const deployerWallet = WalletContractV4.create({
        publicKey: deployerKeyPair.publicKey,
        workchain: 0
    });
    const deployerContract = client.open(deployerWallet);
    const deployerSender = deployerContract.sender(deployerKeyPair.secretKey);
    
    // Setup treasury wallet (receiver)
    const treasuryKeyPair = await mnemonicToPrivateKey(treasuryMnemonic.split(' '));
    const treasuryWallet = WalletContractV4.create({
        publicKey: treasuryKeyPair.publicKey,
        workchain: 0
    });
    
    console.log(`📱 From (Deployer): ${deployerWallet.address.toString()}`);
    console.log(`🏛️ To (Treasury): ${treasuryWallet.address.toString()}`);
    
    // Check balances
    const deployerBalance = await deployerContract.getBalance();
    const treasuryContract = client.open(treasuryWallet);
    const treasuryBalance = await treasuryContract.getBalance();
    
    console.log(`\n💰 Deployer Balance: ${Number(deployerBalance) / 1e9} TON`);
    console.log(`💰 Treasury Balance: ${Number(treasuryBalance) / 1e9} TON`);
    
    const transferAmount = toNano(amount);
    const requiredBalance = transferAmount + toNano('0.01'); // Add small buffer for fees
    
    if (deployerBalance < requiredBalance) {
        throw new Error(`❌ Insufficient balance! Need at least ${Number(requiredBalance) / 1e9} TON including fees.`);
    }
    
    console.log(`\n🚀 Sending ${amount} TON to treasury...`);
    
    // Send TON transfer
    const transferResult = await deployerSender.send({
        to: treasuryWallet.address,
        value: transferAmount,
        body: beginCell().storeStringTail("TON for minting TAXSTR").endCell()
    });
    
    console.log(`📤 Transfer Transaction: ${transferResult}`);
    
    // Wait for transfer to complete
    console.log('⏳ Waiting for transfer confirmation...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    // Check new balances
    try {
        const newDeployerBalance = await deployerContract.getBalance();
        const newTreasuryBalance = await treasuryContract.getBalance();
        
        console.log('\n✅ Transfer Completed!');
        console.log('═══════════════════════');
        console.log(`📱 Deployer Balance: ${Number(newDeployerBalance) / 1e9} TON`);
        console.log(`🏛️ Treasury Balance: ${Number(newTreasuryBalance) / 1e9} TON`);
        
        const treasuryGain = Number(newTreasuryBalance - treasuryBalance) / 1e9;
        console.log(`📈 Treasury Gained: ${treasuryGain} TON`);
        
        if (Number(newTreasuryBalance) >= 5e8) { // 0.5 TON
            console.log('\n🎉 Treasury now has sufficient balance for minting!');
            console.log('🚀 Ready to run: npm run mint-taxstr');
        } else {
            console.log('\n⚠️ Treasury still needs more TON for minting (need 0.5+ TON)');
        }
        
        return {
            deployerBalance: Number(newDeployerBalance) / 1e9,
            treasuryBalance: Number(newTreasuryBalance) / 1e9,
            transferred: treasuryGain
        };
        
    } catch (error) {
        console.log('\n⚠️ Transfer sent but verification failed');
        console.log('🕐 Wait a minute and check balances manually');
        throw error;
    }
}

// Run transfer
sendTonToTreasury()
    .then((result) => {
        console.log('\n🎉 TON transfer completed successfully!');
    })
    .catch((error) => {
        console.error('💥 Transfer failed:', error);
        process.exit(1);
    });


