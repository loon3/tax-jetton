import "@ton/test-utils";
import { toNano, beginCell, Address } from "@ton/core";
import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { TaxJettonMaster } from "../output/tax-jetton_TaxJettonMaster";
import { TaxJettonWallet } from "../output/tax-jetton_TaxJettonWallet";

describe("TaxJetton", () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let dev: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let jettonMaster: SandboxContract<TaxJettonMaster>;
    let user1Wallet: SandboxContract<TaxJettonWallet>;
    let user2Wallet: SandboxContract<TaxJettonWallet>;
    let devWallet: SandboxContract<TaxJettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");
        dev = await blockchain.treasury("dev");
        user1 = await blockchain.treasury("user1");
        user2 = await blockchain.treasury("user2");

        // Create jetton content
        const content = beginCell()
            .storeUint(0, 8)
            .storeStringTail("Tax Jetton")
            .endCell();

        jettonMaster = blockchain.openContract(
            await TaxJettonMaster.fromInit(content, dev.address)
        );

        // Deploy jetton master
        const deployResult = await jettonMaster.send(
            deployer.getSender(),
            { value: toNano("0.2") },
            { $$type: "Deploy", queryId: 0n }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMaster.address,
            deploy: true,
            success: true,
        });

        // Get wallet addresses
        const user1WalletAddress = await jettonMaster.getGetWalletAddress(user1.address);
        const user2WalletAddress = await jettonMaster.getGetWalletAddress(user2.address);
        const devWalletAddress = await jettonMaster.getGetWalletAddress(dev.address);

        user1Wallet = blockchain.openContract(TaxJettonWallet.fromAddress(user1WalletAddress));
        user2Wallet = blockchain.openContract(TaxJettonWallet.fromAddress(user2WalletAddress));
        devWallet = blockchain.openContract(TaxJettonWallet.fromAddress(devWalletAddress));
    });

    it("should deploy jetton master correctly", async () => {
        const jettonData = await jettonMaster.getGetJettonData();
        expect(jettonData.total_supply).toBe(0n);
        expect(jettonData.mintable).toBe(true);
        expect(jettonData.admin_address.toString()).toBe(dev.address.toString());
    });

    it("should mint tokens to user", async () => {
        const mintAmount = toNano("1000");
        
        const mintResult = await jettonMaster.send(
            dev.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Mint" as const,
                amount: mintAmount,
                receiver: user1.address
            }
        );

        expect(mintResult.transactions).toHaveTransaction({
            from: dev.address,
            to: jettonMaster.address,
            success: true,
        });

        // Check user1 wallet balance
        const user1WalletData = await user1Wallet.getGetWalletData();
        expect(user1WalletData.balance).toBe(mintAmount);

        // Check total supply
        const jettonData = await jettonMaster.getGetJettonData();
        expect(jettonData.total_supply).toBe(mintAmount);
    });

    it("should apply 10% tax on transfers", async () => {
        // First mint tokens to user1
        const mintAmount = toNano("1000");
        await jettonMaster.send(
            dev.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Mint" as const,
                amount: mintAmount,
                receiver: user1.address
            }
        );

        // Transfer 100 tokens from user1 to user2
        const transferAmount = toNano("100");
        const transferResult = await user1Wallet.send(
            user1.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "TokenTransfer" as const,
                query_id: 0n,
                amount: transferAmount,
                destination: user2.address,
                response_destination: user1.address,
                custom_payload: null,
                forward_ton_amount: 0n,
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        expect(transferResult.transactions).toHaveTransaction({
            from: user1.address,
            to: user1Wallet.address,
            success: true,
        });

        // Check balances after transfer
        const user1WalletData = await user1Wallet.getGetWalletData();
        const user2WalletData = await user2Wallet.getGetWalletData();
        const devWalletData = await devWallet.getGetWalletData();

        // User1 should have 900 tokens left (1000 - 100)
        expect(user1WalletData.balance).toBe(toNano("900"));
        
        // User2 should receive 90 tokens (100 - 10% tax)
        expect(user2WalletData.balance).toBe(toNano("90"));
        
        // Dev should receive 10 tokens (10% tax)
        expect(devWalletData.balance).toBe(toNano("10"));
    });

    it("should handle multiple transfers with cumulative tax", async () => {
        // Mint tokens to user1
        const mintAmount = toNano("1000");
        await jettonMaster.send(
            dev.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Mint" as const,
                amount: mintAmount,
                receiver: user1.address
            }
        );

        // First transfer: 100 tokens
        await user1Wallet.send(
            user1.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "TokenTransfer" as const,
                query_id: 0n,
                amount: toNano("100"),
                destination: user2.address,
                response_destination: user1.address,
                custom_payload: null,
                forward_ton_amount: 0n,
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        // Second transfer: 200 tokens
        await user1Wallet.send(
            user1.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "TokenTransfer" as const,
                query_id: 1n,
                amount: toNano("200"),
                destination: user2.address,
                response_destination: user1.address,
                custom_payload: null,
                forward_ton_amount: 0n,
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        // Check final balances
        const user1WalletData = await user1Wallet.getGetWalletData();
        const user2WalletData = await user2Wallet.getGetWalletData();
        const devWalletData = await devWallet.getGetWalletData();

        // User1: 1000 - 100 - 200 = 700
        expect(user1WalletData.balance).toBe(toNano("700"));
        
        // User2: 90 (from first) + 180 (from second) = 270
        expect(user2WalletData.balance).toBe(toNano("270"));
        
        // Dev: 10 (from first) + 20 (from second) = 30
        expect(devWalletData.balance).toBe(toNano("30"));
    });

    it("should prevent transfers with insufficient balance", async () => {
        // Mint only 100 tokens to user1
        const mintAmount = toNano("100");
        await jettonMaster.send(
            dev.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Mint" as const,
                amount: mintAmount,
                receiver: user1.address
            }
        );

        // Try to transfer 200 tokens (more than balance)
        const transferResult = await user1Wallet.send(
            user1.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "TokenTransfer" as const,
                query_id: 0n,
                amount: toNano("200"),
                destination: user2.address,
                response_destination: user1.address,
                custom_payload: null,
                forward_ton_amount: 0n,
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        expect(transferResult.transactions).toHaveTransaction({
            from: user1.address,
            to: user1Wallet.address,
            success: false,
        });
    });

    it("should allow only owner to mint", async () => {
        const mintAmount = toNano("1000");
        
        // Try to mint from non-owner account
        const mintResult = await jettonMaster.send(
            user1.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "Mint" as const,
                amount: mintAmount,
                receiver: user1.address
            }
        );

        expect(mintResult.transactions).toHaveTransaction({
            from: user1.address,
            to: jettonMaster.address,
            success: false,
        });
    });
});
