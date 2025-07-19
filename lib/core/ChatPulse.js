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
const chalk = require('chalk');
const { EventEmitter } = require('../events/EventEmitter');
const { SessionManager } = require('../session/SessionManager');
const { MessageHandler } = require('../handlers/MessageHandler');
const { PluginManager } = require('../plugins/PluginManager');
const { MediaHandler } = require('../media/MediaHandler');
const { QRHandler } = require('../utils/QRHandler');
const { Logger } = require('../utils/Logger');
const { ConnectionManager } = require('./ConnectionManager');
const { WebSocketHandler } = require('./WebSocketHandler');
const { MultiDeviceHandler } = require('./MultiDeviceHandler');

/**
 * Main ChatPulse class - Core WhatsApp Web API wrapper
 * Provides comprehensive WhatsApp automation capabilities
 */
class ChatPulse extends EventEmitter {
    /**
     * Initialize ChatPulse instance
     * @param {Object} options - Configuration options
     * @param {string} options.sessionName - Unique session identifier
     * @param {boolean} options.headless - Run browser in headless mode
     * @param {string} options.userDataDir - Custom user data directory
     * @param {Object} options.puppeteerOptions - Additional Puppeteer options
     * @param {boolean} options.autoReconnect - Enable automatic reconnection
     * @param {number} options.reconnectInterval - Reconnection interval in ms
     * @param {string} options.language - Interface language (en/si)
     */
    constructor(options = {}) {
        super();
        
        this.options = {
            sessionName: 'default',
            headless: true,
            userDataDir: './sessions',
            autoReconnect: true,
            reconnectInterval: 30000,
            language: 'en',
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
        this.pluginManager = new PluginManager(this);
        this.mediaHandler = new MediaHandler(this);
        this.qrHandler = new QRHandler(this);
        this.logger = new Logger('ChatPulse');
        this.connectionManager = new ConnectionManager(this);
        this.wsHandler = new WebSocketHandler(this);
        this.multiDevice = new MultiDeviceHandler(this);

        // Bind event handlers
        this._bindEventHandlers();
        
        this.logger.info(`ChatPulse initialized with session: ${this.options.sessionName}`);
    }

    /**
     * Initialize with advanced connection methods
     * @param {Object} connectionOptions - Advanced connection options
     * @returns {Promise<boolean>} Connection success status
     */
    async initializeAdvanced(connectionOptions = {}) {
        try {
            this.logger.info('Initializing ChatPulse with advanced features...');
            
            // Initialize connection manager
            await this.connectionManager.initialize(connectionOptions);
            
            // Setup multi-device support
            if (connectionOptions.multiDevice) {
                await this.multiDevice.initialize();
            }
            
            // Setup WebSocket for real-time updates
            if (connectionOptions.websocket !== false) {
                await this.wsHandler.initialize();
            }
            
            return await this.initialize();
            
        } catch (error) {
            this.logger.error('Failed to initialize ChatPulse with advanced features:', error);
            throw error;
        }
    }

    /**
     * Initialize and connect to WhatsApp Web
     * @returns {Promise<boolean>} Connection success status
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
            
            // Load plugins
            await this.pluginManager.loadPlugins();
            
            this.isReady = true;
            this.emit('ready');
            
            this.logger.success('ChatPulse is ready!');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize ChatPulse:', error);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Send a text message
     * @param {string} chatId - Chat identifier (phone number or group ID)
     * @param {string} message - Message content
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Message result
     */
    async sendMessage(chatId, message, options = {}) {
        return await this.messageHandler.sendMessage(chatId, message, options);
    }

    /**
     * Send media message (image, video, audio, document)
     * @param {string} chatId - Chat identifier
     * @param {string|Buffer} media - Media file path or buffer
     * @param {Object} options - Media options
     * @returns {Promise<Object>} Message result
     */
    async sendMedia(chatId, media, options = {}) {
        return await this.mediaHandler.sendMedia(chatId, media, options);
    }

    /**
     * Get chat information
     * @param {string} chatId - Chat identifier
     * @returns {Promise<Object>} Chat information
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
                    lastSeen: chat.contact?.lastSeen,
                    profilePic: chat.contact?.profilePicThumb?.eurl
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
     * @returns {Promise<Array>} List of chats
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
     * @private
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
            ],
            ...this.options.puppeteerOptions
        };

        this.browser = await puppeteer.launch(browserOptions);
        this.page = await this.browser.newPage();
        
        // Set user agent
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        this.logger.info('Browser launched successfully');
    }

    /**
     * Navigate to WhatsApp Web
     * @private
     */
    async _navigateToWhatsApp() {
        await this.page.goto('https://web.whatsapp.com', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        this.logger.info('Navigated to WhatsApp Web');
    }

    /**
     * Handle authentication (QR code or session restore)
     * @private
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
        this.logger.success('Successfully connected to WhatsApp Web');
    }

    /**
     * Inject WhatsApp Store for API access
     * @private
     */
    async _injectWhatsAppStore() {
        await this.page.evaluateOnNewDocument(() => {
            // Store WhatsApp's internal modules for API access
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
            
            // Extract important stores
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
     * @private
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
     * @private
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