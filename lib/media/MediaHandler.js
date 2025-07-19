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
 * Handles media operations including stickers and advanced media features
 */
class MediaHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('MediaHandler');
        this.tempDir = path.join(process.cwd(), 'temp');
        this.maxFileSize = 64 * 1024 * 1024; // 64MB
        this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        this.supportedVideoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
        this.supportedAudioFormats = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
        
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
                    filename: options.filename || mediaData.filename,
                    quotedMessageId: options.quotedMessageId || null,
                    mentions: options.mentions || [],
                    sendMediaAsSticker: options.sendMediaAsSticker || false,
                    sendMediaAsDocument: options.sendMediaAsDocument || false
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
                    caption: data.options.caption,
                    sendMediaAsDocument: data.options.sendMediaAsDocument,
                    sendMediaAsSticker: data.options.sendMediaAsSticker
                };

                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                if (data.options.mentions.length > 0) {
                    messageOptions.mentionedJidList = data.options.mentions;
                }

                const message = await window.Store.sendMessage(chat, mediaFile, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: data.media.type,
                    filename: data.options.filename,
                    size: data.media.size,
                    mimetype: data.media.mimetype
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
     * Send sticker
     */
    async sendSticker(chatId, sticker, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            // Process sticker media
            const stickerData = await this._processMedia(sticker, {
                ...options,
                convertToWebp: true
            });

            const messageData = {
                chatId: this._formatChatId(chatId),
                sticker: stickerData,
                options: {
                    quotedMessageId: options.quotedMessageId || null,
                    animated: options.animated || false
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const stickerBlob = new Blob([new Uint8Array(data.sticker.buffer)], {
                    type: 'image/webp'
                });

                const stickerFile = new File([stickerBlob], 'sticker.webp', {
                    type: 'image/webp'
                });

                const messageOptions = {
                    sendMediaAsSticker: true,
                    isAnimated: data.options.animated
                };

                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                const message = await window.Store.sendMessage(chat, stickerFile, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'sticker',
                    animated: data.options.animated
                };
            }, messageData);

            this.logger.info(`Sticker sent to ${chatId}`);
            this.client.emit('sticker_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send sticker:', error);
            throw error;
        }
    }

    /**
     * Send voice message
     */
    async sendVoiceMessage(chatId, audio, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new Error('ChatPulse is not ready. Please wait for initialization.');
            }

            // Process audio for voice message
            const audioData = await this._processMedia(audio, {
                ...options,
                convertToOgg: true
            });

            const messageData = {
                chatId: this._formatChatId(chatId),
                audio: audioData,
                options: {
                    quotedMessageId: options.quotedMessageId || null,
                    duration: options.duration || 0
                }
            };

            const result = await this.client.page.evaluate(async (data) => {
                const chat = window.Store.Chat.get(data.chatId);
                if (!chat) {
                    throw new Error(`Chat not found: ${data.chatId}`);
                }

                const audioBlob = new Blob([new Uint8Array(data.audio.buffer)], {
                    type: 'audio/ogg'
                });

                const audioFile = new File([audioBlob], 'voice.ogg', {
                    type: 'audio/ogg'
                });

                const messageOptions = {
                    sendAudioAsVoice: true,
                    duration: data.options.duration
                };

                if (data.options.quotedMessageId) {
                    const quotedMessage = window.Store.Msg.get(data.options.quotedMessageId);
                    if (quotedMessage) {
                        messageOptions.quotedMsg = quotedMessage;
                    }
                }

                const message = await window.Store.sendMessage(chat, audioFile, messageOptions);
                
                return {
                    id: message.id._serialized,
                    timestamp: message.t,
                    type: 'voice',
                    duration: data.options.duration
                };
            }, messageData);

            this.logger.info(`Voice message sent to ${chatId}`);
            this.client.emit('voice_sent', result);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to send voice message:', error);
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
                    size: mediaBlob.size,
                    type: message.type
                };
            }, message.id);

            await fs.ensureDir(downloadPath);
            
            const extension = mime.extension(mediaData.mimetype) || 'bin';
            const filename = `${mediaData.filename}.${extension}`;
            const filePath = path.join(downloadPath, filename);
            
            const buffer = Buffer.from(mediaData.data);
            await fs.writeFile(filePath, buffer);
            
            this.logger.info(`Media downloaded: ${filename} (${mediaData.size} bytes)`);
            
            return {
                path: filePath,
                filename: filename,
                size: mediaData.size,
                mimetype: mediaData.mimetype,
                type: mediaData.type
            };

        } catch (error) {
            this.logger.error('Failed to download media:', error);
            throw error;
        }
    }

    /**
     * Get media info without downloading
     */
    async getMediaInfo(message) {
        try {
            if (!message.hasMedia) {
                throw new Error('Message does not contain media');
            }

            const mediaInfo = await this.client.page.evaluate(async (msgId) => {
                const message = window.Store.Msg.get(msgId);
                if (!message || !message.hasMedia) {
                    throw new Error('Message or media not found');
                }

                return {
                    mimetype: message.mimetype,
                    filename: message.filename,
                    size: message.size,
                    type: message.type,
                    width: message.width,
                    height: message.height,
                    duration: message.duration,
                    isAnimated: message.isAnimated,
                    isGif: message.isGif
                };
            }, message.id);

            return mediaInfo;

        } catch (error) {
            this.logger.error('Failed to get media info:', error);
            throw error;
        }
    }

    /**
     * Create sticker from image
     */
    async createSticker(imagePath, options = {}) {
        try {
            // This would require image processing libraries like sharp
            // For now, we'll return the processed media data
            const stickerData = await this._processMedia(imagePath, {
                ...options,
                convertToWebp: true,
                resize: { width: 512, height: 512 }
            });

            return stickerData;

        } catch (error) {
            this.logger.error('Failed to create sticker:', error);
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

        // Apply conversions if needed
        if (options.convertToWebp && this._isImage(mimetype)) {
            // Convert to WebP for stickers (would need sharp library)
            mimetype = 'image/webp';
            filename = filename.replace(/\.[^/.]+$/, '.webp');
        }

        if (options.convertToOgg && this._isAudio(mimetype)) {
            // Convert to OGG for voice messages (would need ffmpeg)
            mimetype = 'audio/ogg';
            filename = filename.replace(/\.[^/.]+$/, '.ogg');
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
     * Check if MIME type is image
     */
    _isImage(mimetype) {
        return mimetype.startsWith('image/');
    }

    /**
     * Check if MIME type is audio
     */
    _isAudio(mimetype) {
        return mimetype.startsWith('audio/');
    }

    /**
     * Check if MIME type is video
     */
    _isVideo(mimetype) {
        return mimetype.startsWith('video/');
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

    /**
     * Get supported formats
     */
    getSupportedFormats() {
        return {
            images: this.supportedImageFormats,
            videos: this.supportedVideoFormats,
            audio: this.supportedAudioFormats,
            maxFileSize: this.maxFileSize
        };
    }

    /**
     * Cleanup temp files
     */
    async cleanup() {
        try {
            if (await fs.pathExists(this.tempDir)) {
                const files = await fs.readdir(this.tempDir);
                for (const file of files) {
                    const filePath = path.join(this.tempDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Remove files older than 1 hour
                    if (Date.now() - stats.mtime.getTime() > 3600000) {
                        await fs.remove(filePath);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to cleanup temp files:', error);
        }
    }
}

module.exports = { MediaHandler };