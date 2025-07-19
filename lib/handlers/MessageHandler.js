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
 * Handles all message-related operations including advanced message types
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
                    mentions: options.mentions || [],
                    parseMode: options.parseMode || 'text' // 'text', 'markdown'
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

                // Handle markdown formatting
                let content = data.content;
                if (data.options.parseMode === 'markdown') {
                    content = content
                        .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold
                        .replace(/__(.*?)__/g, '_$1_')     // Italic
                        .replace(/~~(.*?)~~/g, '~$1~')     // Strikethrough
                        .replace(/```(.*?)```/g, '```$1```'); // Code
                }

                const message = await window.Store.sendMessage(chat, content, messageOptions);
                
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
     * Send button message
     */
    async sendButtonMessage(chatId, text, buttons, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
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

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const buttonMessage = {
                    body: data.text,
                    footer: data.options.footer,
                    buttons: data.buttons.map(btn => ({
                        buttonId: btn.id,
                        buttonText: { displayText: btn.text },
                        type: 1
                    })),
                    headerType: 1
                };

                const messageOptions = {};
                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                const message = await window.Store.sendMessage(chat, buttonMessage, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'buttons',
                    buttonCount: data.buttons.length
                };
            }, messageData);

            this.logger.info(`Button message sent to ${chatId} with ${buttons.length} buttons`);
            this.client.emit('button_message_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send button message:', error);
            throw error;
        }
    }

    /**
     * Send list message
     */
    async sendListMessage(chatId, text, buttonText, sections, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
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

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const listMessage = {
                    body: data.text,
                    footer: data.options.footer,
                    buttonText: data.buttonText,
                    sections: data.sections,
                    listType: 1
                };

                const messageOptions = {};
                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                const message = await window.Store.sendMessage(chat, listMessage, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'list',
                    sectionCount: data.sections.length
                };
            }, messageData);

            this.logger.info(`List message sent to ${chatId} with ${sections.length} sections`);
            this.client.emit('list_message_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send list message:', error);
            throw error;
        }
    }

    /**
     * Send contact message
     */
    async sendContact(chatId, contact, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const messageData = {
                chatId: this._formatChatId(chatId),
                contact: {
                    name: contact.name,
                    number: contact.number,
                    organization: contact.organization || '',
                    email: contact.email || ''
                },
                options: {
                    quotedMessageId: options.quotedMessageId || null
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${data.contact.name}
TEL:${data.contact.number}
${data.contact.organization ? `ORG:${data.contact.organization}` : ''}
${data.contact.email ? `EMAIL:${data.contact.email}` : ''}
END:VCARD`;

                const contactMessage = {
                    displayName: data.contact.name,
                    vcard: vcard
                };

                const messageOptions = {};
                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                const message = await window.Store.sendMessage(chat, contactMessage, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'contact',
                    contactName: data.contact.name
                };
            }, messageData);

            this.logger.info(`Contact sent to ${chatId}: ${contact.name}`);
            this.client.emit('contact_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send contact:', error);
            throw error;
        }
    }

    /**
     * Send location message
     */
    async sendLocation(chatId, latitude, longitude, description = '', options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const messageData = {
                chatId: this._formatChatId(chatId),
                latitude: latitude,
                longitude: longitude,
                description: description,
                options: {
                    quotedMessageId: options.quotedMessageId || null
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const locationMessage = {
                    type: 'location',
                    lat: data.latitude,
                    lng: data.longitude,
                    loc: data.description
                };

                const messageOptions = {};
                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                const message = await window.Store.sendMessage(chat, locationMessage, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'location',
                    coordinates: { lat: data.latitude, lng: data.longitude }
                };
            }, messageData);

            this.logger.info(`Location sent to ${chatId}: ${latitude}, ${longitude}`);
            this.client.emit('location_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send location:', error);
            throw error;
        }
    }

    /**
     * Send poll message
     */
    async sendPoll(chatId, question, options, settings = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const messageData = {
                chatId: this._formatChatId(chatId),
                question: question,
                options: options,
                settings: {
                    multipleAnswers: settings.multipleAnswers || false,
                    quotedMessageId: settings.quotedMessageId || null
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const pollMessage = {
                    type: 'poll',
                    pollName: data.question,
                    pollOptions: data.options.map(option => ({ optionName: option })),
                    pollSelectableOptionsCount: data.settings.multipleAnswers ? data.options.length : 1
                };

                const messageOptions = {};
                if (data.settings.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.settings.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                const message = await window.Store.sendMessage(chat, pollMessage, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'poll',
                    question: data.question,
                    optionCount: data.options.length
                };
            }, messageData);

            this.logger.info(`Poll sent to ${chatId}: ${question}`);
            this.client.emit('poll_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send poll:', error);
            throw error;
        }
    }

    /**
     * Forward message
     */
    async forwardMessage(chatId, messageId, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const result = await this.client.page.evaluate(async (cId, msgId, opts) => {
                const chat = window.Store.Chat.get(cId);
                const message = window.Store.Msg.get(msgId);
                
                if (!chat) {
                    throw new Error(`Chat not found: ${cId}`);
                }
                
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                const forwardedMessage = await window.Store.forwardMessage(chat, message, opts.withoutForwardedLabel || false);
                
                return {
                    id: forwardedMessage.id._serialized,
                    timestamp: forwardedMessage.t,
                    type: 'forwarded',
                    originalMessageId: msgId
                };
            }, this._formatChatId(chatId), messageId, options);

            this.logger.info(`Message forwarded to ${chatId}`);
            this.client.emit('message_forwarded', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to forward message:', error);
            throw error;
        }
    }

    /**
     * React to message
     */
    async reactToMessage(messageId, emoji) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

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
            this.client.emit('reaction_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to react to message:', error);
            throw error;
        }
    }

    /**
     * Delete message
     */
    async deleteMessage(messageId, forEveryone = false) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const result = await this.client.page.evaluate(async (msgId, deleteForEveryone) => {
                const message = window.Store.Msg.get(msgId);
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                if (deleteForEveryone) {
                    await window.Store.revokeMsgForEveryone(message);
                } else {
                    await window.Store.deleteMessage(message);
                }
                
                return {
                    messageId: msgId,
                    deletedForEveryone: deleteForEveryone,
                    timestamp: Date.now()
                };
            }, messageId, forEveryone);

            this.logger.info(`Message deleted: ${messageId} (for everyone: ${forEveryone})`);
            this.client.emit('message_deleted', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to delete message:', error);
            throw error;
        }
    }

    /**
     * Edit message
     */
    async editMessage(messageId, newText) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const result = await this.client.page.evaluate(async (msgId, text) => {
                const message = window.Store.Msg.get(msgId);
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                await window.Store.editMessage(message, text);
                
                return {
                    messageId: msgId,
                    newText: text,
                    timestamp: Date.now()
                };
            }, messageId, newText);

            this.logger.info(`Message edited: ${messageId}`);
            this.client.emit('message_edited', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to edit message:', error);
            throw error;
        }
    }

    /**
     * Star/unstar message
     */
    async starMessage(messageId, star = true) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            const result = await this.client.page.evaluate(async (msgId, shouldStar) => {
                const message = window.Store.Msg.get(msgId);
                if (!message) {
                    throw new Error(`Message not found: ${msgId}`);
                }

                await window.Store.starMessage(message, shouldStar);
                
                return {
                    messageId: msgId,
                    starred: shouldStar,
                    timestamp: Date.now()
                };
            }, messageId, star);

            this.logger.info(`Message ${star ? 'starred' : 'unstarred'}: ${messageId}`);
            this.client.emit('message_starred', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to star message:', error);
            throw error;
        }
    }

    /**
     * Handle incoming message
     */
    handleIncomingMessage(message) {
        try {
            // Enhanced message object with more details
            const enhancedMessage = {
                ...message,
                isButton: message.type === 'buttons_response',
                isList: message.type === 'list_response',
                isPoll: message.type === 'poll_update',
                isContact: message.type === 'vcard',
                isLocation: message.type === 'location',
                hasQuotedMsg: !!message.quotedMsg,
                hasMentions: message.mentionedJidList && message.mentionedJidList.length > 0
            };

            this.client.emit('message', enhancedMessage);
            
            // Emit specific events for different message types
            if (enhancedMessage.isButton) {
                this.client.emit('button_response', enhancedMessage);
            }
            
            if (enhancedMessage.isList) {
                this.client.emit('list_response', enhancedMessage);
            }
            
            if (enhancedMessage.isPoll) {
                this.client.emit('poll_update', enhancedMessage);
            }
            
            this.logger.debug(`Message received from ${message.from}: ${message.body || message.type}`);
        } catch (error) {
            this.logger.error('Error handling incoming message:', error);
        }
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
                    ack: msg.ack,
                    hasMedia: msg.hasMedia,
                    quotedMsg: msg.quotedMsg?.id?._serialized,
                    mentionedJidList: msg.mentionedJidList?.map(jid => jid._serialized) || [],
                    starred: msg.star,
                    forwarded: msg.isForwarded
                }));
            }, this._formatChatId(chatId), limit);

            return messages;

        } catch (error) {
            this.logger.error('Failed to get message history:', error);
            throw error;
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
}

module.exports = { MessageHandler };