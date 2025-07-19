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

/**
 * Handles all message-related operations
 * Provides comprehensive message sending, receiving, and processing capabilities
 */
class MessageHandler {
    /**
     * Initialize MessageHandler
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('MessageHandler');
        this.messageQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Send a text message to a chat
     * @param {string} chatId - Target chat ID
     * @param {string} message - Message content
     * @param {Object} options - Additional options
     * @param {boolean} options.linkPreview - Enable link preview
     * @param {string} options.quotedMessageId - ID of message to quote
     * @param {Array} options.mentions - Array of mentioned contact IDs
     * @returns {Promise<Object>} Message result
     */
    async sendMessage(chatId, message, options = {}) {
        return await this._sendAdvancedMessage(chatId, message, 'text', options);
    }

    /**
     * Send advanced message with modern features
     * @param {string} chatId - Target chat ID
     * @param {string|Object} content - Message content
     * @param {string} type - Message type
     * @param {Object} options - Message options
     * @returns {Promise<Object>} Message result
     * @private
     */
    async _sendAdvancedMessage(chatId, content, type = 'text', options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const messageData = {
                chatId: this._formatChatId(chatId),
                content: content,
                type: type,
                options: {
                    linkPreview: options.linkPreview !== false,
                    quotedMessageId: options.quotedMessageId || null,
                    mentions: options.mentions || [],
                    ephemeral: options.ephemeral || false,
                    ephemeralDuration: options.ephemeralDuration || 604800, // 7 days
                    editMessageId: options.editMessageId || null,
                    forwardedFrom: options.forwardedFrom || null,
                    contextInfo: options.contextInfo || {},
                    businessCard: options.businessCard || null,
                    poll: options.poll || null,
                    location: options.location || null,
                    liveLocation: options.liveLocation || null,
                    product: options.product || null,
                    order: options.order || null,
                    payment: options.payment || null,
                    newsletter: options.newsletter || null
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                let messageContent = data.content;
                const messageOptions = {};

                // Handle different message types
                switch (data.type) {
                    case 'text':
                        messageOptions.linkPreview = data.options.linkPreview;
                        break;
                    case 'poll':
                        messageContent = {
                            pollName: data.content.question,
                            pollOptions: data.content.options,
                            pollSelectableOptionsCount: data.content.multipleAnswers ? data.content.options.length : 1
                        };
                        break;
                    case 'location':
                        messageContent = {
                            lat: data.content.latitude,
                            lng: data.content.longitude,
                            loc: data.content.name || 'Location'
                        };
                        break;
                    case 'contact':
                        messageContent = {
                            displayName: data.content.name,
                            vcard: data.content.vcard
                        };
                        break;
                    case 'product':
                        messageContent = {
                            productId: data.content.id,
                            businessOwnerJid: data.content.businessJid,
                            productImageCount: data.content.imageCount || 1
                        };
                        break;
                }

                // Add ephemeral settings
                if (data.options.ephemeral) {
                    messageOptions.ephemeralDuration = data.options.ephemeralDuration;
                }

                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                if (data.options.mentions.length > 0) {
                    messageOptions.mentionedJidList = data.options.mentions;
                }

                // Handle message editing
                if (data.options.editMessageId) {
                    const originalMessage = window.Store.Msg.get(data.options.editMessageId);
                    if (originalMessage) {
                        const editedMessage = await window.Store.editMessage(originalMessage, messageContent);
                        return {
                            id: editedMessage.id._serialized,
                            timestamp: editedMessage.t,
                            ack: editedMessage.ack,
                            type: 'edit',
                            originalId: data.options.editMessageId
                        };
                    }
                }

                // Add context info
                if (data.options.contextInfo && Object.keys(data.options.contextInfo).length > 0) {
                    messageOptions.contextInfo = data.options.contextInfo;
                }

                const message = await window.Store.sendMessage(chat, messageContent, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    ack: message.ack,
                    from: message.from._serialized,
                    to: message.to._serialized,
                    type: data.type
                };
            }, messageData);

            this.logger.info(`${type} message sent to ${chatId}`);
            this.client.emit('message_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Send poll message
     * @param {string} chatId - Target chat ID
     * @param {string} question - Poll question
     * @param {Array} options - Poll options
     * @param {Object} settings - Poll settings
     * @returns {Promise<Object>} Message result
     */
    async sendPoll(chatId, question, options, settings = {}) {
        const pollData = {
            question: question,
            options: options.map(opt => ({ name: opt })),
            multipleAnswers: settings.multipleAnswers || false,
            selectableCount: settings.selectableCount || 1
        };

        return await this._sendAdvancedMessage(chatId, pollData, 'poll', settings);
    }

    /**
     * Send location message
     * @param {string} chatId - Target chat ID
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {Object} options - Location options
     * @returns {Promise<Object>} Message result
     */
    async sendLocation(chatId, latitude, longitude, options = {}) {
        const locationData = {
            latitude: latitude,
            longitude: longitude,
            name: options.name || 'Location',
            address: options.address || ''
        };

        return await this._sendAdvancedMessage(chatId, locationData, 'location', options);
    }

    /**
     * Send live location
     * @param {string} chatId - Target chat ID
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {Object} options - Live location options
     * @returns {Promise<Object>} Message result
     */
    async sendLiveLocation(chatId, latitude, longitude, options = {}) {
        const liveLocationData = {
            latitude: latitude,
            longitude: longitude,
            accuracy: options.accuracy || 10,
            speed: options.speed || 0,
            duration: options.duration || 3600, // 1 hour
            comment: options.comment || ''
        };

        return await this._sendAdvancedMessage(chatId, liveLocationData, 'liveLocation', options);
    }

    /**
     * Send contact message
     * @param {string} chatId - Target chat ID
     * @param {Object} contact - Contact information
     * @param {Object} options - Contact options
     * @returns {Promise<Object>} Message result
     */
    async sendContact(chatId, contact, options = {}) {
        const contactData = {
            name: contact.name,
            vcard: contact.vcard || this._generateVCard(contact)
        };

        return await this._sendAdvancedMessage(chatId, contactData, 'contact', options);
    }

    /**
     * Send product message
     * @param {string} chatId - Target chat ID
     * @param {Object} product - Product information
     * @param {Object} options - Product options
     * @returns {Promise<Object>} Message result
     */
    async sendProduct(chatId, product, options = {}) {
        const productData = {
            id: product.id,
            businessJid: product.businessJid,
            imageCount: product.imageCount || 1,
            title: product.title,
            description: product.description,
            price: product.price,
            currency: product.currency || 'USD'
        };

        return await this._sendAdvancedMessage(chatId, productData, 'product', options);
    }

    /**
     * Send order message
     * @param {string} chatId - Target chat ID
     * @param {Object} order - Order information
     * @param {Object} options - Order options
     * @returns {Promise<Object>} Message result
     */
    async sendOrder(chatId, order, options = {}) {
        const orderData = {
            orderId: order.id,
            items: order.items,
            total: order.total,
            currency: order.currency || 'USD',
            status: order.status || 'pending'
        };

        return await this._sendAdvancedMessage(chatId, orderData, 'order', options);
    }

    /**
     * Send payment message
     * @param {string} chatId - Target chat ID
     * @param {Object} payment - Payment information
     * @param {Object} options - Payment options
     * @returns {Promise<Object>} Message result
     */
    async sendPayment(chatId, payment, options = {}) {
        const paymentData = {
            amount: payment.amount,
            currency: payment.currency,
            note: payment.note || '',
            requestFrom: payment.requestFrom || null
        };

        return await this._sendAdvancedMessage(chatId, paymentData, 'payment', options);
    }

    /**
     * Edit a message
     * @param {string} messageId - Message ID to edit
     * @param {string} newContent - New message content
     * @param {Object} options - Edit options
     * @returns {Promise<Object>} Edit result
     */
    async editMessage(messageId, newContent, options = {}) {
        try {
            const result = await this.client.page.evaluate(async (msgId, content, opts) => {
                const message = window.Store.Msg.get(msgId);
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                const editedMessage = await window.Store.editMessage(message, content);
                
                return {
                    id: editedMessage.id._serialized,
                    originalId: msgId,
                    newContent: content,
                    timestamp: editedMessage.t,
                    editedAt: Date.now()
                };
            }, messageId, newContent, options);

            this.logger.info(`Message edited: ${messageId}`);
            this.client.emit('message_edited', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to edit message:', error);
            throw error;
        }
    }

    /**
     * Send ephemeral (disappearing) message
     * @param {string} chatId - Target chat ID
     * @param {string} message - Message content
     * @param {number} duration - Duration in seconds
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Message result
     */
    async sendEphemeralMessage(chatId, message, duration = 604800, options = {}) {
        return await this.sendMessage(chatId, message, {
            ...options,
            ephemeral: true,
            ephemeralDuration: duration
        });
    }

    /**
     * Forward message
     * @param {string} messageId - Message ID to forward
     * @param {string|Array} chatIds - Target chat ID(s)
     * @param {Object} options - Forward options
     * @returns {Promise<Array>} Forward results
     */
    async forwardMessage(messageId, chatIds, options = {}) {
        try {
            const targetChats = Array.isArray(chatIds) ? chatIds : [chatIds];
            const results = [];

            for (const chatId of targetChats) {
                const result = await this.client.page.evaluate(async (msgId, targetChatId, opts) => {
                    const message = window.Store.Msg.get(msgId);
                    const targetChat = window.Store.Chat.get(targetChatId);
                    
                    if (!message || !targetChat) {
                        throw new Error('Message or target chat not found');
                    }

                    const forwardedMessage = await window.Store.forwardMessage(targetChat, message, opts.withoutForwardedLabel);
                    
                    return {
                        id: forwardedMessage.id._serialized,
                        originalId: msgId,
                        targetChat: targetChatId,
                        timestamp: forwardedMessage.t
                    };
                }, messageId, this._formatChatId(chatId), options);

                results.push(result);
            }

            this.logger.info(`Message forwarded to ${targetChats.length} chats`);
            this.client.emit('message_forwarded', { messageId, results });
            
            return results;

        } catch (error) {
            this.logger.error('Failed to forward message:', error);
            throw error;
        }
    }

    /**
     * Pin/unpin a message
     * @param {string} messageId - Message ID
     * @param {boolean} pin - Pin or unpin
     * @returns {Promise<boolean>} Pin success
     */
    async pinMessage(messageId, pin = true) {
        try {
            const result = await this.client.page.evaluate(async (msgId, shouldPin) => {
                const message = window.Store.Msg.get(msgId);
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                if (shouldPin) {
                    await window.Store.pinMessage(message);
                } else {
                    await window.Store.unpinMessage(message);
                }
                
                return true;
            }, messageId, pin);

            this.logger.info(`Message ${pin ? 'pinned' : 'unpinned'}: ${messageId}`);
            this.client.emit('message_pinned', { messageId, pinned: pin });
            
            return result;

        } catch (error) {
            this.logger.error(`Failed to ${pin ? 'pin' : 'unpin'} message:`, error);
            return false;
        }
    }

    /**
     * Star/unstar a message
     * @param {string} messageId - Message ID
     * @param {boolean} star - Star or unstar
     * @returns {Promise<boolean>} Star success
     */
    async starMessage(messageId, star = true) {
        try {
            const result = await this.client.page.evaluate(async (msgId, shouldStar) => {
                const message = window.Store.Msg.get(msgId);
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                if (shouldStar) {
                    await window.Store.starMessage(message);
                } else {
                    await window.Store.unstarMessage(message);
                }
                
                return true;
            }, messageId, star);

            this.logger.info(`Message ${star ? 'starred' : 'unstarred'}: ${messageId}`);
            this.client.emit('message_starred', { messageId, starred: star });
            
            return result;

        } catch (error) {
            this.logger.error(`Failed to ${star ? 'star' : 'unstar'} message:`, error);
            return false;
        }
    }

    /**
     * Generate vCard for contact
     * @param {Object} contact - Contact information
     * @returns {string} vCard string
     * @private
     */
    _generateVCard(contact) {
        let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
        vcard += `FN:${contact.name}\n`;
        
        if (contact.phone) {
            vcard += `TEL:${contact.phone}\n`;
        }
        
        if (contact.email) {
            vcard += `EMAIL:${contact.email}\n`;
        }
        
        if (contact.organization) {
            vcard += `ORG:${contact.organization}\n`;
        }
        
        if (contact.url) {
            vcard += `URL:${contact.url}\n`;
        }
        
        vcard += 'END:VCARD';
        return vcard;
    }
    /**
     * Send a message with buttons
     * @param {string} chatId - Target chat ID
     * @param {string} text - Message text
     * @param {Array} buttons - Array of button objects
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Message result
     */
    async sendButtonMessage(chatId, text, buttons, options = {}) {
        try {
            const buttonData = {
                chatId: this._formatChatId(chatId),
                text: text,
                buttons: buttons.map((btn, index) => ({
                    buttonId: btn.id || `btn_${index}`,
                    buttonText: { displayText: btn.text },
                    type: 1
                })),
                headerType: 1
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                // Create button message structure
                const buttonMessage = {
                    body: data.text,
                    footer: data.footer || '',
                    buttons: data.buttons,
                    headerType: data.headerType
                };

                const message = await window.Store.sendMessage(chat, buttonMessage);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'buttons'
                };
            }, buttonData);

            this.logger.info(`Button message sent to ${chatId}`);
            return result;

        } catch (error) {
            this.logger.error('Failed to send button message:', error);
            throw error;
        }
    }

    /**
     * Send a list message
     * @param {string} chatId - Target chat ID
     * @param {string} text - Message text
     * @param {string} buttonText - List button text
     * @param {Array} sections - Array of list sections
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Message result
     */
    async sendListMessage(chatId, text, buttonText, sections, options = {}) {
        try {
            const listData = {
                chatId: this._formatChatId(chatId),
                text: text,
                buttonText: buttonText,
                sections: sections.map(section => ({
                    title: section.title,
                    rows: section.rows.map((row, index) => ({
                        rowId: row.id || `row_${index}`,
                        title: row.title,
                        description: row.description || ''
                    }))
                }))
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const listMessage = {
                    body: data.text,
                    buttonText: data.buttonText,
                    sections: data.sections,
                    listType: 1
                };

                const message = await window.Store.sendMessage(chat, listMessage);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'list'
                };
            }, listData);

            this.logger.info(`List message sent to ${chatId}`);
            return result;

        } catch (error) {
            this.logger.error('Failed to send list message:', error);
            throw error;
        }
    }

    /**
     * React to a message
     * @param {string} messageId - Message ID to react to
     * @param {string} emoji - Emoji reaction
     * @returns {Promise<Object>} Reaction result
     */
    async reactToMessage(messageId, emoji) {
        try {
            const result = await this.client.page.evaluate(async (msgId, reaction) => {
                const message = window.Store.Msg.get(msgId);
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                await window.Store.sendReaction(message, reaction);
                
                return {
                    messageId: msgId,
                    reaction: reaction,
                    timestamp: Date.now()
                };
            }, messageId, emoji);

            this.logger.info(`Reaction sent: ${emoji} to message ${messageId}`);
            return result;

        } catch (error) {
            this.logger.error('Failed to send reaction:', error);
            throw error;
        }
    }

    /**
     * Delete a message
     * @param {string} messageId - Message ID to delete
     * @param {boolean} forEveryone - Delete for everyone (if within time limit)
     * @returns {Promise<boolean>} Deletion success
     */
    async deleteMessage(messageId, forEveryone = false) {
        try {
            const result = await this.client.page.evaluate(async (msgId, deleteForAll) => {
                const message = window.Store.Msg.get(msgId);
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                if (deleteForAll) {
                    await window.Store.revokeMsgForAll(message);
                } else {
                    await window.Store.revokeMsg(message);
                }
                
                return true;
            }, messageId, forEveryone);

            this.logger.info(`Message deleted: ${messageId} (forEveryone: ${forEveryone})`);
            return result;

        } catch (error) {
            this.logger.error('Failed to delete message:', error);
            throw error;
        }
    }

    /**
     * Handle incoming message
     * @param {Object} message - Incoming message data
     */
    handleIncomingMessage(message) {
        try {
            // Process message through plugins
            this.client.pluginManager.processMessage(message);
            
            // Emit message event
            this.client.emit('message', message);
            
            this.logger.debug(`Message received from ${message.from}: ${message.body}`);

        } catch (error) {
            this.logger.error('Error handling incoming message:', error);
        }
    }

    /**
     * Format chat ID to ensure proper format
     * @param {string} chatId - Raw chat ID
     * @returns {string} Formatted chat ID
     * @private
     */
    _formatChatId(chatId) {
        // Remove any non-numeric characters except @ and -
        let formatted = chatId.replace(/[^\d@-]/g, '');
        
        // Add @c.us suffix for individual chats if not present
        if (!formatted.includes('@')) {
            if (formatted.includes('-')) {
                // Group chat
                formatted += '@g.us';
            } else {
                // Individual chat
                formatted += '@c.us';
            }
        }
        
        return formatted;
    }

    /**
     * Get message history for a chat
     * @param {string} chatId - Chat ID
     * @param {number} limit - Number of messages to retrieve
     * @returns {Promise<Array>} Array of messages
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