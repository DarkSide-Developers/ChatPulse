/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('../events/EventEmitter');
const { SessionManager } = require('../session/SessionManager');
const { MessageHandler } = require('../handlers/MessageHandler');
const { MediaHandler } = require('../media/MediaHandler');
const { QRHandler } = require('../utils/QRHandler');
const { Logger } = require('../utils/Logger');
const { ValidationUtils } = require('../utils/ValidationUtils');

/**
 * Main ChatPulse class - Core WhatsApp Web API wrapper
 */
class ChatPulse extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            sessionName: 'default',
            headless: true,
            userDataDir: './sessions',
            autoReconnect: true,
            reconnectInterval: 30000,
            ...options
        };

        // Core components
        this.browser = null;
        this.page = null;
        this.isConnected = false;
        this.isReady = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;

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
            this.logger.info('Initializing ChatPulse...');
            
            // Launch browser
            await this._launchBrowser();
            
            // Navigate to WhatsApp Web
            await this._navigateToWhatsApp();
            
            // Handle authentication
            await this._handleAuthentication();
            
            // Setup message monitoring
            await this._setupMessageMonitoring();
            
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
     * Send a text message
     */
    async sendMessage(chatId, message, options = {}) {
        // Validate inputs
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }
        
        const messageValidation = ValidationUtils.validateMessage(message);
        if (!messageValidation.valid) {
            throw new Error(`Invalid message: ${messageValidation.error}`);
        }
        
        return await this.messageHandler.sendMessage(chatId, message, options);
    }

    /**
     * Send media message
     */
    async sendMedia(chatId, media, options = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }
        
        return await this.mediaHandler.sendMedia(chatId, media, options);
    }

    /**
     * Get chat information
     */
    async getChatInfo(chatId) {
        try {
            const chatInfo = await this.page.evaluate((id) => {
                const chat = window.Store.Chat.get(id);
                if (!chat) return null;
                
                return {
                    id: chat.id._serialized,
                    name: chat.name || chat.contact?.name || chat.contact?.pushname,
                    isGroup: chat.isGroup,
                    participants: chat.participants?.length || 0,
                    lastSeen: chat.contact?.lastSeen
                };
            }, chatId);
            
            return chatInfo;
        } catch (error) {
            this.logger.error('Failed to get chat info:', error);
            throw error;
        }
    }

    /**
     * Get all chats
     */
    async getChats() {
        try {
            const chats = await this.page.evaluate(() => {
                return window.Store.Chat.models.map(chat => ({
                    id: chat.id._serialized,
                    name: chat.name || chat.contact?.name || chat.contact?.pushname,
                    isGroup: chat.isGroup,
                    unreadCount: chat.unreadCount,
                    lastMessage: chat.lastReceivedKey?.id,
                    timestamp: chat.t
                }));
            });
            
            return chats;
        } catch (error) {
            this.logger.error('Failed to get chats:', error);
            throw error;
        }
    }

    /**
     * Disconnect and cleanup
     */
    async disconnect() {
        try {
            this.logger.info('Disconnecting ChatPulse...');
            
            this.isConnected = false;
            this.isReady = false;
            
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }
            
            this.emit('disconnected');
            this.logger.info('ChatPulse disconnected successfully');
            
        } catch (error) {
            this.logger.error('Error during disconnect:', error);
        }
    }

    /**
     * Launch Puppeteer browser
     */
    async _launchBrowser() {
        const sessionPath = this.sessionManager.getSessionPath();
        
        const browserOptions = {
            headless: this.options.headless,
            userDataDir: sessionPath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        };

        this.browser = await puppeteer.launch(browserOptions);
        this.page = await this.browser.newPage();
        
        // Set user agent
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        this.logger.info('Browser launched successfully');
    }

    /**
     * Navigate to WhatsApp Web
     */
    async _navigateToWhatsApp() {
        await this.page.goto('https://web.whatsapp.com', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        this.logger.info('Navigated to WhatsApp Web');
    }

    /**
     * Handle authentication
     */
    async _handleAuthentication() {
        // Wait for either QR code or main interface
        await this.page.waitForSelector('[data-testid="qr-code"], [data-testid="chat-list"]', {
            timeout: 60000
        });

        const qrElement = await this.page.$('[data-testid="qr-code"]');
        
        if (qrElement) {
            this.logger.info('QR code detected, waiting for scan...');
            await this.qrHandler.handleQRCode();
        } else {
            this.logger.info('Session restored successfully');
        }

        // Wait for WhatsApp to be ready
        await this.page.waitForSelector('[data-testid="chat-list"]', {
            timeout: 120000
        });

        // Inject WhatsApp Store
        await this._injectWhatsAppStore();
        
        this.isConnected = true;
        this.emit('connected');
        this.logger.info('Successfully connected to WhatsApp Web');
    }

    /**
     * Inject WhatsApp Store for API access
     */
    async _injectWhatsAppStore() {
        await this.page.evaluateOnNewDocument(() => {
            window.Store = {};
            
            const moduleRaid = () => {
                const modules = {};
                webpackChunkwhatsapp_web_client.push([
                    ['moduleRaid'], {}, (e) => {
                        Object.keys(e.cache).forEach((key) => {
                            modules[key] = e.cache[key].exports;
                        });
                    }
                ]);
                return modules;
            };

            const stores = moduleRaid();
            
            Object.keys(stores).forEach(key => {
                const module = stores[key];
                if (module?.default?.Chat) window.Store.Chat = module.default.Chat;
                if (module?.default?.Msg) window.Store.Msg = module.default.Msg;
                if (module?.default?.Contact) window.Store.Contact = module.default.Contact;
                if (module?.sendMessage) window.Store.sendMessage = module.sendMessage;
            });
        });
    }

    /**
     * Setup message monitoring
     */
    async _setupMessageMonitoring() {
        await this.page.exposeFunction('onMessageReceived', (message) => {
            this.messageHandler.handleIncomingMessage(message);
        });

        await this.page.evaluate(() => {
            if (window.Store?.Msg) {
                window.Store.Msg.on('add', (message) => {
                    if (message.isNewMsg) {
                        window.onMessageReceived({
                            id: message.id._serialized,
                            from: message.from._serialized,
                            to: message.to._serialized,
                            body: message.body,
                            type: message.type,
                            timestamp: message.t,
                            isFromMe: message.isFromMe,
                            isGroup: message.isGroup
                        });
                    }
                });
            }
        });
    }

    /**
     * Bind event handlers
     */
    _bindEventHandlers() {
        // Auto-reconnect on disconnect
        this.on('disconnected', () => {
            if (this.options.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                this.logger.warn(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                
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
}

module.exports = ChatPulse;