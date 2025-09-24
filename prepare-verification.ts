import * as fs from 'fs';
import * as path from 'path';

function prepareVerification() {
    console.log('📋 Preparing Contract Verification Files...\n');
    
    // Contract addresses from deployment
    const taxstrContract = 'EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf';
    const dexContract = 'EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS';
    
    console.log('🎯 Contract Addresses:');
    console.log(`   TAXSTR Master: ${taxstrContract}`);
    console.log(`   DEX V8: ${dexContract}`);
    
    console.log('\n📁 Available Verification Files:');
    
    // Check TAXSTR files
    const taxstrPkgPath = './output/tax-jetton_TaxJettonMaster.pkg';
    const taxstrSourcePath = './src/main.tact';
    
    if (fs.existsSync(taxstrPkgPath)) {
        const taxstrPkgSize = fs.statSync(taxstrPkgPath).size;
        console.log(`   ✅ TaxJettonMaster.pkg (${taxstrPkgSize} bytes)`);
    } else {
        console.log(`   ❌ TaxJettonMaster.pkg not found`);
    }
    
    if (fs.existsSync(taxstrSourcePath)) {
        console.log(`   ✅ main.tact (source file)`);
    } else {
        console.log(`   ❌ main.tact not found`);
    }
    
    // Check DEX files  
    const dexPkgPath = './output/dex-v8-simple-fees_SmartTAXSDEX.pkg';
    const dexSourcePath = './src/dex-v8-simple-fees.tact';
    
    if (fs.existsSync(dexPkgPath)) {
        const dexPkgSize = fs.statSync(dexPkgPath).size;
        console.log(`   ✅ SmartTAXSDEX.pkg (${dexPkgSize} bytes)`);
    } else {
        console.log(`   ❌ SmartTAXSDEX.pkg not found`);
    }
    
    if (fs.existsSync(dexSourcePath)) {
        console.log(`   ✅ dex-v8-simple-fees.tact (source file)`);
    } else {
        console.log(`   ❌ dex-v8-simple-fees.tact not found`);
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('🔗 VERIFICATION INSTRUCTIONS');
    console.log('═══════════════════════════════════════');
    
    console.log('\n1️⃣ TAXSTR Token Contract Verification:');
    console.log('   🌐 Go to: https://verifier.ton.org');
    console.log('   📍 Contract Address: ' + taxstrContract);
    console.log('   📁 Upload File: output/tax-jetton_TaxJettonMaster.pkg');
    console.log('   📝 Contract Name: TaxJettonMaster');
    console.log('   ⚙️ Compiler: Tact (latest)');
    console.log('   📄 Source: src/main.tact (for reference)');
    
    console.log('\n2️⃣ DEX V8 Contract Verification:');
    console.log('   🌐 Go to: https://verifier.ton.org');
    console.log('   📍 Contract Address: ' + dexContract);
    console.log('   📁 Upload File: output/dex-v8-simple-fees_SmartTAXSDEX.pkg');
    console.log('   📝 Contract Name: SmartTAXSDEX');
    console.log('   ⚙️ Compiler: Tact (latest)');
    console.log('   📄 Source: src/dex-v8-simple-fees.tact (for reference)');
    
    console.log('\n📋 Verification Process:');
    console.log('   1. Visit https://verifier.ton.org');
    console.log('   2. Enter contract address');
    console.log('   3. Upload the .pkg file');
    console.log('   4. Select "Tact" as compiler');
    console.log('   5. Submit for verification');
    console.log('   6. Wait for verification (usually 1-5 minutes)');
    
    console.log('\n🔍 After Verification:');
    console.log('   ✅ Contracts will show as "Verified" on explorers');
    console.log('   📊 Source code will be publicly viewable');
    console.log('   🛡️ Users can trust the contract transparency');
    
    console.log('\n🔗 Explorer Links:');
    console.log('   TAXSTR TONScan: https://testnet.tonscan.org/address/' + taxstrContract);
    console.log('   TAXSTR TONViewer: https://testnet.tonviewer.com/' + taxstrContract);
    console.log('   DEX TONScan: https://testnet.tonscan.org/address/' + dexContract);
    console.log('   DEX TONViewer: https://testnet.tonviewer.com/' + dexContract);
    
    // Create verification summary file
    const verificationInfo = {
        contracts: {
            taxstr: {
                address: taxstrContract,
                name: 'TaxJettonMaster',
                pkgFile: 'output/tax-jetton_TaxJettonMaster.pkg',
                sourceFile: 'src/main.tact',
                compiler: 'Tact'
            },
            dex: {
                address: dexContract,
                name: 'SmartTAXSDEX', 
                pkgFile: 'output/dex-v8-simple-fees_SmartTAXSDEX.pkg',
                sourceFile: 'src/dex-v8-simple-fees.tact',
                compiler: 'Tact'
            }
        },
        verificationUrl: 'https://verifier.ton.org',
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('verification-info.json', JSON.stringify(verificationInfo, null, 2));
    console.log('\n📄 Created verification-info.json for reference');
    
    console.log('\n🎯 Ready for Verification!');
    console.log('   All .pkg files are available in the output directory');
    console.log('   Follow the instructions above to verify both contracts');
}

// Run preparation
prepareVerification();

