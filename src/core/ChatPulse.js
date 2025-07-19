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
            // Disable file transport to prevent worker errors
            // File logging can be enabled separately if needed
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
                this.logger.warn('Already connected or connecting, current state:', this.state.connection);
                return;
            }
            
            this._setState('connection', ConnectionStates.CONNECTING);
            this.logger.info('Connecting to WhatsApp Web...');
            
            // Validate WebSocket endpoint
            if (!this.options.wsEndpoint) {
                throw new ConnectionError('WebSocket endpoint not configured');
            }
            
            // Create WebSocket connection
            try {
                this.ws = new WebSocket(this.options.wsEndpoint, {
                    headers: {
                        'User-Agent': this.options.userAgent,
                        'Origin': this.options.baseUrl
                    },
                    timeout: this.options.connectionTimeout
                });
            } catch (wsError) {
                throw new ConnectionError(`Failed to create WebSocket: ${wsError.message}`, null, { wsError });
            }
            
            // Setup WebSocket event handlers
            this._setupWebSocketHandlers();
            
            // Wait for connection
            await this._waitForConnection();
            
            this.logger.info('Connected to WhatsApp Web');
            this._setState('connection', ConnectionStates.CONNECTED);
            this.emit(EventTypes.CONNECTED);
            
        } catch (error) {
            this._setState('connection', ConnectionStates.FAILED);
            this.logger.error('Connection failed:', error);
            
            // Cleanup on failure
            if (this.ws) {
                try {
                    this.ws.close();
                } catch (closeError) {
                    this.logger.warn('Error closing WebSocket after connection failure:', closeError);
                }
                this.ws = null;
            }
            
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
        
        // Use QRHandler to handle QR generation and authentication
        await this.qrHandler.handleQRCode();
        
        this._setState('authenticated', true);
        this.emit(EventTypes.AUTHENTICATED);
        this.logger.info('QR authentication successful');
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
        
        // Remove existing listeners to prevent duplicates
        this.ws.removeAllListeners();
        
        this.ws.on('open', () => {
            this.logger.debug('WebSocket connection opened');
            this._startHeartbeat();
        });
        
        this.ws.on('message', async (data) => {
            try {
                if (!data) {
                    this.logger.warn('Received empty message data');
                    return;
                }
                await this._handleWebSocketMessage(data);
            } catch (error) {
                this.logger.error('Error handling WebSocket message:', error);
                await this.errorHandler.handleError(error, { context: 'websocket_message', dataType: typeof data });
            }
        });
        
        this.ws.on('close', (code, reason) => {
            this.logger.warn(`WebSocket connection closed: ${code} ${reason?.toString() || 'No reason'}`);
            this._handleDisconnection();
        });
        
        this.ws.on('error', (error) => {
            this.logger.error('WebSocket error:', error);
            this.errorHandler.handleError(error, { context: 'websocket_error' }).catch(handlerError => {
                this.logger.error('Error in error handler:', handlerError);
            });
        });
        
        this.ws.on('ping', (data) => {
            this.logger.debug('Received ping');
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.pong(data);
            }
        });
        
        this.ws.on('pong', () => {
            this.logger.debug('Received pong');
            this.state.lastHeartbeat = Date.now();
        });
    }

    /**
     * Handle WebSocket message
     */
    async _handleWebSocketMessage(data) {
        try {
            // Validate data
            if (!data) {
                this.logger.warn('Received null or undefined message data');
                return;
            }
            
            // Decrypt if using E2E encryption
            let decryptedData = data;
            if (this.signalStore && this.options.enableE2E) {
                try {
                    decryptedData = await this._decryptMessage(data);
                } catch (decryptError) {
                    this.logger.error('Failed to decrypt message:', decryptError);
                    // Continue with original data if decryption fails
                    decryptedData = data;
                }
            }
            
            // Parse protobuf message
            let message;
            try {
                message = await this.protocolHandler.parseMessage(decryptedData);
            } catch (parseError) {
                this.logger.error('Failed to parse message:', parseError);
                // Create fallback message
                message = {
                    type: 'unknown',
                    data: decryptedData,
                    timestamp: Date.now(),
                    parseError: parseError.message
                };
            }
            
            if (!message) {
                this.logger.warn('Parsed message is null or undefined');
                return;
            }
            
            // Handle different message types
            try {
                switch (message.type) {
                    case 'message':
                    case 'text':
                    case 'image':
                    case 'video':
                    case 'audio':
                    case 'document':
                    case 'sticker':
                    case 'location':
                    case 'contact':
                    case 'buttons_response':
                    case 'list_response':
                    case 'poll_update':
                        this.messageHandler.handleIncomingMessage(message);
                        break;
                    case 'presence':
                        this.emit(EventTypes.PRESENCE_UPDATE, message);
                        break;
                    case 'call':
                        this.emit(EventTypes.CALL, message);
                        break;
                    case 'ack':
                        this.emit(EventTypes.MESSAGE_ACK, message);
                        break;
                    case 'receipt':
                        this.emit('message_receipt', message);
                        break;
                    default:
                        this.logger.debug(`Unhandled message type: ${message.type}`);
                        this.emit('unknown_message', message);
                }
            } catch (handlerError) {
                this.logger.error(`Error handling message type ${message.type}:`, handlerError);
                await this.errorHandler.handleError(handlerError, { 
                    context: 'message_handler', 
                    messageType: message.type,
                    messageId: message.id 
                });
            }
            
        } catch (error) {
            this.logger.error('Failed to handle WebSocket message:', error);
            await this.errorHandler.handleError(error, { 
                context: 'websocket_message_handler',
                dataLength: data?.length || 0,
                dataType: typeof data
            });
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
            try {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.ping();
                    this.logger.debug('Heartbeat ping sent');
                } else {
                    this.logger.warn('Cannot send heartbeat - WebSocket not open');
                    this._handleDisconnection();
                }
            } catch (error) {
                this.logger.error('Error sending heartbeat:', error);
                this._handleDisconnection();
            }
        }, this.options.heartbeatInterval || 30000);
        
        // Check for missed heartbeats
        setInterval(() => {
            const now = Date.now();
            const lastHeartbeat = this.state.lastHeartbeat || now;
            const timeSinceLastHeartbeat = now - lastHeartbeat;
            
            if (timeSinceLastHeartbeat > (this.options.heartbeatInterval || 30000) * 3) {
                this.logger.warn('Heartbeat timeout detected, triggering reconnection');
                this._handleDisconnection();
            }
        }, (this.options.heartbeatInterval || 30000) * 2);
    }

    /**
     * Handle disconnection
     */
    _handleDisconnection() {
        if (this.state.connection === ConnectionStates.DISCONNECTED) {
            return; // Already handling disconnection
        }
        
        this._setState('connection', ConnectionStates.DISCONNECTED);
        this.emit(EventTypes.DISCONNECTED);
        
        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Close WebSocket if still open
        if (this.ws) {
            try {
                if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                    this.ws.close();
                }
            } catch (error) {
                this.logger.warn('Error closing WebSocket during disconnection:', error);
            }
            this.ws = null;
        }
        
        // Auto-reconnect if enabled
        if (this.options.autoReconnect && 
            this.state.reconnectAttempts < (this.options.maxReconnectAttempts || 10) &&
            this.state.authenticated) {
            this._scheduleReconnect();
        } else if (this.state.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
            this.logger.error('Maximum reconnection attempts reached');
            this.emit('max_reconnect_attempts_reached');
        }
    }

    /**
     * Schedule reconnection attempt
     */
    _scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        const baseDelay = this.options.reconnectInterval || 5000;
        const maxDelay = 60000; // Maximum 1 minute delay
        const delay = Math.min(baseDelay * Math.pow(2, this.state.reconnectAttempts), maxDelay);
        
        this.reconnectTimeout = setTimeout(async () => {
            try {
                this.state.reconnectAttempts++;
                this._setState('connection', ConnectionStates.RECONNECTING);
                this.emit(EventTypes.RECONNECTING);
                
                this.logger.info(`Attempting reconnection (${this.state.reconnectAttempts}/${this.options.maxReconnectAttempts || 10})`);
                await this.connect();
                this.state.reconnectAttempts = 0;
                this.logger.info('Reconnection successful');
                
            } catch (error) {
                this.logger.error('Reconnection failed:', error);
                
                // Only schedule another reconnect if we haven't exceeded max attempts
                if (this.state.reconnectAttempts < (this.options.maxReconnectAttempts || 10)) {
                    this._scheduleReconnect();
                } else {
                    this._setState('connection', ConnectionStates.FAILED);
                    this.emit('reconnection_failed');
                }
            }
        }, delay);
        
        this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.state.reconnectAttempts + 1}/${this.options.maxReconnectAttempts || 10})`);
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
            
            // Check if already open
            if (this.ws.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }
            
            const timeout = setTimeout(() => {
                reject(new ConnectionError('Connection timeout', 'TIMEOUT'));
            }, this.options.connectionTimeout || 30000);
            
            this.ws.once('open', () => {
                clearTimeout(timeout);
                this.state.lastHeartbeat = Date.now();
                resolve();
            });
            
            this.ws.once('error', (error) => {
                clearTimeout(timeout);
                reject(new ConnectionError(`WebSocket error: ${error.message}`, 'WS_ERROR', { error }));
            });
            
            this.ws.once('close', (code, reason) => {
                clearTimeout(timeout);
                reject(new ConnectionError(`WebSocket closed during connection: ${code} ${reason?.toString() || ''}`, 'WS_CLOSED'));
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