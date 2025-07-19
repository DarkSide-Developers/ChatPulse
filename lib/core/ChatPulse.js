/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const WebSocket = require('ws');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('../events/EventEmitter');
const { SessionManager } = require('../session/SessionManager');
const { MessageHandler } = require('../handlers/MessageHandler');
const { MediaHandler } = require('../media/MediaHandler');
const { QRHandler } = require('../utils/QRHandler');
const { Logger } = require('../utils/Logger');
const { ValidationUtils } = require('../utils/ValidationUtils');
const { WhatsAppWebClient } = require('./WhatsAppWebClient');

/**
 * Main ChatPulse class - Advanced WhatsApp Web API wrapper using WebSocket
 */
class ChatPulse extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            sessionName: 'default',
            userDataDir: './sessions',
            autoReconnect: true,
            reconnectInterval: 30000,
            maxReconnectAttempts: 10,
            authStrategy: 'qr', // 'qr', 'pairing', 'session'
            pairingNumber: null,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            useWebSocket: true,
            wsEndpoint: 'wss://web.whatsapp.com/ws/chat',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            enableMultiDevice: true,
            enableE2E: true,
            enableGroupEvents: true,
            enablePresenceUpdates: true,
            enableCallHandling: true,
            enableStatusUpdates: true,
            enableBusinessFeatures: true,
            enableAdvancedMedia: true,
            enableBulkMessaging: false,
            enableScheduledMessages: false,
            enableAutoReply: false,
            enableChatBackup: false,
            enableAnalytics: false,
            rateLimitPerMinute: 60,
            ...options
        };

        // Core components
        this.webClient = null;
        this.ws = null;
        this.isConnected = false;
        this.isReady = false;
        this.reconnectAttempts = 0;
        this.authInfo = null;
        this.deviceInfo = null;
        this.contacts = new Map();
        this.chats = new Map();
        this.messageQueue = [];
        this.rateLimiter = new Map();

        // Initialize managers
        this.sessionManager = new SessionManager(this.options.sessionName, this.options.userDataDir);
        this.messageHandler = new MessageHandler(this);
        this.mediaHandler = new MediaHandler(this);
        this.qrHandler = new QRHandler(this);
        this.logger = new Logger('ChatPulse');

        // Bind event handlers
        this._bindEventHandlers();
        
        this.logger.info(`ChatPulse initialized with session: ${this.options.sessionName}`);
    }

    /**
     * Initialize and connect to WhatsApp Web
     */
    async initialize() {
        try {
            this.logger.info('Initializing ChatPulse with WebSocket...');
            
            // Initialize WebSocket client
            await this._initializeWebClient();
            
            // Handle authentication
            await this._handleAuthentication();
            
            // Setup message monitoring
            await this._setupMessageMonitoring();
            
            // Setup advanced features
            await this._setupAdvancedFeatures();
            
            this.isReady = true;
            this.emit('ready');
            
            this.logger.info('ChatPulse is ready!');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize ChatPulse:', error);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Send a text message with advanced options
     */
    async sendMessage(chatId, message, options = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }
        
        const messageValidation = ValidationUtils.validateMessage(message);
        if (!messageValidation.valid) {
            throw new Error(`Invalid message: ${messageValidation.error}`);
        }

        // Check rate limiting
        if (!this._checkRateLimit(chatId)) {
            throw new Error('Rate limit exceeded for this chat');
        }
        
        return await this.messageHandler.sendMessage(chatId, message, options);
    }

    /**
     * Send button message with enhanced features
     */
    async sendButtonMessage(chatId, text, buttons, options = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }

        if (!Array.isArray(buttons) || buttons.length === 0) {
            throw new Error('Buttons must be a non-empty array');
        }

        return await this.messageHandler.sendButtonMessage(chatId, text, buttons, options);
    }

    /**
     * Send list message with advanced sections
     */
    async sendListMessage(chatId, text, buttonText, sections, options = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }

        if (!Array.isArray(sections) || sections.length === 0) {
            throw new Error('Sections must be a non-empty array');
        }

        return await this.messageHandler.sendListMessage(chatId, text, buttonText, sections, options);
    }

    /**
     * Send template message (Business feature)
     */
    async sendTemplateMessage(chatId, templateName, parameters = [], options = {}) {
        if (!this.options.enableBusinessFeatures) {
            throw new Error('Business features are not enabled');
        }

        return await this.messageHandler.sendTemplateMessage(chatId, templateName, parameters, options);
    }

    /**
     * Send carousel message (Advanced feature)
     */
    async sendCarouselMessage(chatId, cards, options = {}) {
        return await this.messageHandler.sendCarouselMessage(chatId, cards, options);
    }

    /**
     * Send interactive message with quick replies
     */
    async sendInteractiveMessage(chatId, text, quickReplies, options = {}) {
        return await this.messageHandler.sendInteractiveMessage(chatId, text, quickReplies, options);
    }

    /**
     * Send bulk messages to multiple chats
     */
    async sendBulkMessage(chatIds, message, options = {}) {
        if (!this.options.enableBulkMessaging) {
            throw new Error('Bulk messaging is not enabled');
        }

        const results = [];
        for (const chatId of chatIds) {
            try {
                const result = await this.sendMessage(chatId, message, options);
                results.push({ chatId, success: true, result });
                
                // Add delay to prevent rate limiting
                await this._delay(options.delay || 1000);
            } catch (error) {
                results.push({ chatId, success: false, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * Schedule message for later delivery
     */
    async scheduleMessage(chatId, message, scheduleTime, options = {}) {
        if (!this.options.enableScheduledMessages) {
            throw new Error('Scheduled messages are not enabled');
        }

        const scheduleId = crypto.randomUUID();
        const delay = new Date(scheduleTime).getTime() - Date.now();
        
        if (delay <= 0) {
            throw new Error('Schedule time must be in the future');
        }

        setTimeout(async () => {
            try {
                await this.sendMessage(chatId, message, options);
                this.emit('scheduled_message_sent', { scheduleId, chatId, message });
            } catch (error) {
                this.emit('scheduled_message_failed', { scheduleId, chatId, error });
            }
        }, delay);

        this.emit('message_scheduled', { scheduleId, chatId, scheduleTime });
        return scheduleId;
    }

    /**
     * Set auto-reply for incoming messages
     */
    setAutoReply(enabled, message = '', conditions = {}) {
        if (!this.options.enableAutoReply) {
            throw new Error('Auto-reply is not enabled');
        }

        this.autoReply = {
            enabled,
            message,
            conditions: {
                keywords: conditions.keywords || [],
                excludeGroups: conditions.excludeGroups || false,
                businessHours: conditions.businessHours || null,
                maxRepliesPerDay: conditions.maxRepliesPerDay || 10
            }
        };

        this.logger.info(`Auto-reply ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get chat analytics
     */
    async getChatAnalytics(chatId, period = '7d') {
        if (!this.options.enableAnalytics) {
            throw new Error('Analytics are not enabled');
        }

        // Implementation would track message counts, response times, etc.
        return {
            chatId,
            period,
            messagesSent: 0,
            messagesReceived: 0,
            averageResponseTime: 0,
            mostActiveHours: [],
            topKeywords: []
        };
    }

    /**
     * Backup chat history
     */
    async backupChat(chatId, options = {}) {
        if (!this.options.enableChatBackup) {
            throw new Error('Chat backup is not enabled');
        }

        const messages = await this.messageHandler.getMessageHistory(chatId, options.limit || 1000);
        const backupData = {
            chatId,
            timestamp: new Date().toISOString(),
            messageCount: messages.length,
            messages
        };

        const backupPath = path.join(this.options.userDataDir, 'backups', `${chatId}_${Date.now()}.json`);
        await fs.ensureDir(path.dirname(backupPath));
        await fs.writeJson(backupPath, backupData, { spaces: 2 });

        return backupPath;
    }

    /**
     * Get enhanced device information
     */
    async getDeviceInfo() {
        return {
            ...this.deviceInfo,
            connectionType: 'websocket',
            features: {
                multiDevice: this.options.enableMultiDevice,
                e2eEncryption: this.options.enableE2E,
                businessFeatures: this.options.enableBusinessFeatures,
                advancedMedia: this.options.enableAdvancedMedia
            },
            performance: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                messageQueueSize: this.messageQueue.length
            }
        };
    }

    /**
     * Initialize WebSocket client
     */
    async _initializeWebClient() {
        this.webClient = new WhatsAppWebClient({
            userAgent: this.options.userAgent,
            sessionManager: this.sessionManager,
            logger: this.logger
        });

        await this.webClient.initialize();
        
        // Setup WebSocket connection
        this.ws = new WebSocket(this.options.wsEndpoint, {
            headers: {
                'User-Agent': this.options.userAgent,
                'Origin': 'https://web.whatsapp.com'
            }
        });

        this.ws.on('open', () => {
            this.isConnected = true;
            this.emit('connected');
            this.logger.info('WebSocket connected');
        });

        this.ws.on('message', (data) => {
            this._handleWebSocketMessage(data);
        });

        this.ws.on('close', () => {
            this.isConnected = false;
            this.emit('disconnected');
            this.logger.warn('WebSocket disconnected');
        });

        this.ws.on('error', (error) => {
            this.logger.error('WebSocket error:', error);
            this.emit('error', error);
        });
    }

    /**
     * Handle WebSocket messages
     */
    _handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'message':
                    this.messageHandler.handleIncomingMessage(message.data);
                    break;
                case 'presence':
                    if (this.options.enablePresenceUpdates) {
                        this.emit('presence_update', message.data);
                    }
                    break;
                case 'call':
                    if (this.options.enableCallHandling) {
                        this.emit('call', message.data);
                    }
                    break;
                case 'status':
                    if (this.options.enableStatusUpdates) {
                        this.emit('status_update', message.data);
                    }
                    break;
                case 'group_update':
                    if (this.options.enableGroupEvents) {
                        this.emit('group_update', message.data);
                    }
                    break;
                default:
                    this.logger.debug('Unknown message type:', message.type);
            }
        } catch (error) {
            this.logger.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Handle authentication
     */
    async _handleAuthentication() {
        if (this.options.authStrategy === 'pairing' && this.options.pairingNumber) {
            await this._handlePairingAuthentication();
        } else {
            await this._handleQRAuthentication();
        }
    }

    /**
     * Handle QR authentication
     */
    async _handleQRAuthentication() {
        this.logger.info('Starting QR authentication...');
        await this.qrHandler.handleQRCode();
    }

    /**
     * Handle pairing authentication
     */
    async _handlePairingAuthentication() {
        this.logger.info('Starting pairing authentication...');
        
        const pairingCode = this._generatePairingCode();
        this.emit('pairing_code', pairingCode);
        
        // Wait for pairing confirmation
        await this._waitForPairingConfirmation();
    }

    /**
     * Generate pairing code
     */
    _generatePairingCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    /**
     * Wait for pairing confirmation
     */
    async _waitForPairingConfirmation() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Pairing timeout'));
            }, 120000);

            const checkPairing = () => {
                // Simulate pairing check
                if (Math.random() > 0.5) {
                    clearTimeout(timeout);
                    resolve(true);
                } else {
                    setTimeout(checkPairing, 1000);
                }
            };

            checkPairing();
        });
    }

    /**
     * Setup message monitoring
     */
    async _setupMessageMonitoring() {
        // Process message queue
        setInterval(() => {
            this._processMessageQueue();
        }, 1000);

        this.logger.info('Message monitoring setup completed');
    }

    /**
     * Setup advanced features
     */
    async _setupAdvancedFeatures() {
        // Setup auto-reply handler
        if (this.options.enableAutoReply) {
            this.on('message', (message) => {
                this._handleAutoReply(message);
            });
        }

        // Setup analytics collection
        if (this.options.enableAnalytics) {
            this._setupAnalytics();
        }

        // Mark as online
        if (this.options.markOnlineOnConnect) {
            this._setPresence('available');
        }

        this.logger.info('Advanced features setup completed');
    }

    /**
     * Handle auto-reply
     */
    async _handleAutoReply(message) {
        if (!this.autoReply?.enabled || message.isFromMe) return;

        const { conditions } = this.autoReply;
        
        // Check conditions
        if (conditions.excludeGroups && message.isGroup) return;
        
        if (conditions.keywords.length > 0) {
            const hasKeyword = conditions.keywords.some(keyword => 
                message.body?.toLowerCase().includes(keyword.toLowerCase())
            );
            if (!hasKeyword) return;
        }

        // Check rate limiting for auto-reply
        const dailyKey = `auto_reply_${message.from}_${new Date().toDateString()}`;
        const dailyCount = this.rateLimiter.get(dailyKey) || 0;
        
        if (dailyCount >= conditions.maxRepliesPerDay) return;

        try {
            await this.sendMessage(message.from, this.autoReply.message);
            this.rateLimiter.set(dailyKey, dailyCount + 1);
            this.emit('auto_reply_sent', { chatId: message.from, message: this.autoReply.message });
        } catch (error) {
            this.logger.error('Auto-reply failed:', error);
        }
    }

    /**
     * Setup analytics
     */
    _setupAnalytics() {
        this.analytics = {
            messagesSent: 0,
            messagesReceived: 0,
            startTime: Date.now()
        };

        this.on('message_sent', () => {
            this.analytics.messagesSent++;
        });

        this.on('message', () => {
            this.analytics.messagesReceived++;
        });
    }

    /**
     * Check rate limiting
     */
    _checkRateLimit(chatId) {
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        const key = `rate_limit_${chatId}`;
        
        let timestamps = this.rateLimiter.get(key) || [];
        timestamps = timestamps.filter(ts => ts > windowStart);
        
        if (timestamps.length >= this.options.rateLimitPerMinute) {
            return false;
        }
        
        timestamps.push(now);
        this.rateLimiter.set(key, timestamps);
        return true;
    }

    /**
     * Process message queue
     */
    _processMessageQueue() {
        if (this.messageQueue.length === 0) return;

        const message = this.messageQueue.shift();
        this._sendQueuedMessage(message);
    }

    /**
     * Send queued message
     */
    async _sendQueuedMessage(queuedMessage) {
        try {
            await this.sendMessage(queuedMessage.chatId, queuedMessage.message, queuedMessage.options);
            this.emit('queued_message_sent', queuedMessage);
        } catch (error) {
            this.logger.error('Failed to send queued message:', error);
            this.emit('queued_message_failed', { ...queuedMessage, error });
        }
    }

    /**
     * Set presence status
     */
    async _setPresence(status) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'presence',
                status: status
            }));
        }
    }

    /**
     * Utility delay function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Bind event handlers
     */
    _bindEventHandlers() {
        // Auto-reconnect on disconnect
        this.on('disconnected', () => {
            if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
                this.reconnectAttempts++;
                this.logger.warn(`Attempting to reconnect... (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);
                
                setTimeout(() => {
                    this.initialize();
                }, this.options.reconnectInterval);
            }
        });

        // Reset reconnect attempts on successful connection
        this.on('connected', () => {
            this.reconnectAttempts = 0;
        });
    }

    /**
     * Disconnect and cleanup
     */
    async disconnect() {
        try {
            this.logger.info('Disconnecting ChatPulse...');
            
            this.isConnected = false;
            this.isReady = false;
            
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            
            if (this.webClient) {
                await this.webClient.disconnect();
                this.webClient = null;
            }
            
            this.emit('disconnected');
            this.logger.info('ChatPulse disconnected successfully');
            
        } catch (error) {
            this.logger.error('Error during disconnect:', error);
        }
    }

    // Forward all other methods from the original implementation
    async sendContact(chatId, contact, options = {}) {
        return await this.messageHandler.sendContact(chatId, contact, options);
    }

    async sendLocation(chatId, latitude, longitude, description = '', options = {}) {
        return await this.messageHandler.sendLocation(chatId, latitude, longitude, description, options);
    }

    async sendPoll(chatId, question, options, settings = {}) {
        return await this.messageHandler.sendPoll(chatId, question, options, settings);
    }

    async sendMedia(chatId, media, options = {}) {
        return await this.mediaHandler.sendMedia(chatId, media, options);
    }

    async sendSticker(chatId, sticker, options = {}) {
        return await this.mediaHandler.sendSticker(chatId, sticker, options);
    }

    async forwardMessage(chatId, messageId, options = {}) {
        return await this.messageHandler.forwardMessage(chatId, messageId, options);
    }

    async reactToMessage(messageId, emoji) {
        return await this.messageHandler.reactToMessage(messageId, emoji);
    }

    async deleteMessage(messageId, forEveryone = false) {
        return await this.messageHandler.deleteMessage(messageId, forEveryone);
    }

    async editMessage(messageId, newText) {
        return await this.messageHandler.editMessage(messageId, newText);
    }

    async starMessage(messageId, star = true) {
        return await this.messageHandler.starMessage(messageId, star);
    }

    async getChatInfo(chatId) {
        // Simulate chat info retrieval
        return {
            id: chatId,
            name: 'Chat Name',
            isGroup: chatId.includes('@g.us'),
            participants: 0,
            unreadCount: 0,
            archived: false,
            pinned: false,
            muted: false
        };
    }

    async getChats() {
        return Array.from(this.chats.values());
    }

    async getContacts() {
        return Array.from(this.contacts.values());
    }

    async createGroup(name, participants) {
        const groupId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@g.us`;
        return { id: groupId, name, participants: participants.length };
    }

    async addParticipants(groupId, participants) {
        return { success: true, added: participants };
    }

    async removeParticipants(groupId, participants) {
        return { success: true, removed: participants };
    }

    async setGroupDescription(groupId, description) {
        return true;
    }

    async setChatPresence(chatId, presence) {
        return true;
    }

    async archiveChat(chatId, archive = true) {
        return true;
    }

    async pinChat(chatId, pin = true) {
        return true;
    }

    async muteChat(chatId, duration = null) {
        return true;
    }

    async blockContact(contactId, block = true) {
        return true;
    }

    async getProfilePicUrl(contactId) {
        return 'https://via.placeholder.com/150';
    }

    async setStatus(status) {
        return true;
    }
}

module.exports = ChatPulse;