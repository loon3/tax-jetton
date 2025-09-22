import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
    testSuite: string;
    testName: string;
    status: 'PASS' | 'FAIL';
    duration: number;
    details?: string;
    metrics?: Record<string, any>;
    balances?: Record<string, any>;
}

export interface TestSummary {
    timestamp: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
    testSuites: {
        name: string;
        tests: TestResult[];
        summary: string;
    }[];
    contractsVerified: string[];
    keyMetrics: Record<string, any>;
    finalBalances?: Record<string, any>;
}

export class TestReporter {
    private results: TestResult[] = [];
    private startTime: number = Date.now();
    private contractsVerified: string[] = [];
    private keyMetrics: Record<string, any> = {};
    private finalBalances: Record<string, any> = {};

    addTest(result: TestResult) {
        this.results.push(result);
    }

    addContract(contractName: string) {
        this.contractsVerified.push(contractName);
    }

    addMetric(key: string, value: any) {
        this.keyMetrics[key] = value;
    }

    setFinalBalances(balances: Record<string, any>) {
        this.finalBalances = balances;
    }

    generateSummary(): TestSummary {
        const endTime = Date.now();
        const totalDuration = endTime - this.startTime;
        
        const testSuites = this.groupTestsBySuite();
        
        return {
            timestamp: new Date().toISOString(),
            totalTests: this.results.length,
            passedTests: this.results.filter(r => r.status === 'PASS').length,
            failedTests: this.results.filter(r => r.status === 'FAIL').length,
            totalDuration,
            testSuites,
            contractsVerified: this.contractsVerified,
            keyMetrics: this.keyMetrics,
            finalBalances: this.finalBalances
        };
    }

    private groupTestsBySuite() {
        const suiteMap = new Map<string, TestResult[]>();
        
        this.results.forEach(result => {
            if (!suiteMap.has(result.testSuite)) {
                suiteMap.set(result.testSuite, []);
            }
            suiteMap.get(result.testSuite)!.push(result);
        });

        return Array.from(suiteMap.entries()).map(([name, tests]) => ({
            name,
            tests,
            summary: this.generateSuiteSummary(tests)
        }));
    }

    private generateSuiteSummary(tests: TestResult[]): string {
        const passed = tests.filter(t => t.status === 'PASS').length;
        const failed = tests.filter(t => t.status === 'FAIL').length;
        const avgDuration = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;
        
        return `${passed}/${tests.length} passed, avg ${avgDuration.toFixed(0)}ms`;
    }

    async saveReport(summary: TestSummary) {
        const reportsDir = path.join(process.cwd(), 'test-reports');
        
        // Ensure directory exists
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Generate filenames
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonFile = path.join(reportsDir, `test-report-${timestamp}.json`);
        const mdFile = path.join(reportsDir, `test-report-${timestamp}.md`);
        const latestFile = path.join(reportsDir, 'latest-report.md');

        // Save JSON report
        fs.writeFileSync(jsonFile, JSON.stringify(summary, null, 2));

        // Generate and save Markdown report
        const markdown = this.generateMarkdownReport(summary);
        fs.writeFileSync(mdFile, markdown);
        fs.writeFileSync(latestFile, markdown);

        console.log(`\n📊 Test report saved:`);
        console.log(`   JSON: ${jsonFile}`);
        console.log(`   MD:   ${mdFile}`);
        console.log(`   Latest: ${latestFile}`);
    }

    private generateMarkdownReport(summary: TestSummary): string {
        const { timestamp, totalTests, passedTests, failedTests, totalDuration, testSuites, contractsVerified, keyMetrics, finalBalances } = summary;
        
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        const status = failedTests === 0 ? '✅ ALL PASSED' : `❌ ${failedTests} FAILED`;
        
        return `# 🧪 Test Report - ${new Date(timestamp).toLocaleString()}

## 📊 Summary
- **Status**: ${status}
- **Total Tests**: ${totalTests}
- **Passed**: ${passedTests} (${successRate}%)
- **Failed**: ${failedTests}
- **Duration**: ${(totalDuration / 1000).toFixed(2)}s

## 🎯 Test Suites

${testSuites.map(suite => `### ${suite.name}
**Summary**: ${suite.summary}

${suite.tests.map(test => {
    let testLine = `- ${test.status === 'PASS' ? '✅' : '❌'} **${test.testName}** (${test.duration}ms)`;
    if (test.details) testLine += `\n  📝 ${test.details}`;
    if (test.metrics) testLine += `\n  📊 ${Object.entries(test.metrics).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
    if (test.balances) testLine += `\n  💰 ${Object.entries(test.balances).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
    return testLine;
}).join('\n')}
`).join('\n')}

## 🏗️ Contracts Verified
${contractsVerified.length > 0 ? contractsVerified.map(c => `- ✅ ${c}`).join('\n') : '- No contracts verified in this test run'}

## 📈 Key Metrics
${Object.keys(keyMetrics).length > 0 ? 
    Object.entries(keyMetrics).map(([key, value]) => `- **${key}**: ${value}`).join('\n') :
    '- No metrics recorded'
}

${finalBalances && Object.keys(finalBalances).length > 0 ? `
## 💰 Final Balances
${Object.entries(finalBalances).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}
` : ''}
## 🚀 Environment
- **Node.js**: ${process.version}
- **Platform**: ${process.platform}
- **Architecture**: ${process.arch}
- **Working Directory**: ${process.cwd()}

---
*Generated by TAXSTR Test Reporter*`;
    }
}

// Global reporter instance
export const testReporter = new TestReporter();
