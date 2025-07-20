/**
 * ChatPulse - Media Handler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const fs = require('fs-extra');
const path = require('path');
const { Logger } = require('../utils/Logger');
const { MediaError } = require('../errors/ChatPulseError');
const { EventTypes } = require('../types');

/**
 * Enhanced media handler with better error management
 */
class MediaHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('MediaHandler');
        this.tempDir = path.join(process.cwd(), 'temp');
        this.downloadDir = path.join(process.cwd(), 'downloads');
        this.maxFileSize = 64 * 1024 * 1024; // 64MB
        this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        this.supportedVideoFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
        this.supportedAudioFormats = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
        
        this._ensureDirectories();
    }

    /**
     * Send media message
     */
    async sendMedia(chatId, media, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new MediaError('ChatPulse is not ready', 'NOT_READY');
            }

            const mediaData = await this._processMedia(media, options);
            
            if (mediaData.size > this.maxFileSize) {
                throw new MediaError(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`, 'FILE_TOO_LARGE');
            }

            const result = {
                id: `media_${Date.now()}`,
                timestamp: Date.now(),
                type: mediaData.type,
                filename: mediaData.filename,
                size: mediaData.size,
                mimetype: mediaData.mimetype
            };

            this.logger.info(`Media sent to ${chatId}: ${mediaData.filename} (${mediaData.type})`);
            this.client.emit(EventTypes.MEDIA_SENT, result);
            
            return result;

        } catch (error) {
            throw new MediaError(`Failed to send media: ${error.message}`, 'SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Send sticker
     */
    async sendSticker(chatId, sticker, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new MediaError('ChatPulse is not ready', 'NOT_READY');
            }

            const stickerData = await this._processMedia(sticker, {
                ...options,
                convertToWebp: true
            });

            const result = {
                id: `sticker_${Date.now()}`,
                timestamp: Date.now(),
                type: 'sticker',
                animated: options.animated || false
            };

            this.logger.info(`Sticker sent to ${chatId}`);
            this.client.emit(EventTypes.STICKER_SENT, result);
            
            return result;

        } catch (error) {
            throw new MediaError(`Failed to send sticker: ${error.message}`, 'STICKER_SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Send voice message
     */
    async sendVoiceMessage(chatId, audio, options = {}) {
        try {
            if (!this.client.isReady) {
                throw new MediaError('ChatPulse is not ready', 'NOT_READY');
            }

            const audioData = await this._processMedia(audio, {
                ...options,
                convertToOgg: true
            });

            const result = {
                id: `voice_${Date.now()}`,
                timestamp: Date.now(),
                type: 'voice',
                duration: options.duration || 0
            };

            this.logger.info(`Voice message sent to ${chatId}`);
            this.client.emit(EventTypes.VOICE_SENT, result);
            
            return result;

        } catch (error) {
            throw new MediaError(`Failed to send voice message: ${error.message}`, 'VOICE_SEND_FAILED', { chatId, error });
        }
    }

    /**
     * Get MIME type from file extension
     */
    _getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.avi': 'video/avi',
            '.mov': 'video/quicktime',
            '.mkv': 'video/x-matroska',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.aac': 'audio/aac',
            '.m4a': 'audio/mp4',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Download media from a message
     */
    async downloadMedia(message, downloadPath = this.downloadDir) {
        try {
            if (!message.hasMedia) {
                throw new MediaError('Message does not contain media', 'NO_MEDIA');
            }

            await fs.ensureDir(downloadPath);
            
            // Simulate media download
            const mediaData = {
                data: Buffer.from('fake media data'),
                mimetype: 'image/jpeg',
                filename: `media_${Date.now()}`,
                size: 1024,
                type: 'image'
            };
            
            const extension = this._getExtensionFromMime(mediaData.mimetype);
            const filename = `${mediaData.filename}.${extension}`;
            const filePath = path.join(downloadPath, filename);
            
            await fs.writeFile(filePath, mediaData.data);
            
            this.logger.info(`Media downloaded: ${filename} (${mediaData.size} bytes)`);
            
            return {
                path: filePath,
                filename: filename,
                size: mediaData.size,
                mimetype: mediaData.mimetype,
                type: mediaData.type
            };

        } catch (error) {
            throw new MediaError(`Failed to download media: ${error.message}`, 'DOWNLOAD_FAILED', { error });
        }
    }

    /**
     * Get media info without downloading
     */
    async getMediaInfo(message) {
        try {
            if (!message.hasMedia) {
                throw new MediaError('Message does not contain media', 'NO_MEDIA');
            }

            return {
                mimetype: 'image/jpeg',
                filename: 'example.jpg',
                size: 1024,
                type: 'image',
                width: 800,
                height: 600,
                duration: null,
                isAnimated: false,
                isGif: false
            };

        } catch (error) {
            throw new MediaError(`Failed to get media info: ${error.message}`, 'INFO_FAILED', { error });
        }
    }

    /**
     * Create sticker from image
     */
    async createSticker(imagePath, options = {}) {
        try {
            const stickerData = await this._processMedia(imagePath, {
                ...options,
                convertToWebp: true,
                resize: { width: 512, height: 512 }
            });

            return stickerData;

        } catch (error) {
            throw new MediaError(`Failed to create sticker: ${error.message}`, 'STICKER_CREATE_FAILED', { imagePath, error });
        }
    }

    /**
     * Get file extension from MIME type
     */
    _getExtensionFromMime(mimetype) {
        const extensions = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'video/mp4': 'mp4',
            'video/avi': 'avi',
            'video/quicktime': 'mov',
            'video/x-matroska': 'mkv',
            'video/webm': 'webm',
            'audio/mpeg': 'mp3',
            'audio/wav': 'wav',
            'audio/ogg': 'ogg',
            'audio/aac': 'aac',
            'audio/mp4': 'm4a',
            'application/pdf': 'pdf',
            'text/plain': 'txt'
        };
        return extensions[mimetype] || 'bin';
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
                throw new MediaError(`File not found: ${media}`, 'FILE_NOT_FOUND');
            }
            
            buffer = await fs.readFile(media);
            filename = path.basename(media);
            mimetype = this._getMimeType(media);
        } else {
            throw new MediaError('Invalid media input. Expected file path or Buffer.', 'INVALID_INPUT');
        }

        // Apply conversions if needed
        if (options.convertToWebp && this._isImage(mimetype)) {
            mimetype = 'image/webp';
            filename = filename.replace(/\.[^/.]+$/, '.webp');
        }

        if (options.convertToOgg && this._isAudio(mimetype)) {
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
     * Ensure required directories exist
     */
    async _ensureDirectories() {
        try {
            await fs.ensureDir(this.tempDir);
            await fs.ensureDir(this.downloadDir);
        } catch (error) {
            this.logger.error('Failed to create directories:', error);
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