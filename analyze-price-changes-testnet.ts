import { TonClient, Address } from '@ton/ton';
import dotenv from 'dotenv';
import { TaxJettonMaster } from './output/tax-jetton_TaxJettonMaster';
import { TaxJettonWallet } from './output/tax-jetton_TaxJettonWallet';
import { SmartTAXSDEX } from './output/dex-v8-simple-fees_SmartTAXSDEX';

dotenv.config();

const CONTRACTS = {
    TAXSTR_MASTER: 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf',
    DEX: 'EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS'
};

interface PriceAnalysis {
    stage: string;
    price_ton_per_taxstr: number;
    price_usd_per_taxstr: number; // Assuming 1 TON = $2 for calculation
    total_supply: number;
    dex_liquidity: number;
    market_cap_ton: number;
    market_cap_usd: number;
    circulating_supply?: number;
    dex_liquidity_percentage?: number;
}

async function analyzePriceChanges() {
    // Initialize client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TONCENTER_API_KEY,
    });

    console.log('📊 TAXSTR DEX Price & Market Cap Analysis\n');
    console.log('='.repeat(80));

    // Constants for analysis
    const TON_USD_PRICE = 2.0; // Assumed TON price in USD
    
    // Get current data
    const dex = client.open(SmartTAXSDEX.fromAddress(Address.parse(CONTRACTS.DEX)));
    const jettonMaster = client.open(TaxJettonMaster.fromAddress(Address.parse(CONTRACTS.TAXSTR_MASTER)));

    try {
        // Get current DEX state
        const currentPrice = await dex.getGetPrice();
        const tonFeesCollected = await dex.getGetTonFeesCollected();
        
        // Get total supply
        const jettonData = await jettonMaster.getGetJettonData();
        const totalSupply = Number(jettonData.total_supply) / 1e9; // Convert to tokens
        
        // Get DEX liquidity
        const dexJettonWallet = await jettonMaster.getGetWalletAddress(Address.parse(CONTRACTS.DEX));
        const dexJetton = client.open(TaxJettonWallet.fromAddress(dexJettonWallet));
        const dexBalance = await dexJetton.getGetWalletData();
        const dexLiquidity = Number(dexBalance.balance) / 1e9; // Convert to tokens
        
        console.log('📈 Current DEX State:');
        console.log(`💱 Current Price: ${(Number(currentPrice) / 1e9).toFixed(8)} TON per TAXSTR`);
        console.log(`🏦 Total Supply: ${totalSupply.toLocaleString()} TAXSTR`);
        console.log(`💧 DEX Liquidity: ${dexLiquidity.toLocaleString()} TAXSTR`);
        console.log(`💰 TON Fees Collected: ${Number(tonFeesCollected) / 1e9} TON\n`);

        // Historical analysis based on our known operations
        const priceHistory: PriceAnalysis[] = [];

        // Stage 1: Initial deployment with base price
        // From deploy-dex-testnet.ts, we used basePrice: 3471n (nanoTON)
        const initialPrice = 3471 / 1e9; // 0.000003471 TON per TAXSTR
        priceHistory.push({
            stage: 'Initial Deployment',
            price_ton_per_taxstr: initialPrice,
            price_usd_per_taxstr: initialPrice * TON_USD_PRICE,
            total_supply: totalSupply,
            dex_liquidity: 0, // No liquidity initially
            market_cap_ton: totalSupply * initialPrice,
            market_cap_usd: totalSupply * initialPrice * TON_USD_PRICE
        });

        // Stage 2: After seeding with 500M TAXSTR
        const postSeedLiquidity = 500_000_000;
        priceHistory.push({
            stage: 'After DEX Seeding (500M TAXSTR)',
            price_ton_per_taxstr: initialPrice, // Price unchanged by seeding
            price_usd_per_taxstr: initialPrice * TON_USD_PRICE,
            total_supply: totalSupply,
            dex_liquidity: postSeedLiquidity,
            market_cap_ton: totalSupply * initialPrice,
            market_cap_usd: totalSupply * initialPrice * TON_USD_PRICE,
            dex_liquidity_percentage: (postSeedLiquidity / totalSupply) * 100
        });

        // Stage 3: After buy operation (current state, but we can calculate pre-buy)
        // We know ~25,183 TAXSTR were sold for 0.19 TON net
        const preBuyLiquidity = dexLiquidity + 25_183; // Approximate
        const buyPrice = 0.19 / 25_183; // 0.19 TON for ~25,183 TAXSTR
        priceHistory.push({
            stage: 'After Buy Operation (0.2 TON → ~25K TAXSTR)',
            price_ton_per_taxstr: buyPrice,
            price_usd_per_taxstr: buyPrice * TON_USD_PRICE,
            total_supply: totalSupply,
            dex_liquidity: preBuyLiquidity,
            market_cap_ton: totalSupply * buyPrice,
            market_cap_usd: totalSupply * buyPrice * TON_USD_PRICE,
            dex_liquidity_percentage: (preBuyLiquidity / totalSupply) * 100
        });

        // Stage 4: Current state (after sell operation)
        const currentPriceActual = Number(currentPrice) / 1e9;
        priceHistory.push({
            stage: 'Current (After Sell 10K TAXSTR)',
            price_ton_per_taxstr: currentPriceActual,
            price_usd_per_taxstr: currentPriceActual * TON_USD_PRICE,
            total_supply: totalSupply,
            dex_liquidity: dexLiquidity,
            market_cap_ton: totalSupply * currentPriceActual,
            market_cap_usd: totalSupply * currentPriceActual * TON_USD_PRICE,
            circulating_supply: totalSupply - dexLiquidity, // Approximate circulating supply
            dex_liquidity_percentage: (dexLiquidity / totalSupply) * 100
        });

        // Display analysis
        console.log('🔍 HISTORICAL PRICE ANALYSIS:');
        console.log('='.repeat(80));

        priceHistory.forEach((stage, index) => {
            console.log(`\n${index + 1}. ${stage.stage}`);
            console.log(`   💱 Price: ${stage.price_ton_per_taxstr.toFixed(8)} TON (~$${stage.price_usd_per_taxstr.toFixed(6)})`);
            console.log(`   🏦 Market Cap: ${stage.market_cap_ton.toFixed(2)} TON (~$${stage.market_cap_usd.toLocaleString()})`);
            console.log(`   💧 DEX Liquidity: ${stage.dex_liquidity.toLocaleString()} TAXSTR`);
            if (stage.dex_liquidity_percentage) {
                console.log(`   📊 Liquidity %: ${stage.dex_liquidity_percentage.toFixed(1)}%`);
            }
            if (stage.circulating_supply) {
                console.log(`   🔄 Circulating Supply: ${stage.circulating_supply.toLocaleString()} TAXSTR`);
            }
        });

        // Calculate percentage changes
        console.log('\n📈 PRICE CHANGE ANALYSIS:');
        console.log('='.repeat(50));

        for (let i = 1; i < priceHistory.length; i++) {
            const current = priceHistory[i]!;
            const previous = priceHistory[i - 1]!;
            
            const priceChange = ((current.price_ton_per_taxstr - previous.price_ton_per_taxstr) / previous.price_ton_per_taxstr) * 100;
            const marketCapChange = ((current.market_cap_ton - previous.market_cap_ton) / previous.market_cap_ton) * 100;
            
            console.log(`\n${previous.stage} → ${current.stage}:`);
            console.log(`   💱 Price Change: ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
            console.log(`   🏦 Market Cap Change: ${marketCapChange >= 0 ? '+' : ''}${marketCapChange.toFixed(2)}%`);
        }

        // Overall performance
        const initialStage = priceHistory[0]!;
        const finalStage = priceHistory[priceHistory.length - 1]!;
        const totalPriceChange = ((finalStage.price_ton_per_taxstr - initialStage.price_ton_per_taxstr) / initialStage.price_ton_per_taxstr) * 100;
        const totalMarketCapChange = ((finalStage.market_cap_ton - initialStage.market_cap_ton) / initialStage.market_cap_ton) * 100;

        console.log('\n🎯 OVERALL PERFORMANCE:');
        console.log('='.repeat(30));
        console.log(`💱 Total Price Change: ${totalPriceChange >= 0 ? '+' : ''}${totalPriceChange.toFixed(2)}%`);
        console.log(`🏦 Total Market Cap Change: ${totalMarketCapChange >= 0 ? '+' : ''}${totalMarketCapChange.toFixed(2)}%`);
        console.log(`📊 Current Market Cap: $${finalStage.market_cap_usd.toLocaleString()}`);
        console.log(`💧 DEX Controls: ${finalStage.dex_liquidity_percentage?.toFixed(1)}% of supply`);

        // Trading volume analysis
        console.log('\n📊 TRADING VOLUME ANALYSIS:');
        console.log('='.repeat(35));
        console.log(`💰 Buy Volume: 0.2 TON (~$${(0.2 * TON_USD_PRICE).toFixed(2)})`);
        console.log(`💰 Sell Volume: ~${(10_000 * currentPriceActual).toFixed(4)} TON (~$${(10_000 * currentPriceActual * TON_USD_PRICE).toFixed(2)})`);
        console.log(`💰 Total TON Fees Collected: ${Number(tonFeesCollected) / 1e9} TON`);
        console.log(`📈 Volume/Market Cap Ratio: ${(((0.2 + (10_000 * currentPriceActual)) / finalStage.market_cap_ton) * 100).toFixed(4)}%`);

        console.log('\n✅ Analysis completed!\n');

    } catch (error) {
        console.error('❌ Error during analysis:', error instanceof Error ? error.message : 'Unknown error');
    }
}

analyzePriceChanges().catch(console.error);
