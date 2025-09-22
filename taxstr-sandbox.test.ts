import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import { TaxJettonWallet } from './output/tax-jetton_TaxJettonWallet';
import { testReporter } from './test-reporter';
import '@ton/test-utils';

describe('TAXSTR Sandbox Tests', () => {
    let blockchain: Blockchain;
    let treasury: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let taxJettonMaster: SandboxContract<TaxJettonMaster>;

    afterAll(async () => {
        // Generate and save test report
        const summary = testReporter.generateSummary();
        await testReporter.saveReport(summary);
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        // Create test accounts with plenty of TON
        treasury = await blockchain.treasury('treasury');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        
        console.log(`🏛️ Treasury: ${treasury.address.toString()}`);
        console.log(`👤 User1: ${user1.address.toString()}`);
        console.log(`👤 User2: ${user2.address.toString()}`);
        
        // Deploy TAXSTR token contract with metadata
        const content = beginCell()
            .storeStringRefTail("https://arweave.net/ciOCW5krvm-LEr86RNjdYzRwhqmc53PViHTWOhu_0DI")
            .endCell();
            
        taxJettonMaster = blockchain.openContract(
            await TaxJettonMaster.fromInit(content, treasury.address)
        );
        
        const deployResult = await taxJettonMaster.send(
            treasury.getSender(),
            { value: toNano('0.5') },
            { $$type: 'Deploy', queryId: 0n }
        );
        
        expect(deployResult.transactions).toHaveTransaction({
            from: treasury.address,
            to: taxJettonMaster.address,
            success: true,
        });
        
        console.log(`✅ TAXSTR Master deployed: ${taxJettonMaster.address.toString()}`);
    });

    it('should deploy TAXSTR contract correctly', async () => {
        const startTime = Date.now();
        
        // Check initial state
        const jettonData = await taxJettonMaster.getGetJettonData();
        const devAddress = await taxJettonMaster.getGetDevAddress();
        
        expect(jettonData.total_supply).toBe(0n);
        expect(jettonData.admin_address.toString()).toBe(treasury.address.toString());
        expect(devAddress.toString()).toBe(treasury.address.toString());
        
        console.log(`✅ Contract initialized correctly`);
        console.log(`📊 Total Supply: ${Number(jettonData.total_supply)} TAXSTR`);
        console.log(`👑 Admin: ${jettonData.admin_address.toString()}`);
        console.log(`🏛️ Dev Address: ${devAddress.toString()}`);
        
        // Report test result
        testReporter.addTest({
            testSuite: 'TAXSTR Sandbox Tests',
            testName: 'Contract Deployment & Initialization',
            status: 'PASS',
            duration: Date.now() - startTime,
            details: `Total supply: ${jettonData.total_supply}, Admin matches treasury`,
            metrics: {
                initialSupply: Number(jettonData.total_supply),
                deploymentGas: '0.5 TON'
            }
        });
        
        testReporter.addContract('TaxJettonMaster');
        testReporter.addMetric('contractsDeployed', 1);
    });

    it('should mint TAXSTR tokens to treasury', async () => {
        const startTime = Date.now();
        const mintAmount = toNano('1000000000'); // 1B tokens
        
        console.log(`🪙 Minting ${Number(mintAmount) / 1e9}M TAXSTR to treasury...`);
        
        const mintResult = await taxJettonMaster.send(
            treasury.getSender(),
            { value: toNano('0.5') },
            {
                $$type: 'Mint',
                amount: mintAmount,
                receiver: treasury.address
            }
        );
        
        expect(mintResult.transactions).toHaveTransaction({
            from: treasury.address,
            to: taxJettonMaster.address,
            success: true,
        });
        
        // Check treasury balance
        const treasuryWallet = await taxJettonMaster.getGetWalletAddress(treasury.address);
        const treasuryTaxstrContract = blockchain.openContract(
            TaxJettonWallet.fromAddress(treasuryWallet)
        );
        
        const treasuryBalance = await treasuryTaxstrContract.getGetWalletData();
        const totalSupply = await taxJettonMaster.getGetJettonData();
        
        expect(treasuryBalance.balance).toBe(mintAmount);
        expect(totalSupply.total_supply).toBe(mintAmount);
        
        console.log(`✅ Successfully minted ${Number(mintAmount) / 1e9}M TAXSTR`);
        console.log(`🏦 Treasury Balance: ${Number(treasuryBalance.balance) / 1e9}M TAXSTR`);
        console.log(`📊 Total Supply: ${Number(totalSupply.total_supply) / 1e9}M TAXSTR`);
        
        // Report test result
        testReporter.addTest({
            testSuite: 'TAXSTR Sandbox Tests',
            testName: 'Token Minting',
            status: 'PASS',
            duration: Date.now() - startTime,
            details: `Minted ${Number(mintAmount) / 1e9}M TAXSTR to treasury wallet`,
            metrics: {
                mintAmount: Number(mintAmount) / 1e9,
                finalSupply: Number(totalSupply.total_supply) / 1e9,
                mintingGas: '0.5 TON'
            }
        });
        
        testReporter.addMetric('totalTokensMinted', Number(mintAmount) / 1e9);
    });

    it('should handle treasury exemption (no tax on treasury transfers)', async () => {
        // First mint tokens
        const mintAmount = toNano('1000000000'); // 1B tokens
        await taxJettonMaster.send(
            treasury.getSender(),
            { value: toNano('0.5') },
            { $$type: 'Mint', amount: mintAmount, receiver: treasury.address }
        );
        
        // Treasury transfers to user1 (should be tax-free)
        const transferAmount = toNano('10000000'); // 10M tokens
        console.log(`🏛️ Treasury transferring ${Number(transferAmount) / 1e9}M TAXSTR to User1 (tax-exempt)...`);
        
        const treasuryWallet = await taxJettonMaster.getGetWalletAddress(treasury.address);
        const treasuryTaxstrContract = blockchain.openContract(
            TaxJettonWallet.fromAddress(treasuryWallet)
        );
        
        const initialTreasuryBalance = await treasuryTaxstrContract.getGetWalletData();
        
        const transferResult = await treasuryTaxstrContract.send(
            treasury.getSender(),
            { value: toNano('0.3') },
            {
                $$type: 'TokenTransfer',
                query_id: 0n,
                amount: transferAmount,
                destination: user1.address,
                response_destination: treasury.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.01'),
                forward_payload: beginCell().endCell().asSlice()
            }
        );
        
        expect(transferResult.transactions).toHaveTransaction({
            success: true,
        });
        
        // Check results
        const user1TaxstrWallet = await taxJettonMaster.getGetWalletAddress(user1.address);
        const user1TaxstrContract = blockchain.openContract(
            TaxJettonWallet.fromAddress(user1TaxstrWallet)
        );
        
        const user1Balance = await user1TaxstrContract.getGetWalletData();
        const finalTreasuryBalance = await treasuryTaxstrContract.getGetWalletData();
        
        const treasuryLoss = Number(initialTreasuryBalance.balance) - Number(finalTreasuryBalance.balance);
        const user1Received = Number(user1Balance.balance);
        
        console.log(`\n=== 📊 TREASURY TRANSFER RESULTS ===`);
        console.log(`🏛️ Treasury Sent: ${treasuryLoss / 1e9}M TAXSTR`);
        console.log(`👤 User1 Received: ${user1Received / 1e9}M TAXSTR`);
        console.log(`⚡ Efficiency: ${(user1Received / treasuryLoss * 100).toFixed(1)}%`);
        
        // Treasury transfers should be 100% efficient (no tax)
        expect(user1Received).toBe(treasuryLoss);
        expect(user1Balance.balance).toBe(transferAmount);
        
        console.log(`✅ Treasury exemption working perfectly - 100% efficiency!`);
        
        // Report test result
        testReporter.addTest({
            testSuite: 'TAXSTR Sandbox Tests',
            testName: 'Treasury Tax Exemption',
            status: 'PASS',
            duration: Date.now() - (Date.now() - 1000), // Approximate duration
            details: `Treasury transferred ${Number(transferAmount) / 1e9}M TAXSTR with 100% efficiency (no tax)`,
            metrics: {
                transferAmount: Number(transferAmount) / 1e9,
                efficiency: '100%',
                taxApplied: 0
            }
        });
    });

    it('should apply 10% tax on regular user transfers', async () => {
        // Setup: mint and transfer to user1
        const mintAmount = toNano('1000000000'); // 1B tokens
        await taxJettonMaster.send(treasury.getSender(), { value: toNano('0.5') }, 
            { $$type: 'Mint', amount: mintAmount, receiver: treasury.address });
        
        const treasuryWallet = await taxJettonMaster.getGetWalletAddress(treasury.address);
        const treasuryTaxstrContract = blockchain.openContract(TaxJettonWallet.fromAddress(treasuryWallet));
        
        // Give user1 some tokens (tax-free from treasury)
        const user1InitialAmount = toNano('50000000'); // 50M tokens
        await treasuryTaxstrContract.send(treasury.getSender(), { value: toNano('0.3') }, {
            $$type: 'TokenTransfer', query_id: 0n, amount: user1InitialAmount,
            destination: user1.address, response_destination: treasury.address,
            custom_payload: null, forward_ton_amount: toNano('0.01'),
            forward_payload: beginCell().endCell().asSlice()
        });
        
        // Now test user1 → user2 transfer (should have 10% tax)
        const transferAmount = toNano('1000000'); // 1M tokens
        console.log(`👤 User1 transferring ${Number(transferAmount) / 1e9}M TAXSTR to User2 (10% tax expected)...`);
        
        const user1TaxstrWallet = await taxJettonMaster.getGetWalletAddress(user1.address);
        const user1TaxstrContract = blockchain.openContract(TaxJettonWallet.fromAddress(user1TaxstrWallet));
        
        const initialTreasuryBalance = await treasuryTaxstrContract.getGetWalletData();
        const initialUser1Balance = await user1TaxstrContract.getGetWalletData();
        
        const user1TransferResult = await user1TaxstrContract.send(
            user1.getSender(),
            { value: toNano('0.3') },
            {
                $$type: 'TokenTransfer',
                query_id: 0n,
                amount: transferAmount,
                destination: user2.address,
                response_destination: user1.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.01'),
                forward_payload: beginCell().endCell().asSlice()
            }
        );
        
        expect(user1TransferResult.transactions).toHaveTransaction({
            success: true,
        });
        
        // Check results
        const user2TaxstrWallet = await taxJettonMaster.getGetWalletAddress(user2.address);
        const user2TaxstrContract = blockchain.openContract(TaxJettonWallet.fromAddress(user2TaxstrWallet));
        
        const user2Balance = await user2TaxstrContract.getGetWalletData();
        const finalTreasuryBalance = await treasuryTaxstrContract.getGetWalletData();
        const finalUser1Balance = await user1TaxstrContract.getGetWalletData();
        
        const treasuryTaxGain = Number(finalTreasuryBalance.balance) - Number(initialTreasuryBalance.balance);
        const user1Loss = Number(initialUser1Balance.balance) - Number(finalUser1Balance.balance);
        const user2Received = Number(user2Balance.balance);
        
        const expectedTax = Number(transferAmount) * 0.1;
        const expectedUser2Receive = Number(transferAmount) * 0.9;
        
        console.log(`\n=== 📊 REGULAR TRANSFER RESULTS ===`);
        console.log(`👤 User1 Sent: ${user1Loss / 1e9}M TAXSTR`);
        console.log(`👤 User2 Received: ${user2Received / 1e9}M TAXSTR`);
        console.log(`🏛️ Treasury Tax: ${treasuryTaxGain / 1e9}M TAXSTR`);
        console.log(`⚡ Efficiency: ${(user2Received / user1Loss * 100).toFixed(1)}%`);
        console.log(`📊 Expected Tax: ${expectedTax / 1e9}M TAXSTR`);
        console.log(`📊 Expected Receive: ${expectedUser2Receive / 1e9}M TAXSTR`);
        
        // Verify 10% tax mechanism
        expect(user1Loss).toBe(Number(transferAmount));
        expect(user2Received).toBeCloseTo(expectedUser2Receive, -6); // 90%
        expect(treasuryTaxGain).toBeCloseTo(expectedTax, -6); // 10%
        
        console.log(`✅ 10% transfer tax working perfectly!`);
    });

    it('should handle multiple users and complex transfer scenarios', async () => {
        // Mint initial supply
        const mintAmount = toNano('1000000000'); // 1B tokens
        await taxJettonMaster.send(treasury.getSender(), { value: toNano('0.5') }, 
            { $$type: 'Mint', amount: mintAmount, receiver: treasury.address });
        
        const treasuryWallet = await taxJettonMaster.getGetWalletAddress(treasury.address);
        const treasuryTaxstrContract = blockchain.openContract(TaxJettonWallet.fromAddress(treasuryWallet));
        
        // Distribute tokens: Treasury → User1 (100M), User2 (50M)
        console.log(`🎯 Setting up complex transfer scenario...`);
        
        // Treasury → User1 (tax-free)
        await treasuryTaxstrContract.send(treasury.getSender(), { value: toNano('0.3') }, {
            $$type: 'TokenTransfer', query_id: 0n, amount: toNano('100000000'),
            destination: user1.address, response_destination: treasury.address,
            custom_payload: null, forward_ton_amount: toNano('0.01'),
            forward_payload: beginCell().endCell().asSlice()
        });
        
        // Treasury → User2 (tax-free)
        await treasuryTaxstrContract.send(treasury.getSender(), { value: toNano('0.3') }, {
            $$type: 'TokenTransfer', query_id: 0n, amount: toNano('50000000'),
            destination: user2.address, response_destination: treasury.address,
            custom_payload: null, forward_ton_amount: toNano('0.01'),
            forward_payload: beginCell().endCell().asSlice()
        });
        
        // Get wallet contracts
        const user1TaxstrWallet = await taxJettonMaster.getGetWalletAddress(user1.address);
        const user1TaxstrContract = blockchain.openContract(TaxJettonWallet.fromAddress(user1TaxstrWallet));
        
        const user2TaxstrWallet = await taxJettonMaster.getGetWalletAddress(user2.address);
        const user2TaxstrContract = blockchain.openContract(TaxJettonWallet.fromAddress(user2TaxstrWallet));
        
        // Check initial balances
        const initialTreasuryBalance = await treasuryTaxstrContract.getGetWalletData();
        const initialUser1Balance = await user1TaxstrContract.getGetWalletData();
        const initialUser2Balance = await user2TaxstrContract.getGetWalletData();
        
        console.log(`\n=== 📊 INITIAL BALANCES ===`);
        console.log(`🏛️ Treasury: ${Number(initialTreasuryBalance.balance) / 1e9}M TAXSTR`);
        console.log(`👤 User1: ${Number(initialUser1Balance.balance) / 1e9}M TAXSTR`);
        console.log(`👤 User2: ${Number(initialUser2Balance.balance) / 1e9}M TAXSTR`);
        
        // Test scenario: User1 → User2 (5M TAXSTR, 10% tax)
        const transferAmount = toNano('5000000'); // 5M tokens
        console.log(`\n🔄 User1 → User2: ${Number(transferAmount) / 1e9}M TAXSTR (with 10% tax)`);
        
        await user1TaxstrContract.send(user1.getSender(), { value: toNano('0.3') }, {
            $$type: 'TokenTransfer', query_id: 0n, amount: transferAmount,
            destination: user2.address, response_destination: user1.address,
            custom_payload: null, forward_ton_amount: toNano('0.01'),
            forward_payload: beginCell().endCell().asSlice()
        });
        
        // Check final balances
        const finalTreasuryBalance = await treasuryTaxstrContract.getGetWalletData();
        const finalUser1Balance = await user1TaxstrContract.getGetWalletData();
        const finalUser2Balance = await user2TaxstrContract.getGetWalletData();
        
        console.log(`\n=== 📊 FINAL BALANCES ===`);
        console.log(`🏛️ Treasury: ${Number(finalTreasuryBalance.balance) / 1e9}M TAXSTR (+${(Number(finalTreasuryBalance.balance) - Number(initialTreasuryBalance.balance)) / 1e9}M tax)`);
        console.log(`👤 User1: ${Number(finalUser1Balance.balance) / 1e9}M TAXSTR (-${(Number(initialUser1Balance.balance) - Number(finalUser1Balance.balance)) / 1e9}M sent)`);
        console.log(`👤 User2: ${Number(finalUser2Balance.balance) / 1e9}M TAXSTR (+${(Number(finalUser2Balance.balance) - Number(initialUser2Balance.balance)) / 1e9}M received)`);
        
        // Verify math
        const treasuryGain = Number(finalTreasuryBalance.balance) - Number(initialTreasuryBalance.balance);
        const user1Loss = Number(initialUser1Balance.balance) - Number(finalUser1Balance.balance);
        const user2Gain = Number(finalUser2Balance.balance) - Number(initialUser2Balance.balance);
        
        expect(user1Loss).toBe(Number(transferAmount)); // User1 sent full amount
        expect(user2Gain).toBeCloseTo(Number(transferAmount) * 0.9, -6); // User2 received 90%
        expect(treasuryGain).toBeCloseTo(Number(transferAmount) * 0.1, -6); // Treasury got 10% tax
        
        // Verify total supply conservation
        const totalSupply = await taxJettonMaster.getGetJettonData();
        expect(totalSupply.total_supply).toBe(mintAmount); // No tokens created/destroyed
        
        console.log(`✅ Complex transfer scenario completed successfully!`);
        console.log(`🔒 Total supply conserved: ${Number(totalSupply.total_supply) / 1e9}M TAXSTR`);
    });
});
