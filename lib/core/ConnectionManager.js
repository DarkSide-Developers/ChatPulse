/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { Logger } = require('../utils/Logger');

/**
 * Advanced Connection Manager with multiple connection strategies
 * Supports QR code, pairing code, and multi-device authentication
 */
class ConnectionManager {
    /**
     * Initialize ConnectionManager
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('ConnectionManager');
        this.connectionStrategies = new Map();
        this.currentStrategy = null;
        this.connectionState = 'disconnected';
        this.retryAttempts = 0;
        this.maxRetryAttempts = 5;
        
        this._registerConnectionStrategies();
    }

    /**
     * Initialize connection manager
     * @param {Object} options - Connection options
     */
    async initialize(options = {}) {
        this.options = {
            strategy: 'auto', // auto, qr, pairing, multidevice
            timeout: 120000,
            retryDelay: 5000,
            enableFallback: true,
            ...options
        };

        this.logger.info('Connection manager initialized');
    }

    /**
     * Connect using specified strategy
     * @param {string} strategy - Connection strategy
     * @returns {Promise<boolean>} Connection success
     */
    async connect(strategy = this.options.strategy) {
        try {
            this.connectionState = 'connecting';
            this.currentStrategy = strategy;
            
            if (strategy === 'auto') {
                return await this._autoConnect();
            }
            
            const connectionStrategy = this.connectionStrategies.get(strategy);
            if (!connectionStrategy) {
                throw new Error(`Unknown connection strategy: ${strategy}`);
            }
            
            const success = await connectionStrategy.connect();
            
            if (success) {
                this.connectionState = 'connected';
                this.retryAttempts = 0;
                this.client.emit('connection_success', { strategy });
            } else {
                this.connectionState = 'failed';
                if (this.options.enableFallback) {
                    return await this._tryFallbackStrategy();
                }
            }
            
            return success;
            
        } catch (error) {
            this.logger.error('Connection failed:', error);
            this.connectionState = 'failed';
            
            if (this.retryAttempts < this.maxRetryAttempts) {
                this.retryAttempts++;
                this.logger.info(`Retrying connection... (${this.retryAttempts}/${this.maxRetryAttempts})`);
                
                await this._delay(this.options.retryDelay);
                return await this.connect(strategy);
            }
            
            throw error;
        }
    }

    /**
     * Auto-connect using best available strategy
     * @returns {Promise<boolean>} Connection success
     * @private
     */
    async _autoConnect() {
        // Check for existing session
        if (await this.client.sessionManager.sessionExists()) {
            this.logger.info('Existing session found, attempting session restore...');
            
            try {
                const success = await this.connectionStrategies.get('session').connect();
                if (success) return true;
            } catch (error) {
                this.logger.warn('Session restore failed, trying other methods:', error);
            }
        }

        // Try pairing code first (faster than QR)
        if (this.connectionStrategies.has('pairing')) {
            try {
                this.logger.info('Attempting pairing code connection...');
                const success = await this.connectionStrategies.get('pairing').connect();
                if (success) return true;
            } catch (error) {
                this.logger.warn('Pairing code connection failed:', error);
            }
        }

        // Fallback to QR code
        this.logger.info('Falling back to QR code connection...');
        return await this.connectionStrategies.get('qr').connect();
    }

    /**
     * Try fallback connection strategy
     * @returns {Promise<boolean>} Connection success
     * @private
     */
    async _tryFallbackStrategy() {
        const strategies = ['session', 'pairing', 'qr', 'multidevice'];
        
        for (const strategy of strategies) {
            if (strategy === this.currentStrategy) continue;
            if (!this.connectionStrategies.has(strategy)) continue;
            
            try {
                this.logger.info(`Trying fallback strategy: ${strategy}`);
                const success = await this.connectionStrategies.get(strategy).connect();
                if (success) {
                    this.currentStrategy = strategy;
                    return true;
                }
            } catch (error) {
                this.logger.warn(`Fallback strategy ${strategy} failed:`, error);
            }
        }
        
        return false;
    }

    /**
     * Register connection strategies
     * @private
     */
    _registerConnectionStrategies() {
        // QR Code Strategy
        this.connectionStrategies.set('qr', {
            connect: async () => {
                await this.client.page.goto('https://web.whatsapp.com', {
                    waitUntil: 'networkidle2',
                    timeout: this.options.timeout
                });
                
                return await this._waitForQRAuth();
            }
        });

        // Pairing Code Strategy
        this.connectionStrategies.set('pairing', {
            connect: async () => {
                await this.client.page.goto('https://web.whatsapp.com', {
                    waitUntil: 'networkidle2',
                    timeout: this.options.timeout
                });
                
                return await this._waitForPairingAuth();
            }
        });

        // Session Restore Strategy
        this.connectionStrategies.set('session', {
            connect: async () => {
                await this.client.page.goto('https://web.whatsapp.com', {
                    waitUntil: 'networkidle2',
                    timeout: this.options.timeout
                });
                
                return await this._waitForSessionRestore();
            }
        });

        // Multi-Device Strategy
        this.connectionStrategies.set('multidevice', {
            connect: async () => {
                return await this.client.multiDevice.connect();
            }
        });
    }

    /**
     * Wait for QR code authentication
     * @returns {Promise<boolean>} Auth success
     * @private
     */
    async _waitForQRAuth() {
        try {
            // Wait for QR code or main interface
            await this.client.page.waitForSelector('[data-testid="qr-code"], [data-testid="chat-list"]', {
                timeout: this.options.timeout
            });

            const qrElement = await this.client.page.$('[data-testid="qr-code"]');
            
            if (qrElement) {
                this.logger.info('QR code detected, waiting for scan...');
                await this.client.qrHandler.handleQRCode();
                
                // Wait for authentication
                await this.client.page.waitForSelector('[data-testid="chat-list"]', {
                    timeout: this.options.timeout
                });
                
                return true;
            } else {
                this.logger.info('Already authenticated');
                return true;
            }
        } catch (error) {
            this.logger.error('QR authentication failed:', error);
            return false;
        }
    }

    /**
     * Wait for pairing code authentication
     * @returns {Promise<boolean>} Auth success
     * @private
     */
    async _waitForPairingAuth() {
        try {
            // Check if pairing code option is available
            const pairingButton = await this.client.page.$('[data-testid="link-device-phone-number"]');
            
            if (pairingButton) {
                await pairingButton.click();
                
                // Generate pairing code
                const pairingCode = await this._generatePairingCode();
                
                if (pairingCode) {
                    this.client.emit('pairing_code', pairingCode);
                    this.logger.info(`Pairing code: ${pairingCode}`);
                    
                    // Wait for authentication
                    await this.client.page.waitForSelector('[data-testid="chat-list"]', {
                        timeout: this.options.timeout
                    });
                    
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            this.logger.error('Pairing authentication failed:', error);
            return false;
        }
    }

    /**
     * Wait for session restore
     * @returns {Promise<boolean>} Restore success
     * @private
     */
    async _waitForSessionRestore() {
        try {
            // Wait for either login screen or main interface
            await this.client.page.waitForSelector('[data-testid="chat-list"], [data-testid="qr-code"]', {
                timeout: 30000
            });

            const chatList = await this.client.page.$('[data-testid="chat-list"]');
            
            if (chatList) {
                this.logger.info('Session restored successfully');
                return true;
            } else {
                this.logger.info('Session restore failed, authentication required');
                return false;
            }
        } catch (error) {
            this.logger.error('Session restore failed:', error);
            return false;
        }
    }

    /**
     * Generate pairing code
     * @returns {Promise<string|null>} Pairing code
     * @private
     */
    async _generatePairingCode() {
        try {
            const code = await this.client.page.evaluate(() => {
                const codeElement = document.querySelector('[data-testid="pairing-code"]');
                return codeElement ? codeElement.textContent : null;
            });
            
            return code;
        } catch (error) {
            this.logger.error('Failed to generate pairing code:', error);
            return null;
        }
    }

    /**
     * Get connection state
     * @returns {string} Connection state
     */
    getConnectionState() {
        return this.connectionState;
    }

    /**
     * Get current strategy
     * @returns {string} Current strategy
     */
    getCurrentStrategy() {
        return this.currentStrategy;
    }

    /**
     * Disconnect
     */
    async disconnect() {
        this.connectionState = 'disconnected';
        this.currentStrategy = null;
        this.retryAttempts = 0;
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { ConnectionManager };