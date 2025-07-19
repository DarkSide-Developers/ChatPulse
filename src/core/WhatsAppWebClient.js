/**
 * ChatPulse - Advanced WhatsApp Web Client
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { Logger } = require('../utils/Logger');
const { ConnectionError, AuthenticationError } = require('../errors/ChatPulseError');
const { ConnectionStates, EventTypes } = require('../types');

/**
 * Advanced WhatsApp Web Client using WebSocket and direct API
 */
class WhatsAppWebClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            sessionName: options.sessionName || 'default',
            timeout: options.timeout || 60000,
            maxReconnectAttempts: options.maxReconnectAttempts || 5,
            reconnectInterval: options.reconnectInterval || 5000,
            ...options
        };
        
        this.logger = new Logger('WhatsAppWebClient');
        this.ws = null;
        this.isConnected = false;
        this.isAuthenticated = false;
        this.connectionState = ConnectionStates.DISCONNECTED;
        this.clientId = this._generateClientId();
        this.serverToken = null;
        this.privateKey = null;
        this.publicKey = null;
        this.sharedSecret = null;
        this.reconnectAttempts = 0;
        this.heartbeatInterval = null;
        this.messageQueue = [];
        this.pendingRequests = new Map();
    }

    /**
     * Initialize the WhatsApp Web client
     */
    async initialize() {
        try {
            this.logger.info('🚀 Initializing advanced WhatsApp Web client...');
            
            // Generate cryptographic keys
            await this._generateKeys();
            
            // Connect to WhatsApp Web servers
            await this._connectToWhatsApp();
            
            // Setup message handlers
            this._setupMessageHandlers();
            
            // Start heartbeat
            this._startHeartbeat();
            
            this.isConnected = true;
            this.connectionState = ConnectionStates.CONNECTED;
            this.emit('connected');
            
            this.logger.info('✅ WhatsApp Web client initialized successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize WhatsApp Web client:', error);
            throw new ConnectionError(`WhatsApp Web client initialization failed: ${error.message}`);
        }
    }

    /**
     * Generate cryptographic keys for secure communication
     */
    async _generateKeys() {
        try {
            const keyPair = crypto.generateKeyPairSync('x25519');
            this.privateKey = keyPair.privateKey;
            this.publicKey = keyPair.publicKey;
            
            this.logger.debug('Cryptographic keys generated');
        } catch (error) {
            throw new Error(`Key generation failed: ${error.message}`);
        }
    }

    /**
     * Connect to WhatsApp Web servers using WebSocket
     */
    async _connectToWhatsApp() {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = 'wss://web.whatsapp.com/ws/chat';
                const headers = {
                    'Origin': 'https://web.whatsapp.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                };
                
                this.ws = new WebSocket(wsUrl, { headers });
                
                this.ws.on('open', () => {
                    this.logger.info('🔌 WebSocket connection established');
                    this._sendInitialHandshake();
                    resolve();
                });
                
                this.ws.on('message', (data) => {
                    this._handleMessage(data);
                });
                
                this.ws.on('error', (error) => {
                    this.logger.error('WebSocket error:', error);
                    reject(new ConnectionError(`WebSocket connection failed: ${error.message}`));
                });
                
                this.ws.on('close', (code, reason) => {
                    this.logger.warn('WebSocket connection closed', { code, reason: reason.toString() });
                    this._handleDisconnection();
                });
                
                // Connection timeout
                setTimeout(() => {
                    if (this.ws.readyState !== WebSocket.OPEN) {
                        reject(new ConnectionError('WebSocket connection timeout'));
                    }
                }, this.options.timeout);
                
            } catch (error) {
                reject(new ConnectionError(`Failed to create WebSocket connection: ${error.message}`));
            }
        });
    }

    /**
     * Send initial handshake to WhatsApp servers
     */
    _sendInitialHandshake() {
        const handshakeData = {
            clientToken: this.clientId,
            serverToken: this.serverToken,
            clientStaticPublicKey: this.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
            browserVersion: ['Chrome', '120.0.0.0'],
            binary: 8,
            features: {
                labelsDisplay: true,
                voipIndividualOutgoing: true,
                groupsV3: true,
                groupsV3Create: true,
                changeNumberV2: true,
                queryStatusV3Thumbnail: true,
                liveLocations: true,
                queryVname: true,
                voipIndividualIncoming: true,
                quickRepliesQuery: true,
                payments: true,
                stickerPackQuery: true,
                liveLocationsFinal: true,
                labelsEdit: true,
                mediaUpload: true,
                mediaUploadRichQuickReplies: true,
                vnameCert: true,
                videoPlaybackUrl: true,
                statusRanking: true,
                voipIndividualVideo: true,
                thirdPartyStickers: true,
                frequentlyForwardedSetting: true,
                groupsV4JoinPermission: true,
                recentStickers: true,
                catalog: true,
                starredStickers: true,
                voipGroupCall: true,
                templateMessage: true,
                templateMessageInteractivity: true,
                ephemeralMessages: true,
                e2eNotificationSync: true,
                recentStickersV2: true,
                recentStickersV3: true,
                userNotice: true,
                support: true,
                groupUiiCleanup: true,
                groupDogfoodingInternalOnly: true,
                settingsSync: true,
                archiveV2: true,
                ephemeralAllowGroupMembers: true,
                ephemeral24HDuration: true,
                mdForceUpgrade: true,
                disappearingMode: true,
                externalMdOptInAvailable: true,
                noDeleteMessageTimeLimit: true
            }
        };
        
        this._sendMessage(['admin', 'init', handshakeData]);
        this.logger.debug('Initial handshake sent');
    }

    /**
     * Setup message handlers for different message types
     */
    _setupMessageHandlers() {
        this.messageHandlers = {
            'admin': this._handleAdminMessage.bind(this),
            'Conn': this._handleConnectionMessage.bind(this),
            'Stream': this._handleStreamMessage.bind(this),
            'Props': this._handlePropsMessage.bind(this),
            'Cmd': this._handleCommandMessage.bind(this),
            'Chat': this._handleChatMessage.bind(this),
            'Msg': this._handleIncomingMessage.bind(this),
            'Presence': this._handlePresenceMessage.bind(this),
            'Blocklist': this._handleBlocklistMessage.bind(this)
        };
    }

    /**
     * Handle incoming WebSocket messages
     */
    _handleMessage(data) {
        try {
            let message;
            
            if (Buffer.isBuffer(data)) {
                // Handle binary messages
                message = this._decodeBinaryMessage(data);
            } else {
                // Handle text messages
                message = JSON.parse(data.toString());
            }
            
            if (Array.isArray(message) && message.length > 0) {
                const messageType = message[0];
                const handler = this.messageHandlers[messageType];
                
                if (handler) {
                    handler(message);
                } else {
                    this.logger.debug('Unhandled message type:', messageType);
                }
            }
            
        } catch (error) {
            this.logger.error('Error handling message:', error);
        }
    }

    /**
     * Handle admin messages (authentication, QR codes, etc.)
     */
    _handleAdminMessage(message) {
        const [, action, data] = message;
        
        switch (action) {
            case 'challenge':
                this._handleChallenge(data);
                break;
            case 'conn':
                this._handleConnectionEstablished(data);
                break;
            case 'Cmd':
                this._handleAdminCommand(data);
                break;
            default:
                this.logger.debug('Unhandled admin action:', action);
        }
    }

    /**
     * Handle authentication challenge
     */
    _handleChallenge(challengeData) {
        try {
            const challenge = Buffer.from(challengeData, 'base64');
            const response = this._solveChallenge(challenge);
            
            this._sendMessage(['admin', 'challenge', response.toString('base64')]);
            this.logger.debug('Challenge response sent');
            
        } catch (error) {
            this.logger.error('Error handling challenge:', error);
        }
    }

    /**
     * Solve authentication challenge
     */
    _solveChallenge(challenge) {
        // Implement challenge solving algorithm
        const hmac = crypto.createHmac('sha256', this.privateKey.export({ type: 'pkcs8', format: 'der' }));
        hmac.update(challenge);
        return hmac.digest();
    }

    /**
     * Handle connection established
     */
    _handleConnectionEstablished(data) {
        this.serverToken = data.serverToken;
        this.isAuthenticated = true;
        this.connectionState = ConnectionStates.READY;
        
        this.logger.info('✅ Authentication successful');
        this.emit('authenticated', data);
    }

    /**
     * Generate QR code for authentication
     */
    async generateQRCode() {
        try {
            if (!this.isConnected) {
                throw new Error('Client not connected');
            }
            
            const qrData = this._generateQRData();
            this.emit('qr_code', {
                data: qrData,
                timestamp: Date.now(),
                expires: Date.now() + 30000
            });
            
            return qrData;
            
        } catch (error) {
            throw new AuthenticationError(`QR generation failed: ${error.message}`);
        }
    }

    /**
     * Generate QR code data
     */
    _generateQRData() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(16).toString('hex');
        const publicKeyB64 = this.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
        
        return `2@${timestamp},${random},${publicKeyB64},${this.clientId}`;
    }

    /**
     * Request pairing code for phone number authentication
     */
    async requestPairingCode(phoneNumber) {
        try {
            if (!this.isConnected) {
                throw new Error('Client not connected');
            }
            
            const pairingCode = this._generatePairingCode();
            
            // Send pairing request
            this._sendMessage(['admin', 'pair', {
                phoneNumber: phoneNumber,
                pairingCode: pairingCode,
                clientId: this.clientId
            }]);
            
            this.logger.info('Pairing code requested', { phoneNumber });
            return pairingCode;
            
        } catch (error) {
            throw new AuthenticationError(`Pairing code request failed: ${error.message}`);
        }
    }

    /**
     * Generate pairing code
     */
    _generatePairingCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    /**
     * Send message through WebSocket
     */
    _sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const messageData = JSON.stringify(message);
            this.ws.send(messageData);
        } else {
            this.messageQueue.push(message);
        }
    }

    /**
     * Send text message to chat
     */
    async sendMessage(chatId, text, options = {}) {
        try {
            const messageId = this._generateMessageId();
            const message = {
                key: {
                    remoteJid: chatId,
                    fromMe: true,
                    id: messageId
                },
                message: {
                    conversation: text
                },
                messageTimestamp: Math.floor(Date.now() / 1000),
                status: 1
            };
            
            this._sendMessage(['action', 'relay', [['message', null, message]]]);
            
            return {
                id: messageId,
                timestamp: Date.now(),
                status: 'sent'
            };
            
        } catch (error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    /**
     * Validate session
     */
    async validateSession() {
        try {
            if (!this.isConnected || !this.isAuthenticated) {
                return false;
            }
            
            // Send ping to validate connection
            this._sendMessage(['admin', 'test']);
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 5000);
                
                const handler = (message) => {
                    if (message[0] === 'admin' && message[1] === 'test') {
                        clearTimeout(timeout);
                        this.removeListener('message', handler);
                        resolve(true);
                    }
                };
                
                this.on('message', handler);
            });
            
        } catch (error) {
            return false;
        }
    }

    /**
     * Start heartbeat mechanism
     */
    _startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, 30000);
    }

    /**
     * Handle disconnection
     */
    _handleDisconnection() {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.connectionState = ConnectionStates.DISCONNECTED;
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        this.emit('disconnected');
        
        // Auto-reconnect if enabled
        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this._scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection
     */
    _scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.options.reconnectInterval * this.reconnectAttempts;
        
        setTimeout(async () => {
            try {
                await this.initialize();
                this.reconnectAttempts = 0;
            } catch (error) {
                this.logger.error('Reconnection failed:', error);
            }
        }, delay);
    }

    /**
     * Disconnect from WhatsApp Web
     */
    async disconnect() {
        try {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            
            this.isConnected = false;
            this.isAuthenticated = false;
            this.connectionState = ConnectionStates.DISCONNECTED;
            
            this.logger.info('Disconnected from WhatsApp Web');
            
        } catch (error) {
            this.logger.error('Error during disconnect:', error);
        }
    }

    /**
     * Send ping to server
     */
    ping() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.ping();
        }
    }

    /**
     * Generate unique client ID
     */
    _generateClientId() {
        return crypto.randomBytes(16).toString('base64');
    }

    /**
     * Generate unique message ID
     */
    _generateMessageId() {
        return crypto.randomBytes(10).toString('hex').toUpperCase();
    }

    /**
     * Decode binary message
     */
    _decodeBinaryMessage(data) {
        // Implement binary message decoding
        try {
            return JSON.parse(data.toString());
        } catch (error) {
            return null;
        }
    }

    /**
     * Handle incoming chat message
     */
    _handleIncomingMessage(message) {
        this.emit('message', message);
    }

    /**
     * Handle presence message
     */
    _handlePresenceMessage(message) {
        this.emit('presence_update', message);
    }

    /**
     * Handle connection message
     */
    _handleConnectionMessage(message) {
        this.logger.debug('Connection message received:', message);
    }

    /**
     * Handle stream message
     */
    _handleStreamMessage(message) {
        this.logger.debug('Stream message received:', message);
    }

    /**
     * Handle props message
     */
    _handlePropsMessage(message) {
        this.logger.debug('Props message received:', message);
    }

    /**
     * Handle command message
     */
    _handleCommandMessage(message) {
        this.logger.debug('Command message received:', message);
    }

    /**
     * Handle chat message
     */
    _handleChatMessage(message) {
        this.emit('chat_update', message);
    }

    /**
     * Handle blocklist message
     */
    _handleBlocklistMessage(message) {
        this.emit('blocklist_update', message);
    }

    /**
     * Handle admin command
     */
    _handleAdminCommand(data) {
        this.logger.debug('Admin command received:', data);
    }
}

module.exports = { WhatsAppWebClient };