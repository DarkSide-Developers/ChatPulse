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
            // Validate input data
            if (!data) {
                throw new MessageError('No data provided for parsing', 'INVALID_INPUT');
            }
            
            // Handle different data types
            let messageData;
            
            if (Buffer.isBuffer(data)) {
                try {
                    messageData = this._parseProtobufMessage(data);
                } catch (protobufError) {
                    this.logger.warn('Protobuf parsing failed, trying fallback:', protobufError);
                    messageData = this._parseRawMessage(data);
                }
            } else if (typeof data === 'string') {
                try {
                    messageData = JSON.parse(data);
                } catch (jsonError) {
                    this.logger.warn('JSON parsing failed, treating as text message:', jsonError);
                    messageData = {
                        type: 'text',
                        body: data,
                        timestamp: Date.now(),
                        from: 'unknown@c.us',
                        isFromMe: false
                    };
                }
            } else {
                messageData = data;
            }
            
            // Validate parsed data
            if (!messageData || typeof messageData !== 'object') {
                throw new MessageError('Parsed message data is invalid', 'INVALID_PARSED_DATA');
            }

            // Enhance message with additional properties
            const enhancedMessage = this._enhanceMessage(messageData);
            
            this.logger.debug('Message parsed successfully');
            return enhancedMessage;

        } catch (error) {
            this.logger.error('Message parsing failed:', error);
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
            // For now, always use fallback parsing since protobuf is not implemented
            return this._parseRawMessage(buffer);
            
            /* TODO: Implement when protobuf support is added
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
            */

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
            if (!Buffer.isBuffer(buffer)) {
                throw new Error('Input is not a Buffer');
            }
            
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
                    isFromMe: false,
                    id: `fallback_${Date.now()}`
                };
            }

        } catch (error) {
            this.logger.error('Raw message parsing failed:', error);
            return {
                type: 'unknown',
                data: buffer?.toString('hex') || 'invalid_data',
                timestamp: Date.now(),
                id: `error_${Date.now()}`,
                parseError: error.message
            };
        }
    }

    /**
     * Enhance message with additional properties
     */
    _enhanceMessage(messageData) {
        if (!messageData || typeof messageData !== 'object') {
            return {
                id: `invalid_${Date.now()}`,
                timestamp: Date.now(),
                type: 'unknown',
                body: '',
                from: 'unknown@c.us',
                isFromMe: false,
                hasMedia: false,
                mentionedJidList: [],
                quotedMsg: null,
                error: 'Invalid message data'
            };
        }
        
        const enhanced = {
            ...messageData,
            id: messageData.id || `msg_${Date.now()}`,
            timestamp: messageData.timestamp || Date.now(),
            type: messageData.type || 'text',
            body: messageData.body || messageData.conversation || messageData.text || '',
            from: messageData.from || messageData.remoteJid || 'unknown@c.us',
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
        
        // Add poll response properties
        if (messageData.pollUpdateMessage) {
            enhanced.isPoll = true;
            enhanced.pollUpdate = messageData.pollUpdateMessage;
        }
        
        // Add media properties
        if (enhanced.hasMedia) {
            enhanced.mediaType = this._getMediaType(messageData);
            enhanced.mediaData = this._extractMediaData(messageData);
        }

        return enhanced;
    }

    /**
     * Check if message has media
     */
    _hasMedia(messageData) {
        if (!messageData || typeof messageData !== 'object') {
            return false;
        }
        
        const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        
        // Check message type
        if (mediaTypes.includes(messageData.type)) {
            return true;
        }
        
        // Check for media message objects
        return mediaTypes.some(type => {
            const mediaKey = `${type}Message`;
            return messageData[mediaKey] && typeof messageData[mediaKey] === 'object';
        });
    }
    
    /**
     * Get media type from message
     */
    _getMediaType(messageData) {
        if (!messageData) return null;
        
        const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        
        // Check message type first
        if (mediaTypes.includes(messageData.type)) {
            return messageData.type;
        }
        
        // Check for media message objects
        for (const type of mediaTypes) {
            const mediaKey = `${type}Message`;
            if (messageData[mediaKey]) {
                return type;
            }
        }
        
        return null;
    }
    
    /**
     * Extract media data from message
     */
    _extractMediaData(messageData) {
        if (!messageData) return null;
        
        const mediaType = this._getMediaType(messageData);
        if (!mediaType) return null;
        
        const mediaKey = `${mediaType}Message`;
        const mediaMessage = messageData[mediaKey];
        
        if (!mediaMessage) return null;
        
        return {
            url: mediaMessage.url,
            mimetype: mediaMessage.mimetype,
            caption: mediaMessage.caption,
            filename: mediaMessage.filename || mediaMessage.title,
            fileLength: mediaMessage.fileLength,
            width: mediaMessage.width,
            height: mediaMessage.height,
            duration: mediaMessage.seconds,
            thumbnail: mediaMessage.jpegThumbnail || mediaMessage.pngThumbnail
        };
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