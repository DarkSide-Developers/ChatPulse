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
const sharp = require('sharp');
const { Logger } = require('../utils/Logger');

/**
 * Handles media operations including sending, receiving, and processing
 * Supports images, videos, audio, documents, and stickers
 */
class MediaHandler {
    /**
     * Initialize MediaHandler
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('MediaHandler');
        this.tempDir = path.join(process.cwd(), 'temp');
        this.maxFileSize = 64 * 1024 * 1024; // 64MB
        this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        this.supportedVideoFormats = ['mp4', 'avi', 'mov', 'mkv', '3gp'];
        this.supportedAudioFormats = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
        
        this._ensureTempDir();
    }

    /**
     * Send media message
     * @param {string} chatId - Target chat ID
     * @param {string|Buffer} media - Media file path or buffer
     * @param {Object} options - Media options
     * @param {string} options.caption - Media caption
     * @param {string} options.filename - Custom filename
     * @param {string} options.mimetype - Custom MIME type
     * @param {boolean} options.asSticker - Send as sticker (images only)
     * @param {boolean} options.asVoiceNote - Send as voice note (audio only)
     * @returns {Promise<Object>} Message result
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
                    filename: options.filename || mediaData.filename,
                    asSticker: options.asSticker || false,
                    asVoiceNote: options.asVoiceNote || false
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                // Create media message
                const mediaBlob = new Blob([new Uint8Array(data.media.buffer)], {
                    type: data.media.mimetype
                });

                const mediaFile = new File([mediaBlob], data.options.filename, {
                    type: data.media.mimetype
                });

                let messageOptions = {
                    caption: data.options.caption
                };

                if (data.options.asSticker && data.media.type === 'image') {
                    messageOptions.type = 'sticker';
                } else if (data.options.asVoiceNote && data.media.type === 'audio') {
                    messageOptions.type = 'ptt'; // Push to talk (voice note)
                }

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
     * @param {Object} message - Message object containing media
     * @param {string} downloadPath - Download directory path
     * @returns {Promise<string>} Downloaded file path
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

                // Download media blob
                const mediaBlob = await message.downloadMedia();
                
                return {
                    data: Array.from(new Uint8Array(await mediaBlob.arrayBuffer())),
                    mimetype: message.mimetype,
                    filename: message.filename || `media_${Date.now()}`,
                    size: mediaBlob.size
                };
            }, message.id);

            // Ensure download directory exists
            await fs.ensureDir(downloadPath);
            
            // Generate filename with proper extension
            const extension = mime.extension(mediaData.mimetype) || 'bin';
            const filename = `${mediaData.filename}.${extension}`;
            const filePath = path.join(downloadPath, filename);
            
            // Write file
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
     * Create and send sticker from image
     * @param {string} chatId - Target chat ID
     * @param {string|Buffer} image - Image file path or buffer
     * @param {Object} options - Sticker options
     * @param {string} options.pack - Sticker pack name
     * @param {string} options.author - Sticker author
     * @returns {Promise<Object>} Message result
     */
    async sendSticker(chatId, image, options = {}) {
        try {
            // Process image for sticker
            const stickerData = await this._createSticker(image, options);
            
            return await this.sendMedia(chatId, stickerData.buffer, {
                filename: 'sticker.webp',
                asSticker: true,
                mimetype: 'image/webp'
            });

        } catch (error) {
            this.logger.error('Failed to send sticker:', error);
            throw error;
        }
    }

    /**
     * Send voice note
     * @param {string} chatId - Target chat ID
     * @param {string|Buffer} audio - Audio file path or buffer
     * @param {Object} options - Voice note options
     * @returns {Promise<Object>} Message result
     */
    async sendVoiceNote(chatId, audio, options = {}) {
        try {
            return await this.sendMedia(chatId, audio, {
                ...options,
                asVoiceNote: true
            });

        } catch (error) {
            this.logger.error('Failed to send voice note:', error);
            throw error;
        }
    }

    /**
     * Get media info from file
     * @param {string|Buffer} media - Media file path or buffer
     * @returns {Promise<Object>} Media information
     */
    async getMediaInfo(media) {
        try {
            const mediaData = await this._processMedia(media);
            
            let additionalInfo = {};
            
            // Get image dimensions for images
            if (mediaData.type === 'image') {
                try {
                    const metadata = await sharp(mediaData.buffer).metadata();
                    additionalInfo = {
                        width: metadata.width,
                        height: metadata.height,
                        format: metadata.format,
                        hasAlpha: metadata.hasAlpha
                    };
                } catch (error) {
                    this.logger.warn('Failed to get image metadata:', error);
                }
            }
            
            return {
                filename: mediaData.filename,
                mimetype: mediaData.mimetype,
                type: mediaData.type,
                size: mediaData.size,
                ...additionalInfo
            };

        } catch (error) {
            this.logger.error('Failed to get media info:', error);
            throw error;
        }
    }

    /**
     * Process media file or buffer
     * @param {string|Buffer} media - Media input
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processed media data
     * @private
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
            // File path
            if (!await fs.pathExists(media)) {
                throw new Error(`File not found: ${media}`);
            }
            
            buffer = await fs.readFile(media);
            filename = path.basename(media);
            mimetype = mime.lookup(media) || 'application/octet-stream';
        } else {
            throw new Error('Invalid media input. Expected file path or Buffer.');
        }

        // Determine media type
        const type = this._getMediaType(mimetype);
        
        return {
            buffer: Array.from(buffer), // Convert to array for page.evaluate
            filename: filename,
            mimetype: mimetype,
            type: type,
            size: buffer.length
        };
    }

    /**
     * Create sticker from image
     * @param {string|Buffer} image - Image input
     * @param {Object} options - Sticker options
     * @returns {Promise<Object>} Sticker data
     * @private
     */
    async _createSticker(image, options = {}) {
        try {
            let buffer;
            
            if (Buffer.isBuffer(image)) {
                buffer = image;
            } else {
                buffer = await fs.readFile(image);
            }

            // Convert to WebP format and resize for sticker
            const stickerBuffer = await sharp(buffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            return {
                buffer: stickerBuffer,
                mimetype: 'image/webp',
                filename: 'sticker.webp'
            };

        } catch (error) {
            this.logger.error('Failed to create sticker:', error);
            throw error;
        }
    }

    /**
     * Get media type from MIME type
     * @param {string} mimetype - MIME type
     * @returns {string} Media type
     * @private
     */
    _getMediaType(mimetype) {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        return 'document';
    }

    /**
     * Format chat ID
     * @param {string} chatId - Raw chat ID
     * @returns {string} Formatted chat ID
     * @private
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
     * @private
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