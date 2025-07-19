/**
 * ChatPulse - Protocol Handler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const pino = require('pino');
const { MessageError } = require('../errors/ChatPulseError');

/**
 * Protocol handler for WhatsApp message parsing
 */
class ProtocolHandler {
    constructor(client) {
        this.client = client;
        this.logger = pino({ name: 'ProtocolHandler' });
    }

    /**
     * Parse incoming message
     */
    async parseMessage(data) {
        try {
            // Handle different data types
            let messageData;
            
            if (Buffer.isBuffer(data)) {
                messageData = this._parseProtobufMessage(data);
            } else if (typeof data === 'string') {
                messageData = JSON.parse(data);
            } else {
                messageData = data;
            }

            // Enhance message with additional properties
            const enhancedMessage = this._enhanceMessage(messageData);
            
            this.logger.debug('Message parsed successfully');
            return enhancedMessage;

        } catch (error) {
            throw new MessageError(`Failed to parse message: ${error.message}`, 'PARSE_FAILED', { error });
        }
    }

    /**
     * Serialize message for sending
     */
    async serializeMessage(message) {
        try {
            if (!this.client.protocolRoot) {
                // Fallback to JSON serialization
                return JSON.stringify(message);
            }

            // Use protobuf serialization
            const WAMessage = this.client.protocolRoot.lookupType('WAMessage');
            const errMsg = WAMessage.verify(message);
            
            if (errMsg) {
                throw new Error(`Message verification failed: ${errMsg}`);
            }

            const messageObj = WAMessage.create(message);
            const buffer = WAMessage.encode(messageObj).finish();
            
            this.logger.debug('Message serialized successfully');
            return buffer;

        } catch (error) {
            throw new MessageError(`Failed to serialize message: ${error.message}`, 'SERIALIZE_FAILED', { error });
        }
    }

    /**
     * Parse protobuf message
     */
    _parseProtobufMessage(buffer) {
        try {
            if (!this.client.protocolRoot) {
                // Fallback parsing
                return this._parseRawMessage(buffer);
            }

            const WAMessage = this.client.protocolRoot.lookupType('WAMessage');
            const message = WAMessage.decode(buffer);
            
            return WAMessage.toObject(message, {
                longs: String,
                enums: String,
                bytes: String
            });

        } catch (error) {
            this.logger.warn('Protobuf parsing failed, using fallback:', error);
            return this._parseRawMessage(buffer);
        }
    }

    /**
     * Parse raw message as fallback
     */
    _parseRawMessage(buffer) {
        try {
            // Simple fallback parsing
            const text = buffer.toString('utf8');
            
            // Try to parse as JSON
            try {
                return JSON.parse(text);
            } catch {
                // Return as text message
                return {
                    type: 'message',
                    body: text,
                    timestamp: Date.now(),
                    from: 'unknown@c.us',
                    isFromMe: false
                };
            }

        } catch (error) {
            this.logger.error('Raw message parsing failed:', error);
            return {
                type: 'unknown',
                data: buffer,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Enhance message with additional properties
     */
    _enhanceMessage(messageData) {
        const enhanced = {
            ...messageData,
            id: messageData.id || `msg_${Date.now()}`,
            timestamp: messageData.timestamp || Date.now(),
            type: messageData.type || 'text',
            hasMedia: this._hasMedia(messageData),
            isFromMe: messageData.isFromMe || false,
            mentionedJidList: messageData.mentionedJidList || [],
            quotedMsg: messageData.quotedMsg || null
        };

        // Add button/list response properties
        if (messageData.selectedButtonId) {
            enhanced.isButton = true;
            enhanced.selectedButtonId = messageData.selectedButtonId;
        }

        if (messageData.selectedRowId) {
            enhanced.isList = true;
            enhanced.selectedRowId = messageData.selectedRowId;
        }

        return enhanced;
    }

    /**
     * Check if message has media
     */
    _hasMedia(messageData) {
        const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        return mediaTypes.some(type => messageData[`${type}Message`] || messageData.type === type);
    }

    /**
     * Create message key
     */
    createMessageKey(chatId, messageId, fromMe = true) {
        return {
            remoteJid: chatId,
            fromMe: fromMe,
            id: messageId
        };
    }

    /**
     * Create text message
     */
    createTextMessage(text, options = {}) {
        return {
            key: this.createMessageKey(options.chatId, options.messageId),
            message: {
                conversation: text
            },
            messageTimestamp: Date.now(),
            status: 'PENDING'
        };
    }

    /**
     * Create button message
     */
    createButtonMessage(text, buttons, options = {}) {
        return {
            key: this.createMessageKey(options.chatId, options.messageId),
            message: {
                buttonsMessage: {
                    contentText: text,
                    buttons: buttons.map((btn, index) => ({
                        buttonId: btn.id || `btn_${index}`,
                        buttonText: {
                            displayText: btn.text
                        },
                        type: 'RESPONSE'
                    })),
                    footerText: options.footer || ''
                }
            },
            messageTimestamp: Date.now(),
            status: 'PENDING'
        };
    }

    /**
     * Create list message
     */
    createListMessage(text, buttonText, sections, options = {}) {
        return {
            key: this.createMessageKey(options.chatId, options.messageId),
            message: {
                listMessage: {
                    title: text,
                    description: options.description || '',
                    buttonText: buttonText,
                    listType: 'SINGLE_SELECT',
                    sections: sections.map(section => ({
                        title: section.title,
                        rows: section.rows.map(row => ({
                            rowId: row.id,
                            title: row.title,
                            description: row.description || ''
                        }))
                    })),
                    footerText: options.footer || ''
                }
            },
            messageTimestamp: Date.now(),
            status: 'PENDING'
        };
    }
}

module.exports = { ProtocolHandler };