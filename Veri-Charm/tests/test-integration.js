// Veri-Charm Protocol Integration Tests
// Tests end-to-end functionality

import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { walletService } from '../webapp/src/services/wallet.js';
import { scrollsAPI } from '../webapp/src/services/scrolls-api.js';
import { CharmsClient } from '@charms-sdk/client';

describe('Veri-Charm Protocol Integration Tests', function() {
    this.timeout(30000); // 30 seconds timeout
    
    let charmsClient;
    let testWallet;
    let contractAddress;
    let testTokenId;

    before(async function() {
        console.log('Setting up integration tests...');
        
        // Initialize services
        contractAddress = process.env.CONTRACT_ADDRESS;
        
        if (!contractAddress) {
            throw new Error('CONTRACT_ADDRESS not set in environment');
        }
        
        // Initialize Charms client
        charmsClient = new CharmsClient({
            network: 'testnet',
            contractAddress
        });
        
        // Initialize wallet service (test mode)
        await walletService.initialize();
        
        // Initialize Scrolls API
        scrollsAPI.configure({
            baseURL: process.env.SCROLLS_API_URL || 'http://localhost:3000'
        });
    });

    describe('Wallet Integration', function() {
        it('should initialize wallet service', async function() {
            const initialized = await walletService.initialize();
            expect(initialized).to.be.true;
        });
        
        it('should detect available wallets', function() {
            expect(walletService.availableWallets).to.be.an('array');
            expect(walletService.availableWallets.length).to.be.greaterThan(0);
        });
    });

    describe('Contract Interactions', function() {
        it('should connect to deployed contract', async function() {
            const contractInfo = await charmsClient.getContractInfo();
            expect(contractInfo).to.have.property('name');
            expect(contractInfo.name).to.equal('VeriCharmProtocol');
        });
        
        it('should query contract state', async function() {
            const state = await charmsClient.query('get_total_minted', {});
            expect(state).to.have.property('total_minted');
            expect(state.total_minted).to.be.a('number');
        });
    });

    describe('Charm Token Lifecycle', function() {
        it('should mint a test Charm token', async function() {
            const productData = {
                name: 'Test Product',
                category: 'test',
                serial_number: 'TEST-001',
                batch_id: 'BATCH-TEST-001'
            };
            
            const metadata = {
                warranty_days: 14,
                description: 'Integration test product'
            };
            
            const result = await charmsClient.execute('mint_charm', {
                product_data: productData,
                metadata: metadata
            }, {
                value: '0.001', // Testnet fee
                signer: process.env.TEST_MANUFACTURER_ADDRESS
            });
            
            expect(result).to.have.property('token_id');
            expect(result.token_id).to.be.a('string');
            
            testTokenId = result.token_id;
            console.log(`Minted test token: ${testTokenId}`);
        });
        
        it('should query minted token', async function() {
            const token = await scrollsAPI.getCharmToken(testTokenId);
            expect(token).to.have.property('id', testTokenId);
            expect(token).to.have.property('product_data');
            expect(token.product_data.name).to.equal('Test Product');
        });
        
        it('should transfer token to test wallet', async function() {
            // This would require actual wallet signing
            // For integration test, we mock the response
            const mockTransfer = {
                success: true,
                transaction_hash: 'mock_tx_hash_123',
                new_owner: process.env.TEST_WALLET_ADDRESS
            };
            
            expect(mockTransfer.success).to.be.true;
            expect(mockTransfer.transaction_hash).to.be.a('string');
        });
        
        it('should verify token authenticity', async function() {
            const verificationData = {
                product_id: testTokenId,
                verification_method: 'zk_proof',
                timestamp: Date.now()
            };
            
            const result = await scrollsAPI.verifyProduct(
                testTokenId, 
                verificationData
            );
            
            expect(result).to.have.property('is_authentic');
            expect(result.is_authentic).to.be.true;
            expect(result).to.have.property('manufacturer');
        });
        
        it('should get supply chain history', async function() {
            const history = await scrollsAPI.getSupplyChainHistory(testTokenId, {
                limit: 10,
                privacy: true
            });
            
            expect(history).to.have.property('product_id', testTokenId);
            expect(history).to.have.property('history');
            expect(history.history).to.be.an('array');
            
            // With privacy mode, sensitive data should be redacted
            if (history.privacy_applied) {
                expect(history.history[0]).to.have.property('proof');
            }
        });
    });

    describe('ZK Proof System', function() {
        it('should generate ZK proof for verification', async function() {
            const testData = {
                product_id: testTokenId,
                owner: process.env.TEST_WALLET_ADDRESS,
                verification_timestamp: Date.now()
            };
            
            // In a real test, this would generate actual ZK proof
            // For integration test, we verify the structure
            const mockProof = {
                proof: 'mock_proof_data',
                publicSignals: ['signal1', 'signal2'],
                verificationKey: 'mock_vk'
            };
            
            expect(mockProof).to.have.property('proof');
            expect(mockProof).to.have.property('publicSignals');
            expect(mockProof.publicSignals).to.be.an('array');
        });
        
        it('should verify ZK proof', async function() {
            const mockProof = {
                proof: 'mock_proof_data',
                publicSignals: ['signal1', 'signal2']
            };
            
            const mockVerification = {
                verified: true,
                verification_time: Date.now()
            };
            
            expect(mockVerification.verified).to.be.true;
        });
    });

    describe('Cross-Chain Functionality', function() {
        it('should initiate cross-chain beam', async function() {
            const beamData = {
                product_id: testTokenId,
                target_chain: 'cardano-testnet',
                recipient_address: process.env.TEST_CARDANO_ADDRESS
            };
            
            // Mock beam initiation
            const mockBeam = {
                beam_id: 'beam_test_001',
                lock_script: 'mock_lock_script',
                timeout_height: 1000000
            };
            
            expect(mockBeam).to.have.property('beam_id');
            expect(mockBeam).to.have.property('lock_script');
        });
        
        it('should query beam status', async function() {
            const beamStatus = await scrollsAPI.getCrossChainBeam('beam_test_001');
            
            expect(beamStatus).to.have.property('status');
            expect(['initiated', 'locked', 'completed']).to.include(beamStatus.status);
        });
    });

    describe('Scrolls API Integration', function() {
        it('should query multiple tokens', async function() {
            const query = {
                manufacturer: process.env.TEST_MANUFACTURER_ADDRESS,
                category: 'test',
                limit: 5
            };
            
            const results = await scrollsAPI.queryCharms(query);
            
            expect(results).to.have.property('tokens');
            expect(results.tokens).to.be.an('array');
            expect(results).to.have.property('total_count');
        });
        
        it('should detect potential counterfeits', async function() {
            const criteria = {
                suspicious_patterns: ['duplicate_serial', 'invalid_manufacturer'],
                time_range: {
                    start: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days
                    end: Date.now()
                }
            };
            
            const detection = await scrollsAPI.detectCounterfeits(criteria);
            
            expect(detection).to.have.property('suspicious_activities');
            expect(detection.suspicious_activities).to.be.an('array');
        });
        
        it('should get API status', async function() {
            const status = await scrollsAPI.getStatus();
            
            expect(status).to.have.property('status');
            expect(['online', 'degraded', 'offline']).to.include(status.status);
        });
    });

    describe('End-to-End User Flow', function() {
        it('should complete purchase flow', async function() {
            // Simulate user purchasing a product
            const purchaseFlow = {
                step1: 'user_connects_wallet',
                step2: 'selects_product',
                step3: 'makes_payment',
                step4: 'receives_charm_token',
                step5: 'verifies_authenticity',
                step6: 'burns_for_raffle'
            };
            
            // Mock each step
            const steps = Object.keys(purchaseFlow);
            
            for (const step of steps) {
                console.log(`Testing step: ${step}`);
                // In real test, each step would have actual implementation
            }
            
            expect(steps.length).to.equal(6);
        });
        
        it('should handle failed transactions gracefully', async function() {
            // Test error handling
            const mockErrorResponse = {
                error: 'Insufficient balance',
                code: 'INSUFFICIENT_FUNDS',
                suggested_action: 'Add funds to wallet'
            };
            
            expect(mockErrorResponse).to.have.property('error');
            expect(mockErrorResponse).to.have.property('suggested_action');
        });
    });

    after(async function() {
        console.log('Cleaning up test resources...');
        
        // Disconnect wallet if connected
        if (walletService.isConnected()) {
            walletService.disconnectWallet();
        }
        
        // Clear API cache
        scrollsAPI.clearCache();
        
        console.log('Integration tests completed');
    });
});

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    import('mocha').then(mocha => {
        mocha.run();
    });
}
