/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { Logger } = require('../utils/Logger');
const { ValidationUtils } = require('../utils/ValidationUtils');

/**
 * Handles all message-related operations
 */
class MessageHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('MessageHandler');
    }

    /**
     * Send a text message to a chat
     */
    async sendMessage(chatId, message, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const messageData = {
                chatId: this._formatChatId(chatId),
                content: message,
                options: {
                    linkPreview: options.linkPreview !== false,
                    quotedMessageId: options.quotedMessageId || null,
                    mentions: options.mentions || []
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const messageOptions = {};

                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                if (data.options.mentions.length > 0) {
                    messageOptions.mentionedJidList = data.options.mentions;
                }

                const message = await window.Store.sendMessage(chat, data.content, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    ack: message.ack,
                    from: message.from._serialized,
                    to: message.to._serialized
                };
            }, messageData);

            this.logger.info(`Message sent to ${chatId}`);
            this.client.emit('message_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Handle incoming message
     */
    handleIncomingMessage(message) {
        try {
            this.client.emit('message', message);
            this.logger.debug(`Message received from ${message.from}: ${message.body}`);
        } catch (error) {
            this.logger.error('Error handling incoming message:', error);
        }
    }

    /**
     * Format chat ID to ensure proper format
     */
    _formatChatId(chatId) {
        let formatted = chatId.replace(/[^\d@-]/g, '');
        
        if (!formatted.includes('@')) {
            if (formatted.includes('-')) {
                formatted += '@g.us';
            } else {
                formatted += '@c.us';
            }
        }
        
        return formatted;
    }

    /**
     * Get message history for a chat
     */
    async getMessageHistory(chatId, limit = 50) {
        try {
            const messages = await this.client.page.evaluate(async (id, msgLimit) => {
                const chat = window.Store.Chat.get(id);
                if (!chat) {
                    throw new Error(`Chat not found: ${id}`);
                }

                await chat.loadEarlierMsgs();
                
                return chat.msgs.models.slice(-msgLimit).map(msg => ({
                    id: msg.id._serialized,
                    from: msg.from._serialized,
                    to: msg.to._serialized,
                    body: msg.body,
                    type: msg.type,
                    timestamp: msg.t,
                    isFromMe: msg.isFromMe,
                    ack: msg.ack
                }));
            }, this._formatChatId(chatId), limit);

            return messages;

        } catch (error) {
            this.logger.error('Failed to get message history:', error);
            throw error;
        }
    }
}

module.exports = { MessageHandler };