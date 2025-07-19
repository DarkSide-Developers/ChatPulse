/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const { Logger } = require('../utils/Logger');

/**
 * Handles media operations
 */
class MediaHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('MediaHandler');
        this.tempDir = path.join(process.cwd(), 'temp');
        this.maxFileSize = 64 * 1024 * 1024; // 64MB
        
        this._ensureTempDir();
    }

    /**
     * Send media message
     */
    async sendMedia(chatId, media, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            // Process media
            const mediaData = await this._processMedia(media, options);
            
            // Validate file size
            if (mediaData.size > this.maxFileSize) {
                throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
            }

            const messageData = {
                chatId: this._formatChatId(chatId),
                media: mediaData,
                options: {
                    caption: options.caption || '',
                    filename: options.filename || mediaData.filename
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const mediaBlob = new Blob([new Uint8Array(data.media.buffer)], {
                    type: data.media.mimetype
                });

                const mediaFile = new File([mediaBlob], data.options.filename, {
                    type: data.media.mimetype
                });

                const messageOptions = {
                    caption: data.options.caption
                };

                const message = await window.Store.sendMessage(chat, mediaFile, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: data.media.type,
                    filename: data.options.filename,
                    size: data.media.size
                };
            }, messageData);

            this.logger.info(`Media sent to ${chatId}: ${mediaData.filename} (${mediaData.type})`);
            this.client.emit('media_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send media:', error);
            throw error;
        }
    }

    /**
     * Download media from a message
     */
    async downloadMedia(message, downloadPath = this.tempDir) {
        try {
            if (!message.hasMedia) {
                throw new Error('Message does not contain media');
            }

            const mediaData = await this.client.page.evaluate(async (msgId) => {
                const message = window.Store.Msg.get(msgId);
                if (!message || !message.hasMedia) {
                    throw new Error('Message or media not found');
                }

                const mediaBlob = await message.downloadMedia();
                
                return {
                    data: Array.from(new Uint8Array(await mediaBlob.arrayBuffer())),
                    mimetype: message.mimetype,
                    filename: message.filename || `media_${Date.now()}`,
                    size: mediaBlob.size
                };
            }, message.id);

            await fs.ensureDir(downloadPath);
            
            const extension = mime.extension(mediaData.mimetype) || 'bin';
            const filename = `${mediaData.filename}.${extension}`;
            const filePath = path.join(downloadPath, filename);
            
            const buffer = Buffer.from(mediaData.data);
            await fs.writeFile(filePath, buffer);
            
            this.logger.info(`Media downloaded: ${filename} (${mediaData.size} bytes)`);
            
            return filePath;

        } catch (error) {
            this.logger.error('Failed to download media:', error);
            throw error;
        }
    }

    /**
     * Process media file or buffer
     */
    async _processMedia(media, options = {}) {
        let buffer;
        let filename;
        let mimetype;

        if (Buffer.isBuffer(media)) {
            buffer = media;
            filename = options.filename || `media_${Date.now()}`;
            mimetype = options.mimetype || 'application/octet-stream';
        } else if (typeof media === 'string') {
            if (!await fs.pathExists(media)) {
                throw new Error(`File not found: ${media}`);
            }
            
            buffer = await fs.readFile(media);
            filename = path.basename(media);
            mimetype = mime.lookup(media) || 'application/octet-stream';
        } else {
            throw new Error('Invalid media input. Expected file path or Buffer.');
        }

        const type = this._getMediaType(mimetype);
        
        return {
            buffer: Array.from(buffer),
            filename: filename,
            mimetype: mimetype,
            type: type,
            size: buffer.length
        };
    }

    /**
     * Get media type from MIME type
     */
    _getMediaType(mimetype) {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        return 'document';
    }

    /**
     * Format chat ID
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
     * Ensure temp directory exists
     */
    async _ensureTempDir() {
        try {
            await fs.ensureDir(this.tempDir);
        } catch (error) {
            this.logger.error('Failed to create temp directory:', error);
        }
    }
}

module.exports = { MediaHandler };