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
const { Logger } = require('../utils/Logger');

/**
 * WebSocket Handler for real-time WhatsApp Web communication
 * Provides real-time message updates and connection monitoring
 */
class WebSocketHandler {
    /**
     * Initialize WebSocketHandler
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('WebSocketHandler');
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.heartbeatInterval = null;
        this.messageQueue = [];
        this.eventHandlers = new Map();
    }

    /**
     * Initialize WebSocket connection
     * @param {Object} options - WebSocket options
     */
    async initialize(options = {}) {
        this.options = {
            url: 'wss://web.whatsapp.com/ws/chat',
            protocols: ['chat'],
            timeout: 30000,
            heartbeatInterval: 30000,
            enableCompression: true,
            ...options
        };

        await this._setupWebSocketConnection();
    }

    /**
     * Setup WebSocket connection
     * @private
     */
    async _setupWebSocketConnection() {
        try {
            // Extract WebSocket URL from WhatsApp Web
            const wsUrl = await this.client.page.evaluate(() => {
                // Try to find WebSocket connection info
                if (window.Store && window.Store.Socket) {
                    return window.Store.Socket.url || 'wss://web.whatsapp.com/ws/chat';
                }
                return 'wss://web.whatsapp.com/ws/chat';
            });

            this.ws = new WebSocket(wsUrl, this.options.protocols, {
                timeout: this.options.timeout,
                compression: this.options.enableCompression
            });

            this._setupEventHandlers();
            
        } catch (error) {
            this.logger.error('Failed to setup WebSocket connection:', error);
            throw error;
        }
    }

    /**
     * Setup WebSocket event handlers
     * @private
     */
    _setupEventHandlers() {
        this.ws.on('open', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.logger.info('WebSocket connected');
            
            this._startHeartbeat();
            this._processMessageQueue();
            
            this.client.emit('websocket_connected');
        });

        this.ws.on('message', (data) => {
            this._handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
            this.isConnected = false;
            this._stopHeartbeat();
            
            this.logger.warn(`WebSocket closed: ${code} - ${reason}`);
            this.client.emit('websocket_disconnected', { code, reason });
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this._attemptReconnect();
            }
        });

        this.ws.on('error', (error) => {
            this.logger.error('WebSocket error:', error);
            this.client.emit('websocket_error', error);
        });

        this.ws.on('ping', (data) => {
            this.ws.pong(data);
        });

        this.ws.on('pong', () => {
            this.logger.debug('WebSocket pong received');
        });
    }

    /**
     * Handle incoming WebSocket message
     * @param {Buffer} data - Message data
     * @private
     */
    _handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            
            // Route message to appropriate handler
            switch (message.type) {
                case 'message':
                    this._handleIncomingMessage(message);
                    break;
                case 'presence':
                    this._handlePresenceUpdate(message);
                    break;
                case 'typing':
                    this._handleTypingIndicator(message);
                    break;
                case 'receipt':
                    this._handleMessageReceipt(message);
                    break;
                case 'notification':
                    this._handleNotification(message);
                    break;
                default:
                    this.logger.debug('Unknown message type:', message.type);
            }
            
            // Emit raw message event
            this.client.emit('websocket_message', message);
            
        } catch (error) {
            this.logger.error('Failed to handle WebSocket message:', error);
        }
    }

    /**
     * Handle incoming message
     * @param {Object} message - Message object
     * @private
     */
    _handleIncomingMessage(message) {
        this.client.emit('message_realtime', message);
        this.logger.debug('Real-time message received:', message.id);
    }

    /**
     * Handle presence update
     * @param {Object} presence - Presence object
     * @private
     */
    _handlePresenceUpdate(presence) {
        this.client.emit('presence_update', presence);
        this.logger.debug('Presence update:', presence.from, presence.status);
    }

    /**
     * Handle typing indicator
     * @param {Object} typing - Typing object
     * @private
     */
    _handleTypingIndicator(typing) {
        this.client.emit('typing', typing);
        this.logger.debug('Typing indicator:', typing.from, typing.state);
    }

    /**
     * Handle message receipt
     * @param {Object} receipt - Receipt object
     * @private
     */
    _handleMessageReceipt(receipt) {
        this.client.emit('message_receipt', receipt);
        this.logger.debug('Message receipt:', receipt.messageId, receipt.status);
    }

    /**
     * Handle notification
     * @param {Object} notification - Notification object
     * @private
     */
    _handleNotification(notification) {
        this.client.emit('notification', notification);
        this.logger.debug('Notification:', notification.type);
    }

    /**
     * Send message through WebSocket
     * @param {Object} message - Message to send
     * @returns {Promise<boolean>} Send success
     */
    async sendMessage(message) {
        if (!this.isConnected) {
            this.messageQueue.push(message);
            return false;
        }

        try {
            const data = JSON.stringify(message);
            this.ws.send(data);
            
            this.logger.debug('Message sent via WebSocket:', message.id);
            return true;
            
        } catch (error) {
            this.logger.error('Failed to send WebSocket message:', error);
            return false;
        }
    }

    /**
     * Start heartbeat
     * @private
     */
    _startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.ws.ping();
            }
        }, this.options.heartbeatInterval);
    }

    /**
     * Stop heartbeat
     * @private
     */
    _stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Process queued messages
     * @private
     */
    _processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }

    /**
     * Attempt reconnection
     * @private
     */
    _attemptReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        this.logger.info(`Attempting WebSocket reconnection in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this._setupWebSocketConnection();
        }, delay);
    }

    /**
     * Subscribe to presence updates
     * @param {string} chatId - Chat ID to subscribe to
     */
    async subscribeToPresence(chatId) {
        const message = {
            type: 'presence_subscribe',
            chatId: chatId,
            timestamp: Date.now()
        };
        
        await this.sendMessage(message);
    }

    /**
     * Unsubscribe from presence updates
     * @param {string} chatId - Chat ID to unsubscribe from
     */
    async unsubscribeFromPresence(chatId) {
        const message = {
            type: 'presence_unsubscribe',
            chatId: chatId,
            timestamp: Date.now()
        };
        
        await this.sendMessage(message);
    }

    /**
     * Send typing indicator
     * @param {string} chatId - Chat ID
     * @param {boolean} isTyping - Typing state
     */
    async sendTyping(chatId, isTyping = true) {
        const message = {
            type: 'typing',
            chatId: chatId,
            state: isTyping ? 'composing' : 'paused',
            timestamp: Date.now()
        };
        
        await this.sendMessage(message);
    }

    /**
     * Mark message as read
     * @param {string} messageId - Message ID
     * @param {string} chatId - Chat ID
     */
    async markAsRead(messageId, chatId) {
        const message = {
            type: 'receipt',
            messageId: messageId,
            chatId: chatId,
            status: 'read',
            timestamp: Date.now()
        };
        
        await this.sendMessage(message);
    }

    /**
     * Get connection status
     * @returns {Object} Connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED
        };
    }

    /**
     * Close WebSocket connection
     */
    async close() {
        this._stopHeartbeat();
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, 'Client disconnect');
        }
        
        this.isConnected = false;
        this.logger.info('WebSocket connection closed');
    }
}

module.exports = { WebSocketHandler };