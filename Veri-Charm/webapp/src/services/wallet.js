// Wallet integration service for Veri-Charm Protocol
// Supports multiple UTXO chain wallets

import { Address, Transaction, Network } from 'bitcoinjs-lib';
import { Cardano } from '@cardano-foundation/cardano-connect-with-wallet';
import { detectWallet, WalletType } from '@charms-sdk/wallet-detector';

class WalletService {
    constructor() {
        this.currentWallet = null;
        this.network = 'testnet';
        this.walletListeners = new Set();
        this.initialized = false;
    }

    /**
     * Initialize wallet service
     */
    async initialize() {
        try {
            // Auto-detect available wallets
            const availableWallets = await detectWallet();
            
            if (availableWallets.length === 0) {
                throw new Error('No compatible wallets found. Please install Hiro, Nami, or Flint wallet.');
            }
            
            // Prefer Hiro for Bitcoin, Nami for Cardano
            this.availableWallets = availableWallets;
            this.initialized = true;
            
            console.log('Wallet service initialized with available wallets:', availableWallets);
            return true;
        } catch (error) {
            console.error('Failed to initialize wallet service:', error);
            return false;
        }
    }

    /**
     * Connect to a specific wallet
     */
    async connectWallet(walletType) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            let wallet;
            
            switch(walletType) {
                case WalletType.HIRO:
                    wallet = await this.connectHiroWallet();
                    break;
                    
                case WalletType.NAMI:
                    wallet = await this.connectNamiWallet();
                    break;
                    
                case WalletType.FLINT:
                    wallet = await this.connectFlintWallet();
                    break;
                    
                default:
                    throw new Error(`Unsupported wallet type: ${walletType}`);
            }
            
            this.currentWallet = wallet;
            this.notifyWalletChange();
            
            // Store connection in localStorage
            localStorage.setItem('vericharm_wallet', JSON.stringify({
                type: walletType,
                address: wallet.address,
                network: this.network,
                connectedAt: Date.now()
            }));
            
            return wallet;
        } catch (error) {
            console.error(`Failed to connect ${walletType} wallet:`, error);
            throw error;
        }
    }

    /**
     * Connect to Hiro wallet (Bitcoin)
     */
    async connectHiroWallet() {
        if (typeof window.btc === 'undefined') {
            throw new Error('Hiro wallet not installed');
        }

        try {
            const accounts = await window.btc.request('getAccounts');
            
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found in Hiro wallet');
            }
            
            const address = accounts[0];
            
            // Get balance
            const balance = await this.getBitcoinBalance(address);
            
            // Get network
            const network = await window.btc.request('getNetwork');
            
            return {
                type: WalletType.HIRO,
                address,
                balance,
                network,
                provider: window.btc
            };
        } catch (error) {
            throw new Error(`Hiro wallet connection failed: ${error.message}`);
        }
    }

    /**
     * Connect to Nami wallet (Cardano)
     */
    async connectNamiWallet() {
        if (typeof window.cardano === 'undefined' || !window.cardano.nami) {
            throw new Error('Nami wallet not installed');
        }

        try {
            const nami = window.cardano.nami;
            await nami.enable();
            
            const address = (await nami.getUsedAddresses())[0];
            const balance = await this.getCardanoBalance(address);
            const networkId = await nami.getNetworkId();
            
            return {
                type: WalletType.NAMI,
                address,
                balance,
                network: networkId === 0 ? 'mainnet' : 'testnet',
                provider: nami
            };
        } catch (error) {
            throw new Error(`Nami wallet connection failed: ${error.message}`);
        }
    }

    /**
     * Get Bitcoin balance
     */
    async getBitcoinBalance(address) {
        try {
            // Use blockchain.info API for testnet
            const response = await fetch(
                `https://blockstream.info/testnet/api/address/${address}/utxo`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch balance');
            }
            
            const utxos = await response.json();
            const totalSats = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
            
            return {
                sats: totalSats,
                btc: totalSats / 100000000,
                formatted: `${(totalSats / 100000000).toFixed(8)} BTC`
            };
        } catch (error) {
            console.warn('Could not fetch Bitcoin balance:', error);
            return { sats: 0, btc: 0, formatted: '0 BTC' };
        }
    }

    /**
     * Get Cardano balance
     */
    async getCardanoBalance(address) {
        try {
            // Use Blockfrost API
            const response = await fetch(
                `https://cardano-testnet.blockfrost.io/api/v0/addresses/${address}`,
                {
                    headers: {
                        'project_id': process.env.BLOCKFROST_API_KEY
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch Cardano balance');
            }
            
            const data = await response.json();
            const lovelace = data.amount.find(a => a.unit === 'lovelace')?.quantity || '0';
            
            return {
                lovelace: BigInt(lovelace),
                ada: Number(lovelace) / 1000000,
                formatted: `${(Number(lovelace) / 1000000).toFixed(2)} ADA`
            };
        } catch (error) {
            console.warn('Could not fetch Cardano balance:', error);
            return { lovelace: 0n, ada: 0, formatted: '0 ADA' };
        }
    }

    /**
     * Sign a transaction
     */
    async signTransaction(txHex, options = {}) {
        if (!this.currentWallet) {
            throw new Error('No wallet connected');
        }

        try {
            let signedTx;
            
            switch(this.currentWallet.type) {
                case WalletType.HIRO:
                    signedTx = await this.signBitcoinTransaction(txHex, options);
                    break;
                    
                case WalletType.NAMI:
                    signedTx = await this.signCardanoTransaction(txHex, options);
                    break;
                    
                default:
                    throw new Error(`Signing not implemented for ${this.currentWallet.type}`);
            }
            
            return signedTx;
        } catch (error) {
            console.error('Transaction signing failed:', error);
            throw error;
        }
    }

    /**
     * Sign Bitcoin transaction with Hiro
     */
    async signBitcoinTransaction(txHex, options) {
        const { inputs, outputs } = options;
        
        const tx = {
            inputs: inputs.map(input => ({
                txid: input.txid,
                vout: input.vout,
                address: input.address,
                value: input.value
            })),
            outputs: outputs.map(output => ({
                address: output.address,
                value: output.value
            }))
        };
        
        try {
            const signed = await window.btc.request('signTransaction', tx);
            return signed.hex;
        } catch (error) {
            throw new Error(`Bitcoin signing failed: ${error.message}`);
        }
    }

    /**
     * Disconnect wallet
     */
    disconnectWallet() {
        this.currentWallet = null;
        localStorage.removeItem('vericharm_wallet');
        this.notifyWalletChange();
    }

    /**
     * Check if wallet is connected
     */
    isConnected() {
        return this.currentWallet !== null;
    }

    /**
     * Get current wallet info
     */
    getWalletInfo() {
        if (!this.currentWallet) {
            return null;
        }
        
        return {
            type: this.currentWallet.type,
            address: this.currentWallet.address,
            balance: this.currentWallet.balance,
            network: this.currentWallet.network
        };
    }

    /**
     * Notify listeners about wallet changes
     */
    notifyWalletChange() {
        this.walletListeners.forEach(listener => {
            try {
                listener(this.getWalletInfo());
            } catch (error) {
                console.error('Wallet listener error:', error);
            }
        });
    }

    /**
     * Add wallet change listener
     */
    addWalletListener(listener) {
        this.walletListeners.add(listener);
        return () => this.walletListeners.delete(listener);
    }

    /**
     * Switch network
     */
    async switchNetwork(network) {
        if (!this.currentWallet) {
            throw new Error('No wallet connected');
        }

        try {
            switch(this.currentWallet.type) {
                case WalletType.HIRO:
                    await window.btc.request('switchNetwork', {
                        network: network === 'mainnet' ? 'mainnet' : 'testnet'
                    });
                    break;
                    
                case WalletType.NAMI:
                    // Nami doesn't support network switching in dApp
                    console.warn('Network switching not supported for Nami');
                    break;
            }
            
            this.network = network;
            this.currentWallet.network = network;
            this.notifyWalletChange();
            
            return true;
        } catch (error) {
            console.error('Network switch failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const walletService = new WalletService();
export default walletService;
