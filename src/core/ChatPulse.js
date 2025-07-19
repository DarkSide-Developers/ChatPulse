@@ .. @@
 /**
  * ChatPulse - Advanced WhatsApp Web API Library
  * Developer: DarkWinzo (https://github.com/DarkWinzo)
  * Email: isurulakshan9998@gmail.com
  * Organization: DarkSide Developer Team
  * GitHub: https://github.com/DarkSide-Developers
  * Repository: https://github.com/DarkSide-Developers/ChatPulse
  * © 2025 DarkSide Developer Team. All rights reserved.
  */

-const WebSocket = require('ws');
-const fs = require('fs-extra');
-const path = require('path');
-const crypto = require('crypto');
-const { EventEmitter } = require('../events/EventEmitter');
-const { SessionManager } = require('../session/SessionManager');
-const { MessageHandler } = require('../handlers/MessageHandler');
-const { MediaHandler } = require('../media/MediaHandler');
-const { QRHandler } = require('../utils/QRHandler');
-const { Logger } = require('../utils/Logger');
-const { ValidationUtils } = require('../utils/ValidationUtils');
-const { WhatsAppWebClient } = require('./WhatsAppWebClient');
+const { EventEmitter } = require('../../lib/events/EventEmitter');
+const { SessionManager } = require('../managers/SessionManager');
+const { MessageHandler } = require('../handlers/MessageHandler');
+const { MediaHandler } = require('../handlers/MediaHandler');
+const { QRHandler } = require('../handlers/QRHandler');
+const { Logger } = require('../utils/Logger');
+const { InputValidator } = require('../validators/InputValidator');
+const { ErrorHandler } = require('../errors/ErrorHandler');
+const { RateLimiter } = require('../middleware/RateLimiter');
+const { MessageQueue } = require('../services/MessageQueue');
+const { WhatsAppWebClient } = require('./WhatsAppWebClient');
+const { mergeConfig } = require('../config/DefaultConfig');
+const { ConnectionStates, EventTypes } = require('../types');
+const { 
+    ChatPulseError, 
+    ConnectionError, 
+    AuthenticationError,
+    ValidationError 
+} = require('../errors/ChatPulseError');

 /**
- * Main ChatPulse class - Advanced WhatsApp Web API wrapper using WebSocket
+ * Main ChatPulse class - Advanced WhatsApp Web API
  */
 class ChatPulse extends EventEmitter {
     constructor(options = {}) {
         super();
         
-        this.options = {
-            sessionName: 'default',
-            userDataDir: './sessions',
-            autoReconnect: true,
-            reconnectInterval: 30000,
-            maxReconnectAttempts: 10,
-            authStrategy: 'qr', // 'qr', 'pairing', 'session'
-            pairingNumber: null,
-            markOnlineOnConnect: true,
-            syncFullHistory: false,
-            useWebSocket: true,
-            wsEndpoint: 'wss://web.whatsapp.com/ws/chat',
-            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
-            enableMultiDevice: true,
-            enableE2E: true,
-            enableGroupEvents: true,
-            enablePresenceUpdates: true,
-            enableCallHandling: true,
-            enableStatusUpdates: true,
-            enableBusinessFeatures: true,
-            enableAdvancedMedia: true,
-            enableBulkMessaging: false,
-            enableScheduledMessages: false,
-            enableAutoReply: false,
-            enableChatBackup: false,
-            enableAnalytics: false,
-            rateLimitPerMinute: 60,
-            ...options
-        };
+        // Merge configuration
+        this.options = mergeConfig(options, process.env.NODE_ENV || 'production');

         // Core components
-        this.webClient = null;
-        this.ws = null;
-        this.isConnected = false;
+        this.connectionState = ConnectionStates.DISCONNECTED;
         this.isReady = false;
         this.reconnectAttempts = 0;
-        this.authInfo = null;
-        this.deviceInfo = null;
-        this.contacts = new Map();
-        this.chats = new Map();
-        this.messageQueue = [];
-        this.rateLimiter = new Map();
+        
+        // Data stores
+        this.authInfo = null;
+        this.deviceInfo = null;
+        this.contacts = new Map();
+        this.chats = new Map();

         // Initialize managers
-        this.sessionManager = new SessionManager(this.options.sessionName, this.options.userDataDir);
+        this.logger = new Logger('ChatPulse');
+        this.sessionManager = new SessionManager(this.options.sessionName, this.options.userDataDir);
+        this.inputValidator = new InputValidator();
+        this.errorHandler = new ErrorHandler(this);
+        
+        // Initialize middleware
+        if (this.options.enableRateLimiting) {
+            this.rateLimiter = new RateLimiter({
+                perMinute: this.options.rateLimitPerMinute,
+                perHour: this.options.rateLimitPerHour,
+                perDay: this.options.rateLimitPerDay,
+                burstLimit: this.options.burstLimit
+            });
+        }
+        
+        // Initialize services
+        if (this.options.enableMessageQueue) {
+            this.messageQueue = new MessageQueue(this, {
+                maxSize: this.options.messageQueueSize
+            });
+        }
+        
+        // Initialize handlers
         this.messageHandler = new MessageHandler(this);
         this.mediaHandler = new MediaHandler(this);
         this.qrHandler = new QRHandler(this);
-        this.logger = new Logger('ChatPulse');
+        
+        // Initialize web client
+        this.webClient = null;

         // Bind event handlers
         this._bindEventHandlers();
         
         this.logger.info(`ChatPulse initialized with session: ${this.options.sessionName}`);
     }

     /**
      * Initialize and connect to WhatsApp Web
      */
     async initialize() {
         try {
+            this.connectionState = ConnectionStates.CONNECTING;
+            this.emit(EventTypes.CONNECTING);
+            
             this.logger.info('Initializing ChatPulse with WebSocket...');
             
             // Initialize WebSocket client
             await this._initializeWebClient();
             
             // Handle authentication
             await this._handleAuthentication();
             
             // Setup message monitoring
             await this._setupMessageMonitoring();
             
             // Setup advanced features
             await this._setupAdvancedFeatures();
             
+            this.connectionState = ConnectionStates.READY;
             this.isReady = true;
-            this.emit('ready');
+            this.emit(EventTypes.READY);
             
             this.logger.info('ChatPulse is ready!');
             return true;
             
         } catch (error) {
-            this.logger.error('Failed to initialize ChatPulse:', error);
-            this.emit('error', error);
+            this.connectionState = ConnectionStates.FAILED;
+            await this.errorHandler.handleError(error, { operation: 'initialize' });
             return false;
         }
     }

     /**
      * Send a text message with advanced options
      */
     async sendMessage(chatId, message, options = {}) {
-        const chatValidation = ValidationUtils.validateChatId(chatId);
-        if (!chatValidation.valid) {
-            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
+        try {
+            // Validate inputs
+            const chatValidation = this.inputValidator.validate(chatId, 'chatId');
+            const messageValidation = this.inputValidator.validate(message, 'message', options.messageOptions);
+            
+            // Check rate limiting
+            if (this.rateLimiter) {
+                this.rateLimiter.checkLimit(chatId, 'sendMessage');
+            }
+            
+            // Use message queue if enabled
+            if (this.messageQueue && options.useQueue !== false) {
+                return this.messageQueue.enqueue({
+                    type: 'text',
+                    chatId: chatValidation.formatted,
+                    text: messageValidation.sanitized,
+                    options
+                }, options.priority);
+            }
+            
+            return await this.messageHandler.sendMessage(chatValidation.formatted, messageValidation.sanitized, options);
+            
+        } catch (error) {
+            await this.errorHandler.handleError(error, { operation: 'sendMessage', chatId, message });
+            throw error;
         }
-        
-        const messageValidation = ValidationUtils.validateMessage(message);
-        if (!messageValidation.valid) {
-            throw new Error(`Invalid message: ${messageValidation.error}`);
-        }
-
-        // Check rate limiting
-        if (!this._checkRateLimit(chatId)) {
-            throw new Error('Rate limit exceeded for this chat');
-        }
-        
-        return await this.messageHandler.sendMessage(chatId, message, options);
     }

     /**
      * Send button message with enhanced features
      */
     async sendButtonMessage(chatId, text, buttons, options = {}) {
-        const chatValidation = ValidationUtils.validateChatId(chatId);
-        if (!chatValidation.valid) {
-            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
+        try {
+            // Validate inputs
+            const chatValidation = this.inputValidator.validate(chatId, 'chatId');
+            const textValidation = this.inputValidator.validate(text, 'message');
+            const buttonsValidation = this.inputValidator.validate(buttons, 'buttons');
+            
+            // Check rate limiting
+            if (this.rateLimiter) {
+                this.rateLimiter.checkLimit(chatId, 'sendButtonMessage');
+            }
+            
+            // Use message queue if enabled
+            if (this.messageQueue && options.useQueue !== false) {
+                return this.messageQueue.enqueue({
+                    type: 'button',
+                    chatId: chatValidation.formatted,
+                    text: textValidation.sanitized,
+                    buttons: buttonsValidation.buttons,
+                    options
+                }, options.priority);
+            }
+            
+            return await this.messageHandler.sendButtonMessage(
+                chatValidation.formatted, 
+                textValidation.sanitized, 
+                buttonsValidation.buttons, 
+                options
+            );
+            
+        } catch (error) {
+            await this.errorHandler.handleError(error, { operation: 'sendButtonMessage', chatId, text });
+            throw error;
         }
-
-        if (!Array.isArray(buttons) || buttons.length === 0) {
-            throw new Error('Buttons must be a non-empty array');
-        }
-
-        return await this.messageHandler.sendButtonMessage(chatId, text, buttons, options);
     }

     /**
      * Send list message with advanced sections
      */
     async sendListMessage(chatId, text, buttonText, sections, options = {}) {
-        const chatValidation = ValidationUtils.validateChatId(chatId);
-        if (!chatValidation.valid) {
-            throw new Error(`Invalid chat ID: ${chatValidation.error}`);
+        try {
+            // Validate inputs
+            const chatValidation = this.inputValidator.validate(chatId, 'chatId');
+            const textValidation = this.inputValidator.validate(text, 'message');
+            const buttonTextValidation = this.inputValidator.validate(buttonText, 'message');
+            const sectionsValidation = this.inputValidator.validate(sections, 'listSections');
+            
+            // Check rate limiting
+            if (this.rateLimiter) {
+                this.rateLimiter.checkLimit(chatId, 'sendListMessage');
+            }
+            
+            // Use message queue if enabled
+            if (this.messageQueue && options.useQueue !== false) {
+                return this.messageQueue.enqueue({
+                    type: 'list',
+                    chatId: chatValidation.formatted,
+                    text: textValidation.sanitized,
+                    buttonText: buttonTextValidation.sanitized,
+                    sections: sectionsValidation.sections,
+                    options
+                }, options.priority);
+            }
+            
+            return await this.messageHandler.sendListMessage(
+                chatValidation.formatted,
+                textValidation.sanitized,
+                buttonTextValidation.sanitized,
+                sectionsValidation.sections,
+                options
+            );
+            
+        } catch (error) {
+            await this.errorHandler.handleError(error, { operation: 'sendListMessage', chatId, text });
+            throw error;
         }
-
-        if (!Array.isArray(sections) || sections.length === 0) {
-            throw new Error('Sections must be a non-empty array');
-        }
-
-        return await this.messageHandler.sendListMessage(chatId, text, buttonText, sections, options);
     }

@@ .. @@
     /**
-     * Initialize WebSocket client
+     * Initialize web client
      */
     async _initializeWebClient() {
-        this.webClient = new WhatsAppWebClient({
-            userAgent: this.options.userAgent,
-            sessionManager: this.sessionManager,
-            logger: this.logger
-        });
-
-        await this.webClient.initialize();
-        
-        // Setup WebSocket connection
-        this.ws = new WebSocket(this.options.wsEndpoint, {
-            headers: {
-                'User-Agent': this.options.userAgent,
-                'Origin': 'https://web.whatsapp.com'
-            }
-        });
-
-        this.ws.on('open', () => {
-            this.isConnected = true;
-            this.emit('connected');
-            this.logger.info('WebSocket connected');
-        });
-
-        this.ws.on('message', (data) => {
-            this._handleWebSocketMessage(data);
-        });
-
-        this.ws.on('close', () => {
-            this.isConnected = false;
-            this.emit('disconnected');
-            this.logger.warn('WebSocket disconnected');
-        });
-
-        this.ws.on('error', (error) => {
-            this.logger.error('WebSocket error:', error);
-            this.emit('error', error);
-        });
+        try {
+            this.webClient = new WhatsAppWebClient({
+                userAgent: this.options.userAgent,
+                sessionManager: this.sessionManager,
+                logger: this.logger,
+                errorHandler: this.errorHandler
+            });

+            await this.webClient.initialize();
+            
+            this.connectionState = ConnectionStates.CONNECTED;
+            this.emit(EventTypes.CONNECTED);
+            
+        } catch (error) {
+            throw new ConnectionError('Failed to initialize web client', 'INIT_FAILED', { error });
+        }
     }

@@ .. @@
     /**
-     * Check rate limiting
+     * Attempt reconnection
      */
-    _checkRateLimit(chatId) {
-        const now = Date.now();
-        const windowStart = now - 60000; // 1 minute window
-        const key = `rate_limit_${chatId}`;
-        
-        let timestamps = this.rateLimiter.get(key) || [];
-        timestamps = timestamps.filter(ts => ts > windowStart);
-        
-        if (timestamps.length >= this.options.rateLimitPerMinute) {
-            return false;
+    async _attemptReconnection() {
+        try {
+            this.connectionState = ConnectionStates.RECONNECTING;
+            this.emit(EventTypes.RECONNECTING);
+            
+            await this._initializeWebClient();
+            await this._handleAuthentication();
+            
+            this.connectionState = ConnectionStates.CONNECTED;
+            this.emit(EventTypes.CONNECTED);
+            
+            return true;
+        } catch (error) {
+            this.logger.error('Reconnection failed:', error);
+            return false;
         }
-        
-        timestamps.push(now);
-        this.rateLimiter.set(key, timestamps);
-        return true;
     }

@@ .. @@
     /**
-     * Bind event handlers
+     * Check network connectivity
      */
-    _bindEventHandlers() {
-        // Auto-reconnect on disconnect
-        this.on('disconnected', () => {
-            if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
-                this.reconnectAttempts++;
-                this.logger.warn(`Attempting to reconnect... (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);
-                
-                setTimeout(() => {
-                    this.initialize();
-                }, this.options.reconnectInterval);
-            }
-        });
-
-        // Reset reconnect attempts on successful connection
-        this.on('connected', () => {
-            this.reconnectAttempts = 0;
-        });
+    async _checkNetworkConnectivity() {
+        try {
+            // Simple connectivity check
+            const response = await fetch('https://www.google.com', { 
+                method: 'HEAD',
+                timeout: 5000 
+            });
+            return response.ok;
+        } catch (error) {
+            return false;
+        }
     }

     /**
-     * Disconnect and cleanup
+     * Bind event handlers
      */
-    async disconnect() {
+    _bindEventHandlers() {
         try {
-            this.logger.info('Disconnecting ChatPulse...');
-            
-            this.isConnected = false;
-            this.isReady = false;
-            
-            if (this.ws) {
-                this.ws.close();
-                this.ws = null;
+            // Auto-reconnect on disconnect
+            this.on(EventTypes.DISCONNECTED, async () => {
+                if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
+                    this.reconnectAttempts++;
+                    this.logger.warn(`Attempting to reconnect... (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);
+                    
+                    setTimeout(async () => {
+                        await this._attemptReconnection();
+                    }, this.options.reconnectInterval);
+                }
+            });
+
+            // Reset reconnect attempts on successful connection
+            this.on(EventTypes.CONNECTED, () => {
+                this.reconnectAttempts = 0;
+            });
+            
+            // Handle errors
+            this.on(EventTypes.ERROR, (error) => {
+                this.logger.error('ChatPulse Error:', error);
+            });
+            
+        } catch (error) {
+            this.logger.error('Error binding event handlers:', error);
+        }
+    }
+
+    /**
+     * Disconnect and cleanup
+     */
+    async disconnect() {
+        try {
+            this.logger.info('Disconnecting ChatPulse...');
+            
+            this.connectionState = ConnectionStates.DISCONNECTED;
+            this.isReady = false;
+            
+            // Cleanup message queue
+            if (this.messageQueue) {
+                this.messageQueue.pause();
             }
             
+            // Disconnect web client
             if (this.webClient) {
                 await this.webClient.disconnect();
                 this.webClient = null;
             }
             
-            this.emit('disconnected');
+            this.emit(EventTypes.DISCONNECTED);
             this.logger.info('ChatPulse disconnected successfully');
             
         } catch (error) {
-            this.logger.error('Error during disconnect:', error);
+            await this.errorHandler.handleError(error, { operation: 'disconnect' });
         }
     }

@@ .. @@
 }

 module.exports = ChatPulse;