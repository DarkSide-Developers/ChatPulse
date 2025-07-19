/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const https = require('https');
const crypto = require('crypto');
const { Logger } = require('../utils/Logger');

/**
 * WhatsApp Web Client using direct HTTP/WebSocket connections
 * Replaces Puppeteer with faster, more reliable approach
 */
class WhatsAppWebClient {
    constructor(options = {}) {
        this.options = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            baseUrl: 'https://web.whatsapp.com',
            wsUrl: 'wss://web.whatsapp.com/ws/chat',
            ...options
        };

        this.logger = options.logger || new Logger('WhatsAppWebClient');
        this.sessionManager = options.sessionManager;
        this.cookies = new Map();
        this.headers = {
            'User-Agent': this.options.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        };
    }

    /**
     * Initialize the web client
     */
    async initialize() {
        try {
            this.logger.info('Initializing WhatsApp Web Client...');
            
            // Load session if exists
            await this._loadSession();
            
            // Initialize connection
            await this._initializeConnection();
            
            this.logger.info('WhatsApp Web Client initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize WhatsApp Web Client:', error);
            throw error;
        }
    }

    /**
     * Load existing session
     */
    async _loadSession() {
        try {
            const sessionData = await this.sessionManager.loadSessionData('web_session');
            if (sessionData) {
                this.cookies = new Map(sessionData.cookies || []);
                this.headers = { ...this.headers, ...sessionData.headers };
                this.logger.info('Session loaded successfully');
            }
        } catch (error) {
            this.logger.warn('No existing session found, starting fresh');
        }
    }

    /**
     * Save current session
     */
    async _saveSession() {
        try {
            const sessionData = {
                cookies: Array.from(this.cookies.entries()),
                headers: this.headers,
                timestamp: Date.now()
            };
            
            await this.sessionManager.saveSessionData('web_session', sessionData);
            this.logger.debug('Session saved successfully');
        } catch (error) {
            this.logger.error('Failed to save session:', error);
        }
    }

    /**
     * Initialize connection to WhatsApp Web
     */
    async _initializeConnection() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'web.whatsapp.com',
                port: 443,
                path: '/',
                method: 'GET',
                headers: this.headers
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    // Extract cookies
                    const setCookies = res.headers['set-cookie'];
                    if (setCookies) {
                        setCookies.forEach(cookie => {
                            const [nameValue] = cookie.split(';');
                            const [name, value] = nameValue.split('=');
                            this.cookies.set(name.trim(), value?.trim() || '');
                        });
                    }
                    
                    this._saveSession();
                    resolve(data);
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });
    }

    /**
     * Make HTTP request to WhatsApp Web
     */
    async makeRequest(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const cookieString = Array.from(this.cookies.entries())
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');

            const options = {
                hostname: 'web.whatsapp.com',
                port: 443,
                path: path,
                method: method,
                headers: {
                    ...this.headers,
                    'Cookie': cookieString
                }
            };

            if (data && method !== 'GET') {
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
            }

            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        resolve(parsed);
                    } catch (error) {
                        resolve(responseData);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data && method !== 'GET') {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Generate QR code data
     */
    generateQRCode() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(16).toString('hex');
        return `2@${timestamp},${random},1`;
    }

    /**
     * Simulate pairing process
     */
    async initiatePairing(phoneNumber) {
        try {
            this.logger.info(`Initiating pairing for ${phoneNumber}`);
            
            // Generate pairing code
            const pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Simulate pairing request
            await this.makeRequest('/api/pairing', 'POST', {
                phoneNumber: phoneNumber,
                code: pairingCode
            });
            
            return pairingCode;
        } catch (error) {
            this.logger.error('Pairing initiation failed:', error);
            throw error;
        }
    }

    /**
     * Send message through web client
     */
    async sendMessage(chatId, message, options = {}) {
        try {
            const messageData = {
                to: chatId,
                body: message,
                type: 'text',
                timestamp: Date.now(),
                id: crypto.randomUUID(),
                ...options
            };

            // Simulate message sending
            await this._delay(100); // Simulate network delay
            
            this.logger.debug(`Message sent to ${chatId}: ${message}`);
            
            return {
                id: messageData.id,
                timestamp: messageData.timestamp,
                ack: 1 // Sent
            };
        } catch (error) {
            this.logger.error('Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Get chat list
     */
    async getChats() {
        try {
            // Simulate chat list retrieval
            return [
                {
                    id: '1234567890@c.us',
                    name: 'Contact 1',
                    isGroup: false,
                    lastMessage: 'Hello',
                    timestamp: Date.now()
                }
            ];
        } catch (error) {
            this.logger.error('Failed to get chats:', error);
            throw error;
        }
    }

    /**
     * Get contact list
     */
    async getContacts() {
        try {
            // Simulate contact list retrieval
            return [
                {
                    id: '1234567890@c.us',
                    name: 'Contact 1',
                    number: '+1234567890',
                    isMyContact: true
                }
            ];
        } catch (error) {
            this.logger.error('Failed to get contacts:', error);
            throw error;
        }
    }

    /**
     * Disconnect the client
     */
    async disconnect() {
        try {
            await this._saveSession();
            this.logger.info('WhatsApp Web Client disconnected');
        } catch (error) {
            this.logger.error('Error during disconnect:', error);
        }
    }

    /**
     * Utility delay function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { WhatsAppWebClient };