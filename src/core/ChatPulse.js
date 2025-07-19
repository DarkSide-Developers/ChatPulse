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
const fetch = require('node-fetch');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
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
const { WhatsAppWebClient } = require('./WhatsAppWebClient');
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
        
        // Merge configuration with enhanced defaults
        this.options = mergeConfig(options, process.env.NODE_ENV || 'production');
        
        // Initialize logger with better formatting
        this.logger = pino({
            name: 'ChatPulse',
            level: this.options.logLevel || 'info',
            transport: process.env.NODE_ENV !== 'production' ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            } : undefined
        });
        
        // Initialize core components
        this.sessionManager = new SessionManager(this.options.sessionName, this.options.userDataDir);
        this.errorHandler = new ErrorHandler(this);
        this.validator = new InputValidator();
        this.rateLimiter = new RateLimiter({
            perMinute: this.options.rateLimitPerMinute || 60,
            perHour: this.options.rateLimitPerHour || 1000,
            perDay: this.options.rateLimitPerDay || 10000
        });
        
        // Initialize handlers
        this.messageHandler = new MessageHandler(this);
        this.mediaHandler = new MediaHandler(this);
        this.qrHandler = new QRHandler(this);
        this.messageQueue = new MessageQueue(this);
        
        // Initialize WhatsApp Web client
        this.webClient = new WhatsAppWebClient(this.options);
        this.protocolHandler = new ProtocolHandler(this);
        
        // State management
        this.state = {
            connection: ConnectionStates.DISCONNECTED,
            authenticated: false,
            ready: false,
            reconnectAttempts: 0,
            lastHeartbeat: null,
            qrData: null,
            clientInfo: null
        };
        
        // Connection management
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
        this.reconnectTimeout = null;
        this.heartbeatInterval = null;
        this.qrRefreshInterval = null;
        
        this._setupEventHandlers();
        this.logger.info('ChatPulse initialized', { 
            sessionName: this.options.sessionName,
            authStrategy: this.options.authStrategy,
            version: '2.0.0'
        });
    }

    /**
     * Initialize ChatPulse client with enhanced error handling
     */
    async initialize() {
        try {
            this.logger.info('🚀 Starting ChatPulse initialization...');
            
            // Validate configuration
            this._validateConfiguration();
            
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
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize ChatPulse:', error);
            await this.errorHandler.handleError(error, { context: 'initialization' });
            throw error;
        }
    }

    /**
     * Connect to WhatsApp Web with advanced connection handling
     */
    async connect() {
        try {
            if (this.state.connection !== ConnectionStates.DISCONNECTED) {
                this.logger.warn(`⚠️ Already connected or connecting, current state: ${this.state.connection}`);
                return;
            }
            
            this._setState('connection', ConnectionStates.CONNECTING);
            this.logger.info('🔌 Connecting to WhatsApp Web...');
            
            // Initialize WhatsApp Web client
            await this.webClient.initialize();
            
            // Setup event handlers for web client
            this._setupWebClientHandlers();
            
            // Start connection process
            await this._establishConnection();
            
            this.logger.info('✅ Connected to WhatsApp Web successfully');
            this._setState('connection', ConnectionStates.CONNECTED);
            this.emit(EventTypes.CONNECTED);
            
        } catch (error) {
            this._setState('connection', ConnectionStates.FAILED);
            this.logger.error('❌ Connection failed:', error);
            
            // Enhanced error handling with specific recovery strategies
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
            
            // Clear all intervals and timeouts
            this._clearIntervals();
            
            // Disconnect web client
            if (this.webClient) {
                await this.webClient.disconnect();
            }
            
            // Update state
            this._setState('connection', ConnectionStates.DISCONNECTED);
            this._setState('authenticated', false);
            this._setState('ready', false);
            
            this.emit(EventTypes.DISCONNECTED);
            this.logger.info('✅ Disconnected from WhatsApp Web');
            
        } catch (error) {
            this.logger.error('❌ Error during disconnect:', error);
            throw error;
        }
    }

    /**
     * Send a text message with enhanced validation
     */
    async sendMessage(chatId, message, options = {}) {
        try {
            // Enhanced validation
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedMessage = this.validator.validate(message, 'message', options);
            
            // Check connection status
            if (!this.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for authentication to complete.');
            }
            
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
     * Send button message with enhanced features
     */
    async sendButtonMessage(chatId, text, buttons, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedText = this.validator.validate(text, 'message');
            const validatedButtons = this.validator.validate(buttons, 'buttons');
            
            if (!this.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for authentication to complete.');
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
     * Get connection status with detailed information
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated,
            ready: this.isReady,
            state: this.state.connection,
            reconnectAttempts: this.state.reconnectAttempts,
            lastHeartbeat: this.state.lastHeartbeat,
            clientInfo: this.state.clientInfo,
            uptime: this.state.connectedAt ? Date.now() - this.state.connectedAt : 0
        };
    }

    /**
     * Get QR code for authentication
     */
    async getQRCode(format = 'terminal') {
        try {
            if (this.state.authenticated) {
                throw new Error('Already authenticated. QR code not needed.');
            }
            
            return await this.qrHandler.getQRCode(format);
            
        } catch (error) {
            this.logger.error('❌ Failed to get QR code:', error);
            throw error;
        }
    }

    /**
     * Force refresh QR code
     */
    async refreshQRCode() {
        try {
            this.logger.info('🔄 Refreshing QR code...');
            
            if (this.webClient && this.webClient.isConnected) {
                await this.webClient.generateQRCode();
            } else {
                throw new Error('Not connected to WhatsApp Web');
            }
            
        } catch (error) {
            this.logger.error('❌ Failed to refresh QR code:', error);
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
     * Validate configuration
     */
    _validateConfiguration() {
        if (!this.options.sessionName) {
            throw new Error('Session name is required');
        }
        
        if (!Object.values(AuthStrategies).includes(this.options.authStrategy)) {
            throw new Error(`Invalid auth strategy: ${this.options.authStrategy}`);
        }
        
        if (this.options.authStrategy === AuthStrategies.PAIRING && !this.options.pairingNumber) {
            throw new Error('Pairing number is required for pairing authentication');
        }
    }

    /**
     * Load protocol definitions
     */
    async _loadProtocolDefinitions() {
        try {
            // Load WhatsApp protocol definitions
            this.logger.debug('📋 Loading protocol definitions...');
            // Protocol definitions would be loaded here
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
                default:
                    throw new AuthenticationError(`Unsupported auth strategy: ${this.options.authStrategy}`);
            }
        } catch (error) {
            throw new AuthenticationError(`Authentication failed: ${error.message}`, null, { error });
        }
    }

    /**
     * Enhanced QR authentication
     */
    async _authenticateWithQR() {
        try {
            this.logger.info('📱 Starting QR code authentication...');
            
            // Connect to WhatsApp Web first
            if (!this.webClient.isConnected) {
                await this.webClient.initialize();
            }
            
            // Generate and display QR code
            await this._generateAndDisplayQR();
            
            // Start QR refresh timer
            this._startQRRefreshTimer();
            
            // Wait for authentication
            await this._waitForAuthentication();
            
            // Clear QR refresh timer
            this._clearQRRefreshTimer();
            
            this._setState('authenticated', true);
            this.emit(EventTypes.AUTHENTICATED);
            this.logger.info('✅ QR authentication successful!');
            
        } catch (error) {
            this._clearQRRefreshTimer();
            throw new AuthenticationError(`QR authentication failed: ${error.message}`, 'QR_AUTH_FAILED', { error });
        }
    }

    /**
     * Generate and display QR code
     */
    async _generateAndDisplayQR() {
        try {
            // Generate QR code from WhatsApp Web
            const qrData = await this.webClient.generateQRCode();
            
            if (!qrData) {
                throw new Error('Failed to generate QR code');
            }
            
            this.state.qrData = qrData;
            
            // Display QR code
            await this.qrHandler.displayQRCode(qrData, {
                terminal: true,
                save: true,
                format: 'png'
            });
            
            this.emit(EventTypes.QR_GENERATED, {
                data: qrData,
                timestamp: Date.now(),
                expires: Date.now() + 30000 // 30 seconds
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
        }, 30000); // Refresh every 30 seconds
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
            
            // Listen for authentication success
            const onAuthenticated = () => {
                clearTimeout(timeout);
                this.webClient.removeListener('authenticated', onAuthenticated);
                resolve(true);
            };
            
            this.webClient.on('authenticated', onAuthenticated);
        });
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
            
            // Connect to WhatsApp Web
            if (!this.webClient.isConnected) {
                await this.webClient.initialize();
            }
            
            // Request pairing code
            const pairingCode = await this.webClient.requestPairingCode(this.options.pairingNumber);
            
            this.logger.info(`📱 Pairing Code: ${pairingCode}`);
            console.log(`\n📱 Enter this pairing code in your WhatsApp mobile app: ${pairingCode}\n`);
            
            this.emit(EventTypes.PAIRING_CODE, pairingCode);
            
            // Wait for authentication
            await this._waitForAuthentication();
            
            this._setState('authenticated', true);
            this.emit(EventTypes.AUTHENTICATED);
            this.logger.info('✅ Pairing authentication successful!');
            
        } catch (error) {
            throw new AuthenticationError(`Pairing authentication failed: ${error.message}`, 'PAIRING_AUTH_FAILED', { error });
        }
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
            
            // Try to restore connection
            await this.webClient.initialize();
            
            // Validate session is still active
            const isValid = await this.webClient.validateSession();
            
            if (isValid) {
                this._setState('authenticated', true);
                this._setState('connection', ConnectionStates.READY);
                this._setState('ready', true);
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
     * Establish connection with retry logic
     */
    async _establishConnection() {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxConnectionAttempts; attempt++) {
            try {
                this.logger.info(`🔄 Connection attempt ${attempt}/${this.maxConnectionAttempts}`);
                
                // Wait for web client to be ready
                await this._waitForWebClientReady();
                
                // Start heartbeat
                this._startHeartbeat();
                
                return; // Success
                
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
     * Handle connection errors with specific recovery strategies
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
        
        // Schedule reconnection if auto-reconnect is enabled
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
     * Handle disconnection with enhanced recovery
     */
    _handleDisconnection() {
        if (this.state.connection === ConnectionStates.DISCONNECTED) {
            return; // Already handling disconnection
        }
        
        this.logger.warn('🔌 Connection lost, handling disconnection...');
        
        this._setState('connection', ConnectionStates.DISCONNECTED);
        this._clearIntervals();
        
        this.emit(EventTypes.DISCONNECTED);
        
        // Auto-reconnect if enabled and authenticated
        if (this.options.autoReconnect && 
            this.state.authenticated &&
            this.state.reconnectAttempts < (this.options.maxReconnectAttempts || 10)) {
            this._scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    _scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        const baseDelay = this.options.reconnectInterval || 5000;
        const maxDelay = 60000; // Maximum 1 minute delay
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
     * Clear all intervals and timeouts
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
        // Handle authentication completion
        this.on(EventTypes.AUTHENTICATED, async () => {
            try {
                // Save session data
                await this.sessionManager.saveSessionData('auth', {
                    authenticated: true,
                    timestamp: Date.now(),
                    clientInfo: this.state.clientInfo
                });
                
                // Mark as ready
                this._setState('ready', true);
                this._setState('connection', ConnectionStates.READY);
                this._setState('connectedAt', Date.now());
                
                this.emit(EventTypes.READY);
                this.logger.info('🎉 ChatPulse is ready!');
                
            } catch (error) {
                this.logger.error('❌ Error after authentication:', error);
            }
        });
        
        // Handle errors
        this.on('error', (error) => {
            this.logger.error('❌ ChatPulse error:', error);
        });
        
        // Handle process termination
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
     * Set state value with logging
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