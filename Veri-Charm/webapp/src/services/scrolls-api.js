// Scrolls API integration for Veri-Charm Protocol
// Handles blockchain data queries and indexing

import axios from 'axios';
import { zk } from '@charms-sdk/zk';

class ScrollsAPIService {
    constructor() {
        this.baseURL = process.env.SCROLLS_API_URL || 'https://api.scrolls.charms.dev';
        this.apiKey = process.env.SCROLLS_API_KEY;
        this.cache = new Map();
        this.cacheTTL = 60000; // 1 minute
    }

    /**
     * Configure API client
     */
    configure(config) {
        if (config.baseURL) {
            this.baseURL = config.baseURL;
        }
        
        if (config.apiKey) {
            this.apiKey = config.apiKey;
        }
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
            },
            timeout: 30000
        });
    }

    /**
     * Query Charm tokens by various criteria
     */
    async queryCharms(query) {
        const cacheKey = `query_${JSON.stringify(query)}`;
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTTL) {
                return cached.data;
            }
        }

        try {
            const response = await this.client.post('/v1/charms/query', query);
            
            // Cache result
            this.cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            
            return response.data;
        } catch (error) {
            console.error('Scrolls API query failed:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get specific Charm token by ID
     */
    async getCharmToken(tokenId, options = {}) {
        const { includeHistory = true, zkProof = false } = options;
        const cacheKey = `token_${tokenId}_${includeHistory}_${zkProof}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTTL) {
                return cached.data;
            }
        }

        try {
            const response = await this.client.get(`/v1/charms/${tokenId}`, {
                params: {
                    include_history: includeHistory,
                    zk_proof: zkProof
                }
            });
            
            this.cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            
            return response.data;
        } catch (error) {
            console.error('Failed to get Charm token:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Verify product authenticity with ZK proof
     */
    async verifyProduct(productId, verificationData) {
        try {
            const response = await this.client.post('/v1/verify/product', {
                product_id: productId,
                verification_data: verificationData,
                timestamp: Date.now()
            });
            
            return response.data;
        } catch (error) {
            console.error('Product verification failed:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get supply chain history for a product
     */
    async getSupplyChainHistory(productId, options = {}) {
        const { limit = 50, offset = 0, privacy = false } = options;
        
        try {
            const response = await this.client.get(`/v1/supply-chain/${productId}`, {
                params: {
                    limit,
                    offset,
                    privacy_mode: privacy
                }
            });
            
            // If privacy mode enabled, process with ZK
            if (privacy && response.data.history) {
                response.data.history = await this.applyPrivacyShield(
                    response.data.history
                );
            }
            
            return response.data;
        } catch (error) {
            console.error('Failed to get supply chain history:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Search for counterfeits or suspicious activity
     */
    async detectCounterfeits(criteria) {
        try {
            const response = await this.client.post('/v1/detect/counterfeits', criteria);
            
            return response.data;
        } catch (error) {
            console.error('Counterfeit detection failed:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Submit transaction to blockchain
     */
    async submitTransaction(txData, chain = 'bitcoin-testnet') {
        try {
            const response = await this.client.post('/v1/transactions/submit', {
                transaction: txData,
                chain,
                timestamp: Date.now()
            });
            
            return response.data;
        } catch (error) {
            console.error('Transaction submission failed:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get transaction status
     */
    async getTransactionStatus(txHash, chain = 'bitcoin-testnet') {
        try {
            const response = await this.client.get(`/v1/transactions/${txHash}/status`, {
                params: { chain }
            });
            
            return response.data;
        } catch (error) {
            console.error('Failed to get transaction status:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get cross-chain beam status
     */
    async getCrossChainBeam(beamId) {
        try {
            const response = await this.client.get(`/v1/beams/${beamId}`);
            
            return response.data;
        } catch (error) {
            console.error('Failed to get cross-chain beam:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Apply ZK privacy shield to data
     */
    async applyPrivacyShield(data) {
        try {
            // Generate ZK proof for privacy
            const zkProof = await zk.generateProof('privacy-shield', {
                publicInputs: {
                    dataHash: this.hashData(data)
                },
                privateInputs: {
                    rawData: data
                }
            });
            
            return {
                proof: zkProof.proof,
                publicSignals: zkProof.publicSignals,
                verificationKey: zkProof.verificationKey,
                // Only include minimal public data
                publicData: this.extractPublicData(data)
            };
        } catch (error) {
            console.warn('ZK privacy shield failed, falling back to plain data:', error);
            return data;
        }
    }

    /**
     * Extract public data (non-sensitive)
     */
    extractPublicData(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.extractPublicData(item));
        }
        
        if (typeof data === 'object' && data !== null) {
            const publicData = {};
            
            for (const [key, value] of Object.entries(data)) {
                // Only include non-sensitive fields
                if (!this.isSensitiveField(key)) {
                    publicData[key] = this.extractPublicData(value);
                } else {
                    publicData[key] = '[REDACTED]';
                }
            }
            
            return publicData;
        }
        
        return data;
    }

    /**
     * Check if field contains sensitive data
     */
    isSensitiveField(fieldName) {
        const sensitiveFields = [
            'privateKey', 'secret', 'password', 'pin', 
            'address', 'email', 'phone', 'ssn', 'dob'
        ];
        
        return sensitiveFields.some(sensitive => 
            fieldName.toLowerCase().includes(sensitive.toLowerCase())
        );
    }

    /**
     * Hash data for verification
     */
    hashData(data) {
        const jsonString = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(jsonString);
        
        // Simple hash for demo (use proper crypto in production)
        return Array.from(dataBuffer)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Handle API errors
     */
    handleError(error) {
        if (error.response) {
            // Server responded with error
            return new Error(
                `Scrolls API Error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`
            );
        } else if (error.request) {
            // No response received
            return new Error('No response from Scrolls API. Check your connection.');
        } else {
            // Request setup error
            return new Error(`Scrolls API request failed: ${error.message}`);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get API status
     */
    async getStatus() {
        try {
            const response = await this.client.get('/v1/status');
            return response.data;
        } catch (error) {
            return {
                status: 'offline',
                error: error.message
            };
        }
    }
}

// Export singleton instance
export const scrollsAPI = new ScrollsAPIService();
export default scrollsAPI;
