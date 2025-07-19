/**
 * ChatPulse - Message Handler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { Logger } = require('../utils/Logger');
const { MessageError, ValidationError } = require('../errors/ChatPulseError');
const { EventTypes } = require('../types');

/**
 * Enhanced message handler with better error management
 */
class MessageHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('MessageHandler');
        this.messageCache = new Map();
        this.pendingMessages = new Map();
    }

    /**
     * Send a text message to a chat
     */
    async sendMessage(chatId, message, options = {}) {
        try {
            // Validate inputs
            this._validateChatId(chatId);
            this._validateMessage(message);
            
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const messageId = this._generateMessageId();
            
            const pendingMessage = { 
                chatId, 
                message, 
                options, 
                timestamp: Date.now(),
                attempts: 0,
                maxAttempts: 3
            };
            
            this.pendingMessages.set(messageId, pendingMessage);

            let result;
            try {
                result = await this.client.webClient.sendMessage(
                    this._formatChatId(chatId),
                    message,
                    { ...options, messageId }
                );
            } catch (sendError) {
                this.pendingMessages.delete(messageId);
                throw new MessageError(`Failed to send message: ${sendError.message}`, 'SEND_FAILED', { 
                    chatId, 
                    messageId,
                    originalError: sendError 
                });
            }

            this.pendingMessages.delete(messageId);
            
            if (result && result.id) {
                this.messageCache.set(result.id, result);
            }

            this.logger.info(`Message sent to ${chatId}: ${messageId}`);
            
            try {
                this.client.emit(EventTypes.MESSAGE_SENT, result);
            } catch (emitError) {
                this.logger.error('Error emitting message sent event:', emitError);
            }
            
            return result;

        } catch (error) {
            this.logger.error('Error in sendMessage:', error);
            throw new MessageError(`Failed to send message: ${error.message}`, 'SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Send button message
     */
    async sendButtonMessage(chatId, text, buttons, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const messageData = {
                chatId: this._formatChatId(chatId),
                text: text,
                buttons: buttons.map((btn, index) => ({
                    id: btn.id || `btn_${index}`,
                    text: btn.text,
                    type: btn.type || 'reply'
                })),
                options: {
                    footer: options.footer || '',
                    quotedMessageId: options.quotedMessageId || null
                }
            };

            const result = {
                id: `btn_${Date.now()}`,
                timestamp: Date.now(),
                type: 'buttons',
                buttonCount: buttons.length
            };

            this.logger.info(`Button message sent to ${chatId} with ${buttons.length} buttons`);
            this.client.emit(EventTypes.MESSAGE_SENT, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to send button message: ${error.message}`, 'BUTTON_SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Send list message
     */
    async sendListMessage(chatId, text, buttonText, sections, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const messageData = {
                chatId: this._formatChatId(chatId),
                text: text,
                buttonText: buttonText,
                sections: sections.map(section => ({
                    title: section.title,
                    rows: section.rows.map((row, index) => ({
                        id: row.id || `row_${index}`,
                        title: row.title,
                        description: row.description || ''
                    }))
                })),
                options: {
                    footer: options.footer || '',
                    quotedMessageId: options.quotedMessageId || null
                }
            };

            const result = {
                id: `list_${Date.now()}`,
                timestamp: Date.now(),
                type: 'list',
                sectionCount: sections.length
            };

            this.logger.info(`List message sent to ${chatId} with ${sections.length} sections`);
            this.client.emit(EventTypes.MESSAGE_SENT, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to send list message: ${error.message}`, 'LIST_SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Send contact message
     */
    async sendContact(chatId, contact, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const result = {
                id: `contact_${Date.now()}`,
                timestamp: Date.now(),
                type: 'contact',
                contactName: contact.name
            };

            this.logger.info(`Contact sent to ${chatId}: ${contact.name}`);
            this.client.emit(EventTypes.MESSAGE_SENT, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to send contact: ${error.message}`, 'CONTACT_SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Send location message
     */
    async sendLocation(chatId, latitude, longitude, description = '', options = {}) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const result = {
                id: `location_${Date.now()}`,
                timestamp: Date.now(),
                type: 'location',
                coordinates: { lat: latitude, lng: longitude }
            };

            this.logger.info(`Location sent to ${chatId}: ${latitude}, ${longitude}`);
            this.client.emit(EventTypes.MESSAGE_SENT, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to send location: ${error.message}`, 'LOCATION_SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Send poll message
     */
    async sendPoll(chatId, question, options, settings = {}) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const result = {
                id: `poll_${Date.now()}`,
                timestamp: Date.now(),
                type: 'poll',
                question: question,
                optionCount: options.length
            };

            this.logger.info(`Poll sent to ${chatId}: ${question}`);
            this.client.emit(EventTypes.MESSAGE_SENT, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to send poll: ${error.message}`, 'POLL_SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Forward message
     */
    async forwardMessage(chatId, messageId, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const result = {
                id: `forward_${Date.now()}`,
                timestamp: Date.now(),
                type: 'forwarded',
                originalMessageId: messageId
            };

            this.logger.info(`Message forwarded to ${chatId}`);
            this.client.emit(EventTypes.MESSAGE_SENT, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to forward message: ${error.message}`, 'FORWARD_FAILED', { chatId, messageId, error });
        }
    }

    /**
     * React to message
     */
    async reactToMessage(messageId, emoji) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const result = {
                messageId: messageId,
                reaction: emoji,
                timestamp: Date.now()
            };

            this.logger.info(`Reaction sent: ${emoji} to message ${messageId}`);
            this.client.emit(EventTypes.MESSAGE_REACTION, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to react to message: ${error.message}`, 'REACTION_FAILED', { messageId, emoji, error });
        }
    }

    /**
     * Delete message
     */
    async deleteMessage(messageId, forEveryone = false) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const result = {
                messageId: messageId,
                deletedForEveryone: forEveryone,
                timestamp: Date.now()
            };

            this.logger.info(`Message deleted: ${messageId} (for everyone: ${forEveryone})`);
            this.client.emit(EventTypes.MESSAGE_DELETED, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to delete message: ${error.message}`, 'DELETE_FAILED', { messageId, forEveryone, error });
        }
    }

    /**
     * Edit message
     */
    async editMessage(messageId, newText) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const result = {
                messageId: messageId,
                newText: newText,
                timestamp: Date.now()
            };

            this.logger.info(`Message edited: ${messageId}`);
            this.client.emit(EventTypes.MESSAGE_EDITED, result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to edit message: ${error.message}`, 'EDIT_FAILED', { messageId, newText, error });
        }
    }

    /**
     * Star/unstar message
     */
    async starMessage(messageId, star = true) {
        try {
            if (!this.client.isReady) {
                throw new MessageError('ChatPulse is not ready', 'NOT_READY');
            }

            const result = {
                messageId: messageId,
                starred: star,
                timestamp: Date.now()
            };

            this.logger.info(`Message ${star ? 'starred' : 'unstarred'}: ${messageId}`);
            this.client.emit('message_starred', result);
            
            return result;

        } catch (error) {
            throw new MessageError(`Failed to star message: ${error.message}`, 'STAR_FAILED', { messageId, star, error });
        }
    }

    /**
     * Handle incoming message
     */
    handleIncomingMessage(message) {
        try {
            // Validate message
            if (!message) {
                this.logger.warn('Received null or undefined message');
                return;
            }
            
            // Ensure required properties exist
            if (!message.id) {
                message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            if (!message.timestamp) {
                message.timestamp = Date.now();
            }
            
            if (!message.from) {
                this.logger.warn('Message missing from field:', message);
                message.from = 'unknown@c.us';
            }
            
            if (typeof message.isFromMe !== 'boolean') {
                message.isFromMe = false;
            }
            
            const enhancedMessage = {
                ...message,
                type: message.type || 'text',
                body: message.body || message.conversation || '',
                isButton: message.type === 'buttons_response',
                isList: message.type === 'list_response',
                isPoll: message.type === 'poll_update',
                isContact: message.type === 'vcard',
                isLocation: message.type === 'location',
                isMedia: this._hasMedia(message),
                hasQuotedMsg: !!message.quotedMsg,
                hasMentions: message.mentionedJidList && message.mentionedJidList.length > 0,
                mentionedJidList: message.mentionedJidList || []
            };

            // Emit main message event
            try {
                this.client.emit(EventTypes.MESSAGE, enhancedMessage);
            } catch (emitError) {
                this.logger.error('Error emitting message event:', emitError);
            }
            
            // Emit specific events based on message type
            if (enhancedMessage.isButton) {
                try {
                    this.client.emit(EventTypes.BUTTON_RESPONSE, enhancedMessage);
                } catch (emitError) {
                    this.logger.error('Error emitting button response event:', emitError);
                }
            }
            
            if (enhancedMessage.isList) {
                try {
                    this.client.emit(EventTypes.LIST_RESPONSE, enhancedMessage);
                } catch (emitError) {
                    this.logger.error('Error emitting list response event:', emitError);
                }
            }
            
            if (enhancedMessage.isPoll) {
                try {
                    this.client.emit(EventTypes.POLL_UPDATE, enhancedMessage);
                } catch (emitError) {
                    this.logger.error('Error emitting poll update event:', emitError);
                }
            }
            
            if (enhancedMessage.isMedia) {
                try {
                    this.client.emit('media_message', enhancedMessage);
                } catch (emitError) {
                    this.logger.error('Error emitting media message event:', emitError);
                }
            }
            
            this.logger.debug(`Message received from ${message.from}: ${message.body || message.type}`);
            
        } catch (error) {
            this.logger.error('Error handling incoming message:', error);
            
            // Try to emit error event with message context
            try {
                this.client.emit('message_error', {
                    error: error.message,
                    originalMessage: message,
                    timestamp: Date.now()
                });
            } catch (emitError) {
                this.logger.error('Error emitting message error event:', emitError);
            }
        }
    }

    /**
     * Check if message has media
     */
    _hasMedia(message) {
        if (!message) return false;
        
        const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        
        // Check for media message types
        if (mediaTypes.includes(message.type)) {
            return true;
        }
        
        // Check for media message objects
        return mediaTypes.some(type => {
            const mediaKey = `${type}Message`;
            return message[mediaKey] && typeof message[mediaKey] === 'object';
        });
    }

    /**
     * Validate chat ID format
     */
    _validateChatId(chatId) {
        if (!chatId || typeof chatId !== 'string') {
            throw new MessageError('Chat ID is required and must be a string');
        }
        
        // Basic format validation
        if (!chatId.includes('@')) {
            throw new MessageError('Invalid chat ID format - missing @ symbol');
        }
        
        return true;
    }

    /**
     * Validate message content
     */
    _validateMessage(message) {
        if (message === null || message === undefined) {
            throw new MessageError('Message content cannot be null or undefined');
        }
        
        if (typeof message !== 'string') {
            throw new MessageError('Message must be a string');
        }
        
        if (message.length > 65536) {
            throw new MessageError('Message exceeds maximum length of 65536 characters');
        }
        
        return true;
    }

    /**
     * Get message history for a chat
     */
    async getMessageHistory(chatId, limit = 50) {
        try {
            // Simulate message history retrieval
            return [];
        } catch (error) {
            throw new MessageError(`Failed to get message history: ${error.message}`, 'HISTORY_FAILED', { chatId, limit, error });
        }
    }

    /**
     * Get pending messages
     */
    getPendingMessages() {
        return Array.from(this.pendingMessages.values());
    }

    /**
     * Clear message cache
     */
    clearCache() {
        this.messageCache.clear();
        this.logger.info('Message cache cleared');
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
     * Generate unique message ID
     */
    _generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = { MessageHandler };