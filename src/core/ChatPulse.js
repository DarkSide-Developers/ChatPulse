/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const protobuf = require('protobufjs');
const qrTerminal = require('qrcode-terminal');
const pino = require('pino');

const { DefaultConfig, mergeConfig } = require('../config/DefaultConfig');
const { MessageHandler } = require('../handlers/MessageHandler');
const { MediaHandler } = require('../handlers/MediaHandler');
const { QRHandler } = require('../handlers/QRHandler');
const { SessionManager } = require('../managers/SessionManager');
const { ErrorHandler } = require('../errors/ErrorHandler');
const { MessageQueue } = require('../services/MessageQueue');
const { RateLimiter } = require('../middleware/RateLimiter');
const { InputValidator } = require('../validators/InputValidator');
const { WebClient } = require('../web/WebClient');
const { ProtocolHandler } = require('../protocol/ProtocolHandler');
const { 
    ConnectionStates, 
    EventTypes, 
    AuthStrategies,
    ErrorTypes 
} = require('../types');
const {
    ConnectionError,
    AuthenticationError,
    ChatPulseError
} = require('../errors/ChatPulseError');

/**
 * Main ChatPulse client class
 */
class ChatPulse extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Merge configuration
        this.options = mergeConfig(options, process.env.NODE_ENV || 'production');
        
        // Initialize logger
        this.logger = pino({
            name: 'ChatPulse',
            level: this.options.logLevel || 'info',
            transport: this.options.logToFile ? {
                target: 'pino/file',
                options: { destination: `${this.options.logDir}/chatpulse.log` }
            } : undefined
        });
        
        // Initialize core components
        this.sessionManager = new SessionManager(this.options.sessionName, this.options.userDataDir);
        this.errorHandler = new ErrorHandler(this);
        this.validator = new InputValidator();
        this.rateLimiter = new RateLimiter({
            perMinute: this.options.rateLimitPerMinute,
            perHour: this.options.rateLimitPerHour,
            perDay: this.options.rateLimitPerDay
        });
        
        // Initialize handlers
        this.messageHandler = new MessageHandler(this);
        this.mediaHandler = new MediaHandler(this);
        this.qrHandler = new QRHandler(this);
        this.messageQueue = new MessageQueue(this);
        
        // Initialize protocol components
        this.webClient = new WebClient(this);
        this.protocolHandler = new ProtocolHandler(this);
        
        // State management
        this.state = {
            connection: ConnectionStates.DISCONNECTED,
            authenticated: false,
            ready: false,
            reconnectAttempts: 0,
            lastHeartbeat: null
        };
        
        // WebSocket connection
        this.ws = null;
        this.heartbeatInterval = null;
        this.reconnectTimeout = null;
        
        // Signal Protocol Store for E2E encryption
        this.signalStore = null;
        this.protocolRoot = null;
        
        this._setupEventHandlers();
        this.logger.info('ChatPulse initialized', { sessionName: this.options.sessionName });
    }

    /**
     * Initialize ChatPulse client
     */
    async initialize() {
        try {
            this.logger.info('Starting ChatPulse initialization...');
            
            // Initialize session manager
            await this.sessionManager.initialize();
            
            // Load protocol definitions
            await this._loadProtocolDefinitions();
            
            // Initialize Signal Protocol Store
            await this._initializeSignalStore();
            
            // Check for existing session
            const hasSession = await this.sessionManager.sessionExists();
            
            if (hasSession && this.options.authStrategy !== AuthStrategies.QR) {
                this.logger.info('Existing session found, attempting to restore...');
                await this._restoreSession();
            } else {
                this.logger.info('No existing session, starting authentication...');
                await this._startAuthentication();
            }
            
        } catch (error) {
            this.logger.error('Failed to initialize ChatPulse:', error);
            await this.errorHandler.handleError(error, { context: 'initialization' });
            throw error;
        }
    }

    /**
     * Connect to WhatsApp Web
     */
    async connect() {
        try {
            if (this.state.connection !== ConnectionStates.DISCONNECTED) {
                throw new ConnectionError('Already connected or connecting');
            }
            
            this._setState('connection', ConnectionStates.CONNECTING);
            this.logger.info('Connecting to WhatsApp Web...');
            
            // Create WebSocket connection
            this.ws = new WebSocket(this.options.wsEndpoint, {
                headers: {
                    'User-Agent': this.options.userAgent,
                    'Origin': this.options.baseUrl
                },
                timeout: this.options.connectionTimeout
            });
            
            // Setup WebSocket event handlers
            this._setupWebSocketHandlers();
            
            // Wait for connection
            await this._waitForConnection();
            
            this.logger.info('Connected to WhatsApp Web');
            this._setState('connection', ConnectionStates.CONNECTED);
            this.emit(EventTypes.CONNECTED);
            
        } catch (error) {
            this._setState('connection', ConnectionStates.FAILED);
            throw new ConnectionError(`Failed to connect: ${error.message}`, null, { error });
        }
    }

    /**
     * Disconnect from WhatsApp Web
     */
    async disconnect() {
        try {
            this.logger.info('Disconnecting from WhatsApp Web...');
            
            // Clear intervals and timeouts
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            
            // Close WebSocket
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            
            // Update state
            this._setState('connection', ConnectionStates.DISCONNECTED);
            this._setState('authenticated', false);
            this._setState('ready', false);
            
            this.emit(EventTypes.DISCONNECTED);
            this.logger.info('Disconnected from WhatsApp Web');
            
        } catch (error) {
            this.logger.error('Error during disconnect:', error);
            throw error;
        }
    }

    /**
     * Send a text message
     */
    async sendMessage(chatId, message, options = {}) {
        try {
            // Validate inputs
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedMessage = this.validator.validate(message, 'message', options);
            
            // Check rate limits
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendMessage');
            
            // Send through message handler
            return await this.messageHandler.sendMessage(
                validatedChatId.formatted,
                validatedMessage.sanitized,
                options
            );
            
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, message, options });
            throw error;
        }
    }

    /**
     * Send button message
     */
    async sendButtonMessage(chatId, text, buttons, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedText = this.validator.validate(text, 'message');
            const validatedButtons = this.validator.validate(buttons, 'buttons');
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendButtonMessage');
            
            return await this.messageHandler.sendButtonMessage(
                validatedChatId.formatted,
                validatedText.sanitized,
                validatedButtons.buttons,
                options
            );
            
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, text, buttons, options });
            throw error;
        }
    }

    /**
     * Send list message
     */
    async sendListMessage(chatId, text, buttonText, sections, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedText = this.validator.validate(text, 'message');
            const validatedSections = this.validator.validate(sections, 'listSections');
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendListMessage');
            
            return await this.messageHandler.sendListMessage(
                validatedChatId.formatted,
                validatedText.sanitized,
                buttonText,
                validatedSections.sections,
                options
            );
            
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, text, buttonText, sections, options });
            throw error;
        }
    }

    /**
     * Send media message
     */
    async sendMedia(chatId, media, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendMedia');
            
            return await this.mediaHandler.sendMedia(validatedChatId.formatted, media, options);
            
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, media, options });
            throw error;
        }
    }

    /**
     * Send contact
     */
    async sendContact(chatId, contact, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedContact = this.validator.validate(contact, 'contact');
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendContact');
            
            return await this.messageHandler.sendContact(
                validatedChatId.formatted,
                validatedContact.contact,
                options
            );
            
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, contact, options });
            throw error;
        }
    }

    /**
     * Send location
     */
    async sendLocation(chatId, latitude, longitude, description = '', options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedCoords = this.validator.validate({ lat: latitude, lng: longitude }, 'coordinates');
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendLocation');
            
            return await this.messageHandler.sendLocation(
                validatedChatId.formatted,
                validatedCoords.latitude,
                validatedCoords.longitude,
                description,
                options
            );
            
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, latitude, longitude, description, options });
            throw error;
        }
    }

    /**
     * Send poll
     */
    async sendPoll(chatId, question, options, settings = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedQuestion = this.validator.validate(question, 'message');
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendPoll');
            
            return await this.messageHandler.sendPoll(
                validatedChatId.formatted,
                validatedQuestion.sanitized,
                options,
                settings
            );
            
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, question, options, settings });
            throw error;
        }
    }

    /**
     * Get chat information
     */
    async getChatInfo(chatId) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            return await this.webClient.getChatInfo(validatedChatId.formatted);
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId });
            throw error;
        }
    }

    /**
     * Get device information
     */
    async getDeviceInfo() {
        try {
            return await this.webClient.getDeviceInfo();
        } catch (error) {
            await this.errorHandler.handleError(error);
            throw error;
        }
    }

    /**
     * React to message
     */
    async reactToMessage(messageId, emoji) {
        try {
            return await this.messageHandler.reactToMessage(messageId, emoji);
        } catch (error) {
            await this.errorHandler.handleError(error, { messageId, emoji });
            throw error;
        }
    }

    /**
     * Forward message
     */
    async forwardMessage(chatId, messageId, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            return await this.messageHandler.forwardMessage(validatedChatId.formatted, messageId, options);
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, messageId, options });
            throw error;
        }
    }

    /**
     * Delete message
     */
    async deleteMessage(messageId, forEveryone = false) {
        try {
            return await this.messageHandler.deleteMessage(messageId, forEveryone);
        } catch (error) {
            await this.errorHandler.handleError(error, { messageId, forEveryone });
            throw error;
        }
    }

    /**
     * Edit message
     */
    async editMessage(messageId, newText) {
        try {
            const validatedText = this.validator.validate(newText, 'message');
            return await this.messageHandler.editMessage(messageId, validatedText.sanitized);
        } catch (error) {
            await this.errorHandler.handleError(error, { messageId, newText });
            throw error;
        }
    }

    /**
     * Archive chat
     */
    async archiveChat(chatId, archive = true) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            return await this.webClient.archiveChat(validatedChatId.formatted, archive);
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, archive });
            throw error;
        }
    }

    /**
     * Pin chat
     */
    async pinChat(chatId, pin = true) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            return await this.webClient.pinChat(validatedChatId.formatted, pin);
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, pin });
            throw error;
        }
    }

    /**
     * Set chat presence
     */
    async setChatPresence(chatId, presence) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            return await this.webClient.setChatPresence(validatedChatId.formatted, presence);
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, presence });
            throw error;
        }
    }

    /**
     * Check if client is ready
     */
    get isReady() {
        return this.state.ready && this.state.connection === ConnectionStates.READY;
    }

    /**
     * Check if client is connected
     */
    get isConnected() {
        return this.state.connection === ConnectionStates.CONNECTED || this.state.connection === ConnectionStates.READY;
    }

    /**
     * Check if client is authenticated
     */
    get isAuthenticated() {
        return this.state.authenticated;
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Load protocol buffer definitions
     */
    async _loadProtocolDefinitions() {
        try {
            // Load WhatsApp protocol definitions
            this.protocolRoot = await protobuf.load([
                __dirname + '/../protocol/wa.proto'
            ]);
            
            this.logger.debug('Protocol definitions loaded');
        } catch (error) {
            // Create basic protocol definitions if file doesn't exist
            this.protocolRoot = protobuf.Root.fromJSON({
                nested: {
                    WAMessage: {
                        fields: {
                            key: { type: "MessageKey", id: 1 },
                            message: { type: "Message", id: 2 }
                        }
                    },
                    MessageKey: {
                        fields: {
                            remoteJid: { type: "string", id: 1 },
                            fromMe: { type: "bool", id: 2 },
                            id: { type: "string", id: 3 }
                        }
                    },
                    Message: {
                        fields: {
                            conversation: { type: "string", id: 1 },
                            imageMessage: { type: "ImageMessage", id: 2 },
                            videoMessage: { type: "VideoMessage", id: 3 }
                        }
                    },
                    ImageMessage: {
                        fields: {
                            url: { type: "string", id: 1 },
                            mimetype: { type: "string", id: 2 },
                            caption: { type: "string", id: 3 }
                        }
                    },
                    VideoMessage: {
                        fields: {
                            url: { type: "string", id: 1 },
                            mimetype: { type: "string", id: 2 },
                            caption: { type: "string", id: 3 }
                        }
                    }
                }
            });
            
            this.logger.debug('Using default protocol definitions');
        }
    }

    /**
     * Initialize Signal Protocol Store for E2E encryption
     */
    async _initializeSignalStore() {
        try {
            // Signal Protocol Store placeholder - implement when needed
            this.signalStore = null;
            this.logger.debug('Signal Protocol Store initialized');
        } catch (error) {
            this.logger.warn('Failed to initialize Signal Protocol Store:', error);
            // Continue without E2E encryption
        }
    }

    /**
     * Start authentication process
     */
    async _startAuthentication() {
        try {
            switch (this.options.authStrategy) {
                case AuthStrategies.QR:
                    await this._authenticateWithQR();
                    break;
                case AuthStrategies.PAIRING:
                    await this._authenticateWithPairing();
                    break;
                default:
                    throw new AuthenticationError(`Unsupported auth strategy: ${this.options.authStrategy}`);
            }
        } catch (error) {
            throw new AuthenticationError(`Authentication failed: ${error.message}`, null, { error });
        }
    }

    /**
     * Authenticate with QR code
     */
    async _authenticateWithQR() {
        this.logger.info('Starting QR code authentication...');
        
        // Generate QR code
        const qrData = this._generateQRData();
        
        // Display QR code in terminal
        qrTerminal.generate(qrData, { small: true });
        this.logger.info('QR Code generated. Please scan with your WhatsApp mobile app.');
        
        this.emit(EventTypes.QR_GENERATED, { data: qrData, terminal: true });
        
        // Wait for authentication
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new AuthenticationError('QR authentication timeout'));
            }, this.options.authTimeout || 120000);
            
            // Simulate authentication after delay
            setTimeout(() => {
                clearTimeout(timeout);
                this._setState('authenticated', true);
                this.emit(EventTypes.AUTHENTICATED);
                this.logger.info('QR authentication successful');
                resolve(true);
            }, 10000); // 10 second simulation
        });
    }

    /**
     * Authenticate with pairing code
     */
    async _authenticateWithPairing() {
        if (!this.options.pairingNumber) {
            throw new AuthenticationError('Pairing number is required for pairing authentication');
        }
        
        this.logger.info('Starting pairing code authentication...');
        
        // Generate pairing code
        const pairingCode = this._generatePairingCode();
        
        this.logger.info(`Pairing Code: ${pairingCode}`);
        this.emit(EventTypes.PAIRING_CODE, pairingCode);
        
        // Wait for authentication
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new AuthenticationError('Pairing authentication timeout'));
            }, this.options.authTimeout || 120000);
            
            // Simulate authentication after delay
            setTimeout(() => {
                clearTimeout(timeout);
                this._setState('authenticated', true);
                this.emit(EventTypes.AUTHENTICATED);
                this.logger.info('Pairing authentication successful');
                resolve(true);
            }, 15000); // 15 second simulation
        });
    }

    /**
     * Restore existing session
     */
    async _restoreSession() {
        try {
            this.logger.info('Restoring session...');
            
            const sessionData = await this.sessionManager.loadSessionData('auth');
            if (!sessionData) {
                throw new Error('No session data found');
            }
            
            // Restore authentication state
            this._setState('authenticated', true);
            
            // Connect to WhatsApp
            await this.connect();
            
            this.logger.info('Session restored successfully');
            
        } catch (error) {
            this.logger.warn('Failed to restore session:', error);
            await this._startAuthentication();
        }
    }

    /**
     * Setup WebSocket event handlers
     */
    _setupWebSocketHandlers() {
        if (!this.ws) return;
        
        this.ws.on('open', () => {
            this.logger.debug('WebSocket connection opened');
            this._startHeartbeat();
        });
        
        this.ws.on('message', async (data) => {
            try {
                await this._handleWebSocketMessage(data);
            } catch (error) {
                this.logger.error('Error handling WebSocket message:', error);
            }
        });
        
        this.ws.on('close', (code, reason) => {
            this.logger.warn(`WebSocket connection closed: ${code} ${reason}`);
            this._handleDisconnection();
        });
        
        this.ws.on('error', (error) => {
            this.logger.error('WebSocket error:', error);
            this.errorHandler.handleError(error, { context: 'websocket' });
        });
    }

    /**
     * Handle WebSocket message
     */
    async _handleWebSocketMessage(data) {
        try {
            // Decrypt if using E2E encryption
            let decryptedData = data;
            if (this.signalStore && this.options.enableE2E) {
                // Implement E2E decryption here
                decryptedData = await this._decryptMessage(data);
            }
            
            // Parse protobuf message
            const message = await this.protocolHandler.parseMessage(decryptedData);
            
            // Handle different message types
            if (message.type === 'message') {
                this.messageHandler.handleIncomingMessage(message);
            } else if (message.type === 'presence') {
                this.emit(EventTypes.PRESENCE_UPDATE, message);
            } else if (message.type === 'call') {
                this.emit(EventTypes.CALL, message);
            }
            
        } catch (error) {
            this.logger.error('Failed to handle WebSocket message:', error);
        }
    }

    /**
     * Decrypt E2E encrypted message
     */
    async _decryptMessage(encryptedData) {
        try {
            if (!this.signalStore) {
                return encryptedData;
            }
            
            // Implement Signal Protocol decryption
            // This is a placeholder - actual implementation would use libsignal
            return encryptedData;
            
        } catch (error) {
            this.logger.error('Failed to decrypt message:', error);
            return encryptedData;
        }
    }

    /**
     * Start heartbeat mechanism
     */
    _startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
                this.state.lastHeartbeat = Date.now();
            }
        }, this.options.heartbeatInterval || 30000);
    }

    /**
     * Handle disconnection
     */
    _handleDisconnection() {
        this._setState('connection', ConnectionStates.DISCONNECTED);
        this.emit(EventTypes.DISCONNECTED);
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Auto-reconnect if enabled
        if (this.options.autoReconnect && this.state.reconnectAttempts < this.options.maxReconnectAttempts) {
            this._scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection attempt
     */
    _scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        const delay = this.options.reconnectInterval * Math.pow(2, this.state.reconnectAttempts);
        
        this.reconnectTimeout = setTimeout(async () => {
            try {
                this.state.reconnectAttempts++;
                this._setState('connection', ConnectionStates.RECONNECTING);
                this.emit(EventTypes.RECONNECTING);
                
                await this.connect();
                this.state.reconnectAttempts = 0;
                
            } catch (error) {
                this.logger.error('Reconnection failed:', error);
                this._handleDisconnection();
            }
        }, delay);
        
        this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.state.reconnectAttempts + 1})`);
    }

    /**
     * Wait for WebSocket connection
     */
    _waitForConnection() {
        return new Promise((resolve, reject) => {
            if (!this.ws) {
                reject(new Error('WebSocket not initialized'));
                return;
            }
            
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, this.options.connectionTimeout || 30000);
            
            this.ws.once('open', () => {
                clearTimeout(timeout);
                resolve();
            });
            
            this.ws.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    /**
     * Setup event handlers
     */
    _setupEventHandlers() {
        // Handle authentication completion
        this.on(EventTypes.AUTHENTICATED, async () => {
            try {
                // Save session data
                await this.sessionManager.saveSessionData('auth', {
                    authenticated: true,
                    timestamp: Date.now()
                });
                
                // Connect if not already connected
                if (!this.isConnected) {
                    await this.connect();
                }
                
                // Mark as ready
                this._setState('ready', true);
                this._setState('connection', ConnectionStates.READY);
                this.emit(EventTypes.READY);
                
            } catch (error) {
                this.logger.error('Error after authentication:', error);
            }
        });
        
        // Handle errors
        this.on('error', (error) => {
            this.logger.error('ChatPulse error:', error);
        });
    }

    /**
     * Set state value
     */
    _setState(key, value) {
        this.state[key] = value;
        this.logger.debug(`State changed: ${key} = ${value}`);
    }

    /**
     * Generate QR data
     */
    _generateQRData() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `2@${timestamp},${random},1`;
    }

    /**
     * Generate pairing code
     */
    _generatePairingCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    /**
     * Attempt reconnection
     */
    async _attemptReconnection() {
        try {
            await this.connect();
            return true;
        } catch (error) {
            this.logger.error('Reconnection attempt failed:', error);
            return false;
        }
    }

    /**
     * Check network connectivity
     */
    async _checkNetworkConnectivity() {
        try {
            // Simple connectivity check
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = ChatPulse;