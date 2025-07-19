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
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');

const { DefaultConfig, mergeConfig, validateConfig } = require('../config/DefaultConfig');
const { MessageHandler } = require('../handlers/MessageHandler');
const { MediaHandler } = require('../handlers/MediaHandler');
const { QRHandler } = require('../handlers/QRHandler');
const { SessionManager } = require('../managers/SessionManager');
const { ErrorHandler } = require('../errors/ErrorHandler');
const { MessageQueue } = require('../services/MessageQueue');
const { RateLimiter } = require('../middleware/RateLimiter');
const { InputValidator } = require('../validators/InputValidator');
const { WhatsAppWebClient } = require('./WhatsAppWebClient');
const { ProtocolHandler } = require('../protocol/ProtocolHandler');
const { AdvancedAuthenticator } = require('../auth/AdvancedAuthenticator');
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
 * Main ChatPulse client class with advanced connection methods
 */
class ChatPulse extends EventEmitter {
    constructor(options = {}) {
        super();
        
        try {
            // Merge and validate configuration
            this.options = mergeConfig(options, process.env.NODE_ENV || 'production');
            validateConfig(this.options);
            
            // Initialize logger
            this.logger = this._initializeLogger();
            
            // Initialize core components
            this._initializeComponents();
            
            // State management
            this.state = {
                connection: ConnectionStates.DISCONNECTED,
                authenticated: false,
                ready: false,
                reconnectAttempts: 0,
                lastHeartbeat: null,
                qrData: null,
                clientInfo: null,
                connectedAt: null,
                authMethod: null
            };
            
            // Connection management
            this.connectionAttempts = 0;
            this.maxConnectionAttempts = this.options.maxReconnectAttempts || 5;
            this.reconnectTimeout = null;
            this.heartbeatInterval = null;
            this.qrRefreshInterval = null;
            
            this._setupEventHandlers();
            
            this.logger.info('ChatPulse initialized successfully', { 
                sessionName: this.options.sessionName,
                authStrategy: this.options.authStrategy,
                version: '2.0.0'
            });
            
        } catch (error) {
            console.error('Failed to initialize ChatPulse:', error);
            throw new ChatPulseError(`Initialization failed: ${error.message}`, ErrorTypes.UNKNOWN_ERROR, null, { error });
        }
    }

    /**
     * Initialize logger with proper configuration
     */
    _initializeLogger() {
        const loggerConfig = {
            name: 'ChatPulse',
            level: this.options.logLevel || 'info',
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label) => ({ level: label.toUpperCase() })
            }
        };

        if (process.env.NODE_ENV !== 'production') {
            try {
                require.resolve('pino-pretty');
                loggerConfig.transport = {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname'
                    }
                };
            } catch (error) {
                // Fallback to basic console logging
            }
        }

        return pino(loggerConfig);
    }

    /**
     * Initialize core components
     */
    _initializeComponents() {
        try {
            this.sessionManager = new SessionManager(this.options.sessionName, this.options.userDataDir);
            this.errorHandler = new ErrorHandler(this);
            this.validator = new InputValidator();
            
            this.rateLimiter = new RateLimiter({
                perMinute: this.options.rateLimitPerMinute || 60,
                perHour: this.options.rateLimitPerHour || 1000,
                perDay: this.options.rateLimitPerDay || 10000
            });
            
            this.messageHandler = new MessageHandler(this);
            this.mediaHandler = new MediaHandler(this);
            this.qrHandler = new QRHandler(this);
            this.messageQueue = new MessageQueue(this);
            
            this.webClient = new WhatsAppWebClient(this.options);
            this.protocolHandler = new ProtocolHandler(this);
            this.authenticator = new AdvancedAuthenticator(this);
            
        } catch (error) {
            throw new ChatPulseError(`Component initialization failed: ${error.message}`, ErrorTypes.UNKNOWN_ERROR, null, { error });
        }
    }

    /**
     * Initialize ChatPulse client
     */
    async initialize() {
        const startTime = Date.now();
        
        try {
            this.logger.info('🚀 Starting ChatPulse initialization...');
            
            // Initialize session manager
            await this.sessionManager.initialize();
            
            // Load protocol definitions
            await this._loadProtocolDefinitions();
            
            // Check for existing session
            const hasSession = await this.sessionManager.sessionExists();
            
            if (hasSession && this.options.restoreSession !== false) {
                this.logger.info('📂 Existing session found, attempting to restore...');
                await this._restoreSession();
            } else {
                this.logger.info('🔐 No existing session, starting authentication...');
                await this._startAuthentication();
            }
            
            const initTime = Date.now() - startTime;
            this.logger.info('✅ ChatPulse initialization completed', { duration: `${initTime}ms` });
            
        } catch (error) {
            const initTime = Date.now() - startTime;
            this.logger.error('❌ Failed to initialize ChatPulse', { 
                error: error.message,
                duration: `${initTime}ms`
            });
            
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
                this.logger.warn(`Already connected or connecting, current state: ${this.state.connection}`);
                return;
            }
            
            this._setState('connection', ConnectionStates.CONNECTING);
            this.logger.info('🔌 Connecting to WhatsApp Web...');
            
            // Initialize WhatsApp Web client
            await this.webClient.initialize();
            
            // Setup event handlers
            this._setupWebClientHandlers();
            
            // Establish connection
            await this._establishConnection();
            
            this.logger.info('✅ Connected to WhatsApp Web successfully');
            this._setState('connection', ConnectionStates.CONNECTED);
            this._setState('connectedAt', Date.now());
            this.emit(EventTypes.CONNECTED);
            
        } catch (error) {
            this._setState('connection', ConnectionStates.FAILED);
            this.logger.error('❌ Connection failed:', error);
            
            await this._handleConnectionError(error);
            throw error;
        }
    }

    /**
     * Disconnect from WhatsApp Web
     */
    async disconnect() {
        try {
            this.logger.info('🔌 Disconnecting from WhatsApp Web...');
            
            this._clearIntervals();
            
            if (this.webClient) {
                await this.webClient.disconnect();
            }
            
            this._setState('connection', ConnectionStates.DISCONNECTED);
            this._setState('authenticated', false);
            this._setState('ready', false);
            this._setState('connectedAt', null);
            
            this.emit(EventTypes.DISCONNECTED);
            this.logger.info('✅ Disconnected from WhatsApp Web');
            
        } catch (error) {
            this.logger.error('❌ Error during disconnect:', error);
            throw error;
        }
    }

    /**
     * Send a text message
     */
    async sendMessage(chatId, message, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedMessage = this.validator.validate(message, 'message', options);
            
            if (!this.isReady) {
                throw new ChatPulseError(
                    'ChatPulse is not ready. Please wait for authentication to complete.',
                    ErrorTypes.CONNECTION_ERROR,
                    'NOT_READY'
                );
            }
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendMessage');
            
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
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready', ErrorTypes.CONNECTION_ERROR, 'NOT_READY');
            }
            
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
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready', ErrorTypes.CONNECTION_ERROR, 'NOT_READY');
            }
            
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
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready', ErrorTypes.CONNECTION_ERROR, 'NOT_READY');
            }
            
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
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready', ErrorTypes.CONNECTION_ERROR, 'NOT_READY');
            }
            
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
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready', ErrorTypes.CONNECTION_ERROR, 'NOT_READY');
            }
            
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
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready', ErrorTypes.CONNECTION_ERROR, 'NOT_READY');
            }
            
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
     * Get connection status
     */
    getConnectionStatus() {
        const uptime = this.state.connectedAt ? Date.now() - this.state.connectedAt : 0;
        
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated,
            ready: this.isReady,
            state: this.state.connection,
            reconnectAttempts: this.state.reconnectAttempts,
            lastHeartbeat: this.state.lastHeartbeat,
            clientInfo: this.state.clientInfo,
            uptime,
            authMethod: this.state.authMethod
        };
    }

    /**
     * Get QR code for authentication
     */
    async getQRCode(format = 'terminal') {
        try {
            if (this.state.authenticated) {
                throw new AuthenticationError('Already authenticated. QR code not needed.');
            }
            
            return await this.qrHandler.getQRCode(format);
            
        } catch (error) {
            this.logger.error('❌ Failed to get QR code:', error);
            throw error;
        }
    }

    /**
     * Authenticate with phone number (Advanced Pairing)
     */
    async authenticateWithPhoneNumber(phoneNumber, options = {}) {
        try {
            this.logger.info('📞 Starting advanced phone number authentication...');
            
            const result = await this.authenticator.authenticateWithPhoneNumber(phoneNumber, options);
            
            this._setState('authMethod', 'phone_number');
            this.logger.info('✅ Phone number authentication initiated');
            
            return result;
            
        } catch (error) {
            this.logger.error('❌ Phone number authentication failed:', error);
            throw error;
        }
    }

    /**
     * Authenticate with email (Advanced Method)
     */
    async authenticateWithEmail(email, options = {}) {
        try {
            this.logger.info('📧 Starting email authentication...');
            
            const result = await this.authenticator.authenticateWithEmail(email, options);
            
            this._setState('authMethod', 'email');
            this.logger.info('✅ Email authentication initiated');
            
            return result;
            
        } catch (error) {
            this.logger.error('❌ Email authentication failed:', error);
            throw error;
        }
    }

    /**
     * Authenticate with backup codes
     */
    async authenticateWithBackupCode(backupCode, options = {}) {
        try {
            this.logger.info('🔑 Starting backup code authentication...');
            
            const result = await this.authenticator.authenticateWithBackupCode(backupCode, options);
            
            this._setState('authMethod', 'backup_code');
            this.logger.info('✅ Backup code authentication successful');
            
            return result;
            
        } catch (error) {
            this.logger.error('❌ Backup code authentication failed:', error);
            throw error;
        }
    }

    /**
     * Multi-device authentication
     */
    async authenticateMultiDevice(deviceInfo, options = {}) {
        try {
            this.logger.info('📱 Starting multi-device authentication...');
            
            const result = await this.authenticator.authenticateMultiDevice(deviceInfo, options);
            
            this._setState('authMethod', 'multi_device');
            this.logger.info('✅ Multi-device authentication successful');
            
            return result;
            
        } catch (error) {
            this.logger.error('❌ Multi-device authentication failed:', error);
            throw error;
        }
    }

    /**
     * Enhanced properties
     */
    get isReady() {
        return this.state.ready && this.state.connection === ConnectionStates.READY;
    }

    get isConnected() {
        return this.state.connection === ConnectionStates.CONNECTED || 
               this.state.connection === ConnectionStates.READY;
    }

    get isAuthenticated() {
        return this.state.authenticated;
    }

    /**
     * Load protocol definitions
     */
    async _loadProtocolDefinitions() {
        try {
            this.logger.debug('📋 Loading protocol definitions...');
            // Protocol definitions loading logic here
            this.logger.debug('✅ Protocol definitions loaded');
        } catch (error) {
            this.logger.warn('⚠️ Failed to load protocol definitions, using defaults');
        }
    }

    /**
     * Start authentication process
     */
    async _startAuthentication() {
        try {
            this.logger.info(`🔐 Starting ${this.options.authStrategy} authentication...`);
            
            switch (this.options.authStrategy) {
                case AuthStrategies.QR:
                    await this._authenticateWithQR();
                    break;
                case AuthStrategies.PAIRING:
                    await this._authenticateWithPairing();
                    break;
                case 'phone_number':
                    await this.authenticateWithPhoneNumber(this.options.phoneNumber);
                    break;
                case 'email':
                    await this.authenticateWithEmail(this.options.email);
                    break;
                case 'multi_device':
                    await this.authenticateMultiDevice(this.options.deviceInfo);
                    break;
                default:
                    throw new AuthenticationError(`Unsupported auth strategy: ${this.options.authStrategy}`);
            }
        } catch (error) {
            throw new AuthenticationError(`Authentication failed: ${error.message}`, null, { error });
        }
    }

    /**
     * QR authentication
     */
    async _authenticateWithQR() {
        try {
            this.logger.info('📱 Starting QR code authentication...');
            
            if (!this.webClient.isConnected) {
                await this.webClient.initialize();
            }
            
            await this._generateAndDisplayQR();
            this._startQRRefreshTimer();
            await this._waitForAuthentication();
            this._clearQRRefreshTimer();
            
            this._setState('authenticated', true);
            this._setState('authMethod', 'qr');
            this.emit(EventTypes.AUTHENTICATED);
            this.logger.info('✅ QR authentication successful!');
            
        } catch (error) {
            this._clearQRRefreshTimer();
            throw new AuthenticationError(`QR authentication failed: ${error.message}`, 'QR_AUTH_FAILED', { error });
        }
    }

    /**
     * Pairing code authentication
     */
    async _authenticateWithPairing() {
        try {
            this.logger.info('📞 Starting pairing code authentication...');
            
            if (!this.options.pairingNumber) {
                throw new AuthenticationError('Pairing number is required for pairing authentication');
            }
            
            if (!this.webClient.isConnected) {
                await this.webClient.initialize();
            }
            
            const pairingCode = await this.webClient.requestPairingCode(this.options.pairingNumber);
            
            this.logger.info(`📱 Pairing Code: ${pairingCode}`);
            console.log(`\n📱 Enter this pairing code in your WhatsApp mobile app: ${pairingCode}\n`);
            
            this.emit(EventTypes.PAIRING_CODE, pairingCode);
            
            await this._waitForAuthentication();
            
            this._setState('authenticated', true);
            this._setState('authMethod', 'pairing');
            this.emit(EventTypes.AUTHENTICATED);
            this.logger.info('✅ Pairing authentication successful!');
            
        } catch (error) {
            throw new AuthenticationError(`Pairing authentication failed: ${error.message}`, 'PAIRING_AUTH_FAILED', { error });
        }
    }

    /**
     * Generate and display QR code
     */
    async _generateAndDisplayQR() {
        try {
            const qrData = await this.webClient.generateQRCode();
            
            if (!qrData) {
                throw new Error('Failed to generate QR code');
            }
            
            this.state.qrData = qrData;
            
            await this.qrHandler.displayQRCode(qrData, {
                terminal: true,
                save: true,
                format: 'png'
            });
            
            this.emit(EventTypes.QR_GENERATED, {
                data: qrData,
                timestamp: Date.now(),
                expires: Date.now() + 30000
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to generate QR code:', error);
            throw error;
        }
    }

    /**
     * Start QR refresh timer
     */
    _startQRRefreshTimer() {
        this._clearQRRefreshTimer();
        
        this.qrRefreshInterval = setInterval(async () => {
            try {
                if (!this.state.authenticated) {
                    this.logger.info('🔄 Refreshing QR code...');
                    await this._generateAndDisplayQR();
                }
            } catch (error) {
                this.logger.error('❌ Failed to refresh QR code:', error);
            }
        }, 30000);
    }

    /**
     * Clear QR refresh timer
     */
    _clearQRRefreshTimer() {
        if (this.qrRefreshInterval) {
            clearInterval(this.qrRefreshInterval);
            this.qrRefreshInterval = null;
        }
    }

    /**
     * Wait for authentication completion
     */
    async _waitForAuthentication() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new AuthenticationError('Authentication timeout', 'AUTH_TIMEOUT'));
            }, this.options.authTimeout || 120000);
            
            const onAuthenticated = () => {
                clearTimeout(timeout);
                this.webClient.removeListener('authenticated', onAuthenticated);
                resolve(true);
            };
            
            this.webClient.on('authenticated', onAuthenticated);
        });
    }

    /**
     * Restore existing session
     */
    async _restoreSession() {
        try {
            this.logger.info('📂 Restoring session...');
            
            const sessionData = await this.sessionManager.loadSessionData('auth');
            if (!sessionData || !sessionData.authenticated) {
                throw new Error('No valid session data found');
            }
            
            await this.webClient.initialize();
            
            const isValid = await this.webClient.validateSession();
            
            if (isValid) {
                this._setState('authenticated', true);
                this._setState('connection', ConnectionStates.READY);
                this._setState('ready', true);
                this._setState('authMethod', sessionData.authMethod || 'session');
                this.emit(EventTypes.READY);
                this.logger.info('✅ Session restored successfully');
                return;
            } else {
                throw new Error('Session is no longer valid');
            }
            
        } catch (error) {
            this.logger.warn('⚠️ Failed to restore session:', error.message);
            await this._startAuthentication();
        }
    }

    /**
     * Establish connection
     */
    async _establishConnection() {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxConnectionAttempts; attempt++) {
            try {
                this.logger.info(`🔄 Connection attempt ${attempt}/${this.maxConnectionAttempts}`);
                
                await this._waitForWebClientReady();
                this._startHeartbeat();
                
                return;
                
            } catch (error) {
                lastError = error;
                this.logger.warn(`⚠️ Connection attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.maxConnectionAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    this.logger.info(`⏳ Retrying in ${delay}ms...`);
                    await this._delay(delay);
                }
            }
        }
        
        throw new ConnectionError(`Failed to establish connection after ${this.maxConnectionAttempts} attempts: ${lastError.message}`);
    }

    /**
     * Wait for web client to be ready
     */
    async _waitForWebClientReady() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Web client ready timeout'));
            }, 30000);
            
            if (this.webClient.isConnected) {
                clearTimeout(timeout);
                resolve();
                return;
            }
            
            const onConnected = () => {
                clearTimeout(timeout);
                this.webClient.removeListener('connected', onConnected);
                resolve();
            };
            
            this.webClient.on('connected', onConnected);
        });
    }

    /**
     * Setup web client event handlers
     */
    _setupWebClientHandlers() {
        this.webClient.on('qr_code', (qrInfo) => {
            this.emit(EventTypes.QR_GENERATED, qrInfo);
        });
        
        this.webClient.on('qr_update', (qrInfo) => {
            this.emit(EventTypes.QR_UPDATED, qrInfo);
        });
        
        this.webClient.on('authenticated', (authData) => {
            this._setState('authenticated', true);
            this.emit(EventTypes.AUTHENTICATED, authData);
        });
        
        this.webClient.on('message', (message) => {
            this.messageHandler.handleIncomingMessage(message);
        });
        
        this.webClient.on('disconnected', () => {
            this._handleDisconnection();
        });
        
        this.webClient.on('error', (error) => {
            this.errorHandler.handleError(error, { context: 'web_client' });
        });
    }

    /**
     * Handle connection errors
     */
    async _handleConnectionError(error) {
        const errorType = this._classifyConnectionError(error);
        
        switch (errorType) {
            case 'NETWORK_ERROR':
                this.logger.warn('🌐 Network error detected, will retry with backoff');
                break;
            case 'AUTH_ERROR':
                this.logger.warn('🔐 Authentication error, clearing session');
                await this.sessionManager.deleteSession();
                break;
            case 'RATE_LIMIT':
                this.logger.warn('⏱️ Rate limit detected, implementing delay');
                break;
            case 'SERVER_ERROR':
                this.logger.warn('🖥️ Server error detected, will retry');
                break;
            default:
                this.logger.error('❌ Unknown connection error:', error);
        }
        
        if (this.options.autoReconnect && this.state.reconnectAttempts < (this.options.maxReconnectAttempts || 10)) {
            this._scheduleReconnect();
        }
    }

    /**
     * Classify connection errors
     */
    _classifyConnectionError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('timeout')) {
            return 'NETWORK_ERROR';
        } else if (message.includes('auth') || message.includes('unauthorized')) {
            return 'AUTH_ERROR';
        } else if (message.includes('rate') || message.includes('limit')) {
            return 'RATE_LIMIT';
        } else if (message.includes('server') || message.includes('503') || message.includes('502')) {
            return 'SERVER_ERROR';
        }
        
        return 'UNKNOWN_ERROR';
    }

    /**
     * Handle disconnection
     */
    _handleDisconnection() {
        if (this.state.connection === ConnectionStates.DISCONNECTED) {
            return;
        }
        
        this.logger.warn('🔌 Connection lost, handling disconnection...');
        
        this._setState('connection', ConnectionStates.DISCONNECTED);
        this._clearIntervals();
        
        this.emit(EventTypes.DISCONNECTED);
        
        if (this.options.autoReconnect && 
            this.state.authenticated &&
            this.state.reconnectAttempts < (this.options.maxReconnectAttempts || 10)) {
            this._scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection
     */
    _scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        const baseDelay = this.options.reconnectInterval || 5000;
        const maxDelay = 60000;
        const delay = Math.min(baseDelay * Math.pow(2, this.state.reconnectAttempts), maxDelay);
        
        this.state.reconnectAttempts++;
        
        this.logger.info(`🔄 Scheduling reconnection in ${delay}ms (attempt ${this.state.reconnectAttempts}/${this.options.maxReconnectAttempts || 10})`);
        
        this.reconnectTimeout = setTimeout(async () => {
            try {
                this._setState('connection', ConnectionStates.RECONNECTING);
                this.emit(EventTypes.RECONNECTING);
                
                await this.connect();
                this.state.reconnectAttempts = 0;
                this.logger.info('✅ Reconnection successful');
                
            } catch (error) {
                this.logger.error('❌ Reconnection failed:', error);
                
                if (this.state.reconnectAttempts < (this.options.maxReconnectAttempts || 10)) {
                    this._scheduleReconnect();
                } else {
                    this._setState('connection', ConnectionStates.FAILED);
                    this.emit('reconnection_failed');
                    this.logger.error('❌ Maximum reconnection attempts reached');
                }
            }
        }, delay);
    }

    /**
     * Start heartbeat mechanism
     */
    _startHeartbeat() {
        this._clearHeartbeat();
        
        this.heartbeatInterval = setInterval(() => {
            try {
                if (this.webClient && this.webClient.isConnected) {
                    this.webClient.ping();
                    this._setState('lastHeartbeat', Date.now());
                    this.logger.debug('💓 Heartbeat sent');
                } else {
                    this.logger.warn('⚠️ Cannot send heartbeat - not connected');
                    this._handleDisconnection();
                }
            } catch (error) {
                this.logger.error('❌ Heartbeat error:', error);
                this._handleDisconnection();
            }
        }, this.options.heartbeatInterval || 30000);
    }

    /**
     * Clear all intervals
     */
    _clearIntervals() {
        this._clearHeartbeat();
        this._clearQRRefreshTimer();
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Clear heartbeat interval
     */
    _clearHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Setup event handlers
     */
    _setupEventHandlers() {
        this.on(EventTypes.AUTHENTICATED, async () => {
            try {
                await this.sessionManager.saveSessionData('auth', {
                    authenticated: true,
                    timestamp: Date.now(),
                    clientInfo: this.state.clientInfo,
                    authMethod: this.state.authMethod
                });
                
                this._setState('ready', true);
                this._setState('connection', ConnectionStates.READY);
                this._setState('connectedAt', Date.now());
                
                this.emit(EventTypes.READY);
                this.logger.info('🎉 ChatPulse is ready!');
                
            } catch (error) {
                this.logger.error('❌ Error after authentication:', error);
            }
        });
        
        this.on('error', (error) => {
            this.logger.error('❌ ChatPulse error:', error);
        });
        
        process.on('SIGINT', () => {
            this.logger.info('🛑 Received SIGINT, gracefully shutting down...');
            this.disconnect().finally(() => process.exit(0));
        });
        
        process.on('SIGTERM', () => {
            this.logger.info('🛑 Received SIGTERM, gracefully shutting down...');
            this.disconnect().finally(() => process.exit(0));
        });
    }

    /**
     * Set state value
     */
    _setState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        if (oldValue !== value) {
            this.logger.debug(`📊 State changed: ${key} = ${value} (was: ${oldValue})`);
        }
    }

    /**
     * Utility delay function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ChatPulse;