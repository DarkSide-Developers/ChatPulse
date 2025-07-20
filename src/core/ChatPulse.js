/**
 * ChatPulse - Main Client Class
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const EventEmitter = require('events');
const { DefaultConfig } = require('../config/DefaultConfig');
const { MessageHandler } = require('../handlers/MessageHandler');
const { MediaHandler } = require('../handlers/MediaHandler');
const { QRHandler } = require('../handlers/QRHandler');
const { SessionManager } = require('../managers/SessionManager');
const { ErrorHandler } = require('../errors/ErrorHandler');
const { RateLimiter } = require('../middleware/RateLimiter');
const { InputValidator } = require('../validators/InputValidator');
const { WhatsAppWebClient } = require('./WhatsAppWebClient');
const { AdvancedAuthenticator } = require('../auth/AdvancedAuthenticator');
const { Logger } = require('../utils/Logger');
const { ConnectionStates, EventTypes, AuthStrategies } = require('../types');
const { ChatPulseError, ConnectionError } = require('../errors/ChatPulseError');

class ChatPulse extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = { ...DefaultConfig, ...options };
        this.logger = new Logger('ChatPulse');
        
        // Initialize components
        this.sessionManager = new SessionManager(this.options.sessionName);
        this.errorHandler = new ErrorHandler(this);
        this.validator = new InputValidator();
        this.rateLimiter = new RateLimiter();
        this.messageHandler = new MessageHandler(this);
        this.mediaHandler = new MediaHandler(this);
        this.qrHandler = new QRHandler(this);
        this.webClient = new WhatsAppWebClient(this.options);
        this.authenticator = new AdvancedAuthenticator(this);
        
        // State management
        this.state = {
            connection: ConnectionStates.DISCONNECTED,
            authenticated: false,
            ready: false,
            reconnectAttempts: 0
        };
        
        this._setupEventHandlers();
        this.logger.info('ChatPulse initialized', { sessionName: this.options.sessionName });
    }

    async initialize() {
        try {
            this.logger.info('🚀 Starting ChatPulse initialization...');
            
            await this.sessionManager.initialize();
            
            const hasSession = await this.sessionManager.sessionExists();
            if (hasSession && this.options.restoreSession !== false) {
                this.logger.info('📂 Restoring existing session...');
                await this._restoreSession();
            } else {
                this.logger.info('🔐 Starting authentication...');
                await this._startAuthentication();
            }
            
            this.logger.info('✅ ChatPulse initialization completed');
        } catch (error) {
            this.logger.error('❌ Initialization failed:', error);
            throw error;
        }
    }

    async connect() {
        try {
            if (this.state.connection !== ConnectionStates.DISCONNECTED) {
                this.logger.warn('Already connected or connecting');
                return;
            }
            
            this._setState('connection', ConnectionStates.CONNECTING);
            this.logger.info('🔌 Connecting to WhatsApp Web...');
            
            await this.webClient.initialize();
            this._setupWebClientHandlers();
            
            this._setState('connection', ConnectionStates.CONNECTED);
            this.emit(EventTypes.CONNECTED);
            this.logger.info('✅ Connected successfully');
        } catch (error) {
            this._setState('connection', ConnectionStates.FAILED);
            throw new ConnectionError(`Connection failed: ${error.message}`);
        }
    }

    async disconnect() {
        try {
            this.logger.info('🔌 Disconnecting...');
            
            if (this.webClient) {
                await this.webClient.disconnect();
            }
            
            this._setState('connection', ConnectionStates.DISCONNECTED);
            this._setState('authenticated', false);
            this._setState('ready', false);
            
            this.emit(EventTypes.DISCONNECTED);
            this.logger.info('✅ Disconnected');
        } catch (error) {
            this.logger.error('❌ Disconnect error:', error);
            throw error;
        }
    }

    async sendMessage(chatId, message, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedMessage = this.validator.validate(message, 'message');
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready');
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

    async authenticateWithPhoneNumber(phoneNumber, options = {}) {
        return await this.authenticator.authenticateWithPhoneNumber(phoneNumber, options);
    }

    async authenticateWithEmail(email, options = {}) {
        return await this.authenticator.authenticateWithEmail(email, options);
    }

    async getQRCode(format = 'terminal') {
        return await this.qrHandler.getQRCode(format);
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated,
            ready: this.isReady,
            state: this.state.connection,
            reconnectAttempts: this.state.reconnectAttempts
        };
    }

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

    async _startAuthentication() {
        switch (this.options.authStrategy) {
            case AuthStrategies.QR:
                await this._authenticateWithQR();
                break;
            case AuthStrategies.PAIRING:
                await this._authenticateWithPairing();
                break;
            default:
                throw new Error(`Unsupported auth strategy: ${this.options.authStrategy}`);
        }
    }

    async _authenticateWithQR() {
        this.logger.info('📱 Starting QR authentication...');
        
        if (!this.webClient.isConnected) {
            await this.webClient.initialize();
        }
        
        try {
            const qrData = await this.webClient.generateQRCode();
            const qrResult = await this.qrHandler.displayQRCode(qrData, this.options.qrCodeOptions);
            
            this.emit(EventTypes.QR_GENERATED, { 
                data: qrData, 
                timestamp: Date.now(),
                expires: Date.now() + 30000,
                ...qrResult
            });
        } catch (error) {
            this.logger.error('QR generation failed:', error);
            // Generate a fallback QR for demo
            const fallbackQR = `2@${Date.now()},demo123,mockkey,${Date.now()}`;
            await this.qrHandler.displayQRCode(fallbackQR, this.options.qrCodeOptions);
            
            this.emit(EventTypes.QR_GENERATED, { 
                data: fallbackQR, 
                timestamp: Date.now(),
                expires: Date.now() + 30000,
                fallback: true
            });
        }
        
        await this._waitForAuthentication();
        this._setState('authenticated', true);
        this.emit(EventTypes.AUTHENTICATED);
    }

    async _authenticateWithPairing() {
        this.logger.info('📞 Starting pairing authentication...');
        
        if (!this.options.pairingNumber) {
            throw new Error('Pairing number is required');
        }
        
        const pairingCode = await this.webClient.requestPairingCode(this.options.pairingNumber);
        this.logger.info(`📱 Pairing Code: ${pairingCode}`);
        this.emit(EventTypes.PAIRING_CODE, pairingCode);
        
        await this._waitForAuthentication();
        this._setState('authenticated', true);
        this.emit(EventTypes.AUTHENTICATED);
    }

    async _waitForAuthentication() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Authentication timeout'));
            }, this.options.authTimeout || 120000);
            
            const onAuthenticated = () => {
                clearTimeout(timeout);
                this.webClient.removeListener('authenticated', onAuthenticated);
                resolve();
            };
            
            this.webClient.on('authenticated', onAuthenticated);
        });
    }

    async _restoreSession() {
        try {
            const sessionData = await this.sessionManager.loadSessionData('auth');
            if (sessionData && sessionData.authenticated) {
                if (!this.webClient.isConnected) {
                    await this.webClient.initialize();
                }
                const isValid = await this.webClient.validateSession();
                
                if (isValid) {
                    this._setState('authenticated', true);
                    this._setState('connection', ConnectionStates.READY);
                    this._setState('ready', true);
                    this.emit(EventTypes.READY);
                    return;
                }
            }
            throw new Error('Invalid session');
        } catch (error) {
            this.logger.warn('Session restore failed:', error.message);
            await this._startAuthentication();
        }
    }

    _setupWebClientHandlers() {
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
    }

    _setupEventHandlers() {
        this.on(EventTypes.AUTHENTICATED, async () => {
            await this.sessionManager.saveSessionData('auth', {
                authenticated: true,
                timestamp: Date.now()
            });
            
            this._setState('ready', true);
            this._setState('connection', ConnectionStates.READY);
            this.emit(EventTypes.READY);
        });
        
        process.on('SIGINT', () => {
            this.disconnect().finally(() => process.exit(0));
        });
    }

    _handleDisconnection() {
        if (this.state.connection === ConnectionStates.DISCONNECTED) return;
        
        this.logger.info('🔌 Handling disconnection...');
        this._setState('connection', ConnectionStates.DISCONNECTED);
        this._setState('ready', false);
        this.emit(EventTypes.DISCONNECTED);
        
        if (this.options.autoReconnect && this.state.authenticated) {
            this._scheduleReconnect();
        }
    }

    _scheduleReconnect() {
        if (this.state.reconnectAttempts >= this.options.maxReconnectAttempts) {
            this.logger.error('❌ Maximum reconnection attempts reached');
            this.emit('max_reconnect_attempts_reached');
            return;
        }
        
        const delay = Math.min(5000 * Math.pow(2, this.state.reconnectAttempts), 60000);
        this.state.reconnectAttempts++;
        
        this.logger.info(`🔄 Scheduling reconnection attempt ${this.state.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(async () => {
            try {
                this._setState('connection', ConnectionStates.RECONNECTING);
                this.emit(EventTypes.RECONNECTING);
                await this.initialize();
                this.state.reconnectAttempts = 0;
                this.logger.info('✅ Reconnection successful');
            } catch (error) {
                this.logger.error('❌ Reconnection failed:', error);
                if (this.state.reconnectAttempts < this.options.maxReconnectAttempts) {
                    this._scheduleReconnect();
                } else {
                    this.logger.error('❌ All reconnection attempts failed');
                    this.emit('reconnection_failed');
                }
            }
        }, delay);
    }

    _setState(key, value) {
        this.state[key] = value;
        this.logger.debug(`State changed: ${key} = ${value}`);
    }
}

module.exports = ChatPulse;