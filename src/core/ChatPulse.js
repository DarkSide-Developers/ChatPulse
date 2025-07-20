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
        this.logger.info(`🤖 ChatPulse initialized (${this.options.sessionName})`);
    }

    async initialize() {
        try {
            console.log('🚀 Starting ChatPulse...');
            
            await this.sessionManager.initialize();
            
            const hasSession = await this.sessionManager.sessionExists();
            if (hasSession && this.options.restoreSession !== false) {
                console.log('📂 Restoring session...');
                await this._restoreSession();
            } else {
                console.log('🔐 Starting authentication...');
                await this._startAuthentication();
            }
            
            console.log('✅ ChatPulse ready!');
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
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

    async sendButtonMessage(chatId, text, buttons, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedButtons = this.validator.validate(buttons, 'buttons');
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready');
            }
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendButtonMessage');
            
            return await this.messageHandler.sendButtonMessage(
                validatedChatId.formatted,
                text,
                validatedButtons.buttons,
                options
            );
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, text, buttons, options });
            throw error;
        }
    }

    async sendListMessage(chatId, text, buttonText, sections, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedSections = this.validator.validate(sections, 'listSections');
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready');
            }
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendListMessage');
            
            return await this.messageHandler.sendListMessage(
                validatedChatId.formatted,
                text,
                buttonText,
                validatedSections.sections,
                options
            );
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, text, buttonText, sections, options });
            throw error;
        }
    }

    async sendContact(chatId, contact, options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedContact = this.validator.validate(contact, 'contact');
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready');
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

    async sendLocation(chatId, latitude, longitude, description = '', options = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            const validatedCoords = this.validator.validate({ lat: latitude, lng: longitude }, 'coordinates');
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready');
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

    async sendPoll(chatId, question, options, settings = {}) {
        try {
            const validatedChatId = this.validator.validate(chatId, 'chatId');
            
            if (!this.isReady) {
                throw new ChatPulseError('ChatPulse is not ready');
            }
            
            this.rateLimiter.checkLimit(validatedChatId.formatted, 'sendPoll');
            
            return await this.messageHandler.sendPoll(
                validatedChatId.formatted,
                question,
                options,
                settings
            );
        } catch (error) {
            await this.errorHandler.handleError(error, { chatId, question, options, settings });
            throw error;
        }
    }
    async authenticateWithPhoneNumber(phoneNumber, options = {}) {
        try {
            return await this.webClient.requestPairingCode(phoneNumber);
        } catch (error) {
            await this.errorHandler.handleError(error, { phoneNumber, options });
            throw error;
        }
    }

    async authenticateWithEmail(email, options = {}) {
        return await this.authenticator.authenticateWithEmail(email, options);
    }

    async getQRCode(format = 'terminal') {
        try {
            return await this.qrHandler.getQRCode(format);
        } catch (error) {
            await this.errorHandler.handleError(error, { format });
            throw error;
        }
    }

    async requestPairingCode(phoneNumber) {
        try {
            return await this.webClient.requestPairingCode(phoneNumber);
        } catch (error) {
            await this.errorHandler.handleError(error, { phoneNumber });
            throw error;
        }
    }

    async verifyPairingCode(pairingId, enteredCode) {
        try {
            return await this.webClient.verifyPairingCode(pairingId, enteredCode);
        } catch (error) {
            await this.errorHandler.handleError(error, { pairingId, enteredCode });
            throw error;
        }
    }

    async completePairing(pairingId) {
        try {
            return await this.webClient.completePairing(pairingId);
        } catch (error) {
            await this.errorHandler.handleError(error, { pairingId });
            throw error;
        }
    }

    getActivePairings() {
        return this.webClient.getActivePairings();
    }

    cancelPairing(pairingId) {
        return this.webClient.cancelPairing(pairingId);
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
        console.log('📱 Starting QR authentication...');
        
        if (!this.webClient.isConnected) {
            await this.webClient.initialize();
        }
        
        try {
            const qrData = await this.webClient.generateQRCode();
            const qrResult = await this.qrHandler.displayQRCode(qrData, this.options.qrCodeOptions || {});
            
            this.emit(EventTypes.QR_GENERATED, { 
                data: qrData, 
                timestamp: Date.now(),
                expires: Date.now() + 30000,
                ...qrResult
            });
        } catch (error) {
            console.warn('⚠️ QR generation failed, using fallback...');
            // Generate a fallback QR for demo
            const fallbackQR = `2@${Date.now()},demo123,mockkey,${Date.now()}`;
            const qrResult = await this.qrHandler.displayQRCode(fallbackQR, this.options.qrCodeOptions || {});
            
            this.emit(EventTypes.QR_GENERATED, { 
                data: fallbackQR, 
                timestamp: Date.now(),
                expires: Date.now() + 30000,
                fallback: true,
                ...qrResult
            });
        }
        
        await this._waitForAuthentication();
        this._setState('authenticated', true);
        this.emit(EventTypes.AUTHENTICATED);
    }

    async _authenticateWithPairing() {
        console.log('📞 Starting pairing authentication...');
        
        if (!this.options.pairingNumber) {
            throw new Error('Pairing number is required');
        }
        
        const pairingCode = await this.webClient.requestPairingCode(this.options.pairingNumber);
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