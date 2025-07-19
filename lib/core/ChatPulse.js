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
 * Main ChatPulse class - Advanced WhatsApp Web API wrapper
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
            authStrategy: 'qr', // 'qr', 'pairing', 'session'
            pairingNumber: null,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            puppeteerOptions: {},
            ...options
        };

        // Core components
        this.browser = null;
        this.page = null;
        this.isConnected = false;
        this.isReady = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.authInfo = null;

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
            
            // Handle authentication based on strategy
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
     * Send a text message
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
        
        return await this.messageHandler.sendMessage(chatId, message, options);
    }

    /**
     * Send button message
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
     * Send list message
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
     * Send contact message
     */
    async sendContact(chatId, contact, options = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }

        return await this.messageHandler.sendContact(chatId, contact, options);
    }

    /**
     * Send location message
     */
    async sendLocation(chatId, latitude, longitude, description = '', options = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }

        const coordValidation = ValidationUtils.validateCoordinates(latitude, longitude);
        if (!coordValidation.valid) {
            throw new Error(`Invalid coordinates: ${coordValidation.error}`);
        }

        return await this.messageHandler.sendLocation(chatId, latitude, longitude, description, options);
    }

    /**
     * Send poll message
     */
    async sendPoll(chatId, question, options, settings = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }

        if (!Array.isArray(options) || options.length < 2) {
            throw new Error('Poll must have at least 2 options');
        }

        return await this.messageHandler.sendPoll(chatId, question, options, settings);
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
     * Send sticker
     */
    async sendSticker(chatId, sticker, options = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }
        
        return await this.mediaHandler.sendSticker(chatId, sticker, options);
    }

    /**
     * Forward message
     */
    async forwardMessage(chatId, messageId, options = {}) {
        const chatValidation = ValidationUtils.validateChatId(chatId);
        if (!chatValidation.valid) {
            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
        }

        return await this.messageHandler.forwardMessage(chatId, messageId, options);
    }

    /**
     * React to message
     */
    async reactToMessage(messageId, emoji) {
        return await this.messageHandler.reactToMessage(messageId, emoji);
    }

    /**
     * Delete message
     */
    async deleteMessage(messageId, forEveryone = false) {
        return await this.messageHandler.deleteMessage(messageId, forEveryone);
    }

    /**
     * Edit message
     */
    async editMessage(messageId, newText) {
        return await this.messageHandler.editMessage(messageId, newText);
    }

    /**
     * Star/unstar message
     */
    async starMessage(messageId, star = true) {
        return await this.messageHandler.starMessage(messageId, star);
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
                    lastSeen: chat.contact?.lastSeen,
                    profilePicUrl: chat.contact?.profilePicUrl,
                    description: chat.groupMetadata?.desc,
                    createdAt: chat.groupMetadata?.creation,
                    owner: chat.groupMetadata?.owner?._serialized,
                    unreadCount: chat.unreadCount,
                    archived: chat.archive,
                    pinned: chat.pin,
                    muted: chat.muteExpiration > Date.now()
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
                    timestamp: chat.t,
                    archived: chat.archive,
                    pinned: chat.pin,
                    muted: chat.muteExpiration > Date.now()
                }));
            });
            
            return chats;
        } catch (error) {
            this.logger.error('Failed to get chats:', error);
            throw error;
        }
    }

    /**
     * Get contacts
     */
    async getContacts() {
        try {
            const contacts = await this.page.evaluate(() => {
                return window.Store.Contact.models.map(contact => ({
                    id: contact.id._serialized,
                    name: contact.name || contact.pushname,
                    number: contact.number,
                    isMyContact: contact.isMyContact,
                    isUser: contact.isUser,
                    isGroup: contact.isGroup,
                    profilePicUrl: contact.profilePicUrl,
                    status: contact.status,
                    lastSeen: contact.lastSeen
                }));
            });
            
            return contacts;
        } catch (error) {
            this.logger.error('Failed to get contacts:', error);
            throw error;
        }
    }

    /**
     * Create group
     */
    async createGroup(name, participants) {
        try {
            if (!Array.isArray(participants) || participants.length === 0) {
                throw new Error('Participants must be a non-empty array');
            }

            const result = await this.page.evaluate(async (groupName, participantIds) => {
                const participantContacts = participantIds.map(id => window.Store.Contact.get(id));
                const group = await window.Store.GroupUtils.createGroup(groupName, participantContacts);
                
                return {
                    id: group.id._serialized,
                    name: group.name,
                    participants: group.participants.length
                };
            }, name, participants);

            this.logger.info(`Group created: ${name}`);
            return result;
        } catch (error) {
            this.logger.error('Failed to create group:', error);
            throw error;
        }
    }

    /**
     * Add participants to group
     */
    async addParticipants(groupId, participants) {
        try {
            const result = await this.page.evaluate(async (gId, participantIds) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const participantContacts = participantIds.map(id => window.Store.Contact.get(id));
                return await window.Store.GroupUtils.addParticipants(group, participantContacts);
            }, groupId, participants);

            return result;
        } catch (error) {
            this.logger.error('Failed to add participants:', error);
            throw error;
        }
    }

    /**
     * Remove participants from group
     */
    async removeParticipants(groupId, participants) {
        try {
            const result = await this.page.evaluate(async (gId, participantIds) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                const participantContacts = participantIds.map(id => window.Store.Contact.get(id));
                return await window.Store.GroupUtils.removeParticipants(group, participantContacts);
            }, groupId, participants);

            return result;
        } catch (error) {
            this.logger.error('Failed to remove participants:', error);
            throw error;
        }
    }

    /**
     * Set group description
     */
    async setGroupDescription(groupId, description) {
        try {
            await this.page.evaluate(async (gId, desc) => {
                const group = window.Store.Chat.get(gId);
                if (!group || !group.isGroup) {
                    throw new Error('Group not found');
                }

                return await window.Store.GroupUtils.setGroupDescription(group, desc);
            }, groupId, description);

            return true;
        } catch (error) {
            this.logger.error('Failed to set group description:', error);
            throw error;
        }
    }

    /**
     * Set chat presence (typing, recording, etc.)
     */
    async setChatPresence(chatId, presence) {
        try {
            await this.page.evaluate(async (cId, presenceType) => {
                const chat = window.Store.Chat.get(cId);
                if (!chat) {
                    throw new Error('Chat not found');
                }

                switch (presenceType) {
                    case 'typing':
                        await window.Store.ChatPresence.markComposing(chat);
                        break;
                    case 'recording':
                        await window.Store.ChatPresence.markRecording(chat);
                        break;
                    case 'paused':
                        await window.Store.ChatPresence.markPaused(chat);
                        break;
                    default:
                        await window.Store.ChatPresence.markAvailable(chat);
                }
            }, chatId, presence);

            return true;
        } catch (error) {
            this.logger.error('Failed to set chat presence:', error);
            throw error;
        }
    }

    /**
     * Archive/unarchive chat
     */
    async archiveChat(chatId, archive = true) {
        try {
            await this.page.evaluate(async (cId, shouldArchive) => {
                const chat = window.Store.Chat.get(cId);
                if (!chat) {
                    throw new Error('Chat not found');
                }

                return await window.Store.Archive.setArchive(chat, shouldArchive);
            }, chatId, archive);

            return true;
        } catch (error) {
            this.logger.error('Failed to archive chat:', error);
            throw error;
        }
    }

    /**
     * Pin/unpin chat
     */
    async pinChat(chatId, pin = true) {
        try {
            await this.page.evaluate(async (cId, shouldPin) => {
                const chat = window.Store.Chat.get(cId);
                if (!chat) {
                    throw new Error('Chat not found');
                }

                return await window.Store.Pin.setPin(chat, shouldPin);
            }, chatId, pin);

            return true;
        } catch (error) {
            this.logger.error('Failed to pin chat:', error);
            throw error;
        }
    }

    /**
     * Mute/unmute chat
     */
    async muteChat(chatId, duration = null) {
        try {
            await this.page.evaluate(async (cId, muteDuration) => {
                const chat = window.Store.Chat.get(cId);
                if (!chat) {
                    throw new Error('Chat not found');
                }

                const muteExpiration = muteDuration ? Date.now() + muteDuration : 0;
                return await window.Store.Mute.setMute(chat, muteExpiration);
            }, chatId, duration);

            return true;
        } catch (error) {
            this.logger.error('Failed to mute chat:', error);
            throw error;
        }
    }

    /**
     * Block/unblock contact
     */
    async blockContact(contactId, block = true) {
        try {
            await this.page.evaluate(async (cId, shouldBlock) => {
                const contact = window.Store.Contact.get(cId);
                if (!contact) {
                    throw new Error('Contact not found');
                }

                return shouldBlock ? 
                    await window.Store.Block.blockContact(contact) :
                    await window.Store.Block.unblockContact(contact);
            }, contactId, block);

            return true;
        } catch (error) {
            this.logger.error('Failed to block contact:', error);
            throw error;
        }
    }

    /**
     * Get profile picture URL
     */
    async getProfilePicUrl(contactId) {
        try {
            const profilePicUrl = await this.page.evaluate(async (cId) => {
                const contact = window.Store.Contact.get(cId);
                if (!contact) {
                    throw new Error('Contact not found');
                }

                return await window.Store.ProfilePic.requestProfilePicFromServer(contact.id);
            }, contactId);

            return profilePicUrl;
        } catch (error) {
            this.logger.error('Failed to get profile picture:', error);
            throw error;
        }
    }

    /**
     * Set status message
     */
    async setStatus(status) {
        try {
            await this.page.evaluate(async (statusText) => {
                return await window.Store.MyStatus.setMyStatus(statusText);
            }, status);

            return true;
        } catch (error) {
            this.logger.error('Failed to set status:', error);
            throw error;
        }
    }

    /**
     * Get device info
     */
    async getDeviceInfo() {
        try {
            const deviceInfo = await this.page.evaluate(() => {
                return {
                    platform: window.Store.Conn.platform,
                    battery: window.Store.Conn.battery,
                    plugged: window.Store.Conn.plugged,
                    version: window.Store.Conn.version,
                    pushname: window.Store.Conn.pushname,
                    me: window.Store.Conn.me?._serialized
                };
            });

            return deviceInfo;
        } catch (error) {
            this.logger.error('Failed to get device info:', error);
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
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
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
     */
    async _navigateToWhatsApp() {
        await this.page.goto('https://web.whatsapp.com', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        this.logger.info('Navigated to WhatsApp Web');
    }

    /**
     * Handle authentication based on strategy
     */
    async _handleAuthentication() {
        if (this.options.authStrategy === 'pairing' && this.options.pairingNumber) {
            await this._handlePairingAuthentication();
        } else {
            await this._handleQRAuthentication();
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
     * Handle QR code authentication
     */
    async _handleQRAuthentication() {
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
    }

    /**
     * Handle pairing code authentication
     */
    async _handlePairingAuthentication() {
        try {
            // Click on "Link with phone number" option
            await this.page.waitForSelector('[data-testid="link-device-phone"]', { timeout: 30000 });
            await this.page.click('[data-testid="link-device-phone"]');

            // Enter phone number
            await this.page.waitForSelector('input[type="tel"]', { timeout: 30000 });
            await this.page.type('input[type="tel"]', this.options.pairingNumber);

            // Click next
            await this.page.click('[data-testid="phone-number-next"]');

            // Wait for pairing code
            await this.page.waitForSelector('[data-testid="pairing-code"]', { timeout: 30000 });
            
            const pairingCode = await this.page.$eval('[data-testid="pairing-code"]', el => el.textContent);
            
            this.emit('pairing_code', pairingCode);
            this.logger.info(`Pairing code: ${pairingCode}`);

            // Wait for authentication to complete
            await this.page.waitForSelector('[data-testid="chat-list"]', { timeout: 120000 });
            
        } catch (error) {
            this.logger.error('Pairing authentication failed:', error);
            throw error;
        }
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
                if (module?.default?.GroupUtils) window.Store.GroupUtils = module.default.GroupUtils;
                if (module?.default?.ChatPresence) window.Store.ChatPresence = module.default.ChatPresence;
                if (module?.default?.Archive) window.Store.Archive = module.default.Archive;
                if (module?.default?.Pin) window.Store.Pin = module.default.Pin;
                if (module?.default?.Mute) window.Store.Mute = module.default.Mute;
                if (module?.default?.Block) window.Store.Block = module.default.Block;
                if (module?.default?.ProfilePic) window.Store.ProfilePic = module.default.ProfilePic;
                if (module?.default?.MyStatus) window.Store.MyStatus = module.default.MyStatus;
                if (module?.default?.Conn) window.Store.Conn = module.default.Conn;
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
                            isGroup: message.isGroup,
                            hasMedia: message.hasMedia,
                            quotedMsg: message.quotedMsg?.id?._serialized,
                            mentionedJidList: message.mentionedJidList?.map(jid => jid._serialized) || []
                        });
                    }
                });
            }
        });
    }

    /**
     * Setup advanced features
     */
    async _setupAdvancedFeatures() {
        // Mark as online if enabled
        if (this.options.markOnlineOnConnect) {
            await this.page.evaluate(() => {
                if (window.Store?.Presence) {
                    window.Store.Presence.setPresenceAvailable();
                }
            });
        }

        // Setup presence monitoring
        await this.page.exposeFunction('onPresenceUpdate', (presence) => {
            this.emit('presence_update', presence);
        });

        // Setup call monitoring
        await this.page.exposeFunction('onCallReceived', (call) => {
            this.emit('call', call);
        });

        // Setup group events monitoring
        await this.page.exposeFunction('onGroupUpdate', (update) => {
            this.emit('group_update', update);
        });

        this.logger.info('Advanced features setup completed');
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