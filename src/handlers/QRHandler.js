/**
 * ChatPulse - Advanced QR Handler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const fs = require('fs-extra');
const path = require('path');
const QRCode = require('qrcode');
const qrTerminal = require('qrcode-terminal');
const sharp = require('sharp');
const jsQR = require('jsqr');
const { Logger } = require('../utils/Logger');
const { AuthenticationError } = require('../errors/ChatPulseError');

/**
 * Advanced QR code handler with multiple format support
 */
class QRHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('QRHandler');
        this.qrDir = path.join(process.cwd(), 'qr-codes');
        this.currentQR = null;
        this.qrHistory = [];
        this.maxHistorySize = 10;
        
        this._ensureQRDirectory();
    }

    /**
     * Generate and display QR code with multiple format support
     */
    async generateQRCode(qrData, options = {}) {
        try {
            this.logger.info('📱 Generating QR code...');
            
            const qrOptions = {
                terminal: options.terminal !== false,
                save: options.save !== false,
                format: options.format || 'png',
                size: options.size || 'medium',
                errorCorrectionLevel: options.errorCorrectionLevel || 'M',
                margin: options.margin || 4,
                color: {
                    dark: options.darkColor || '#000000',
                    light: options.lightColor || '#FFFFFF'
                },
                ...options
            };
            
            // Store current QR data
            this.currentQR = {
                data: qrData,
                timestamp: Date.now(),
                options: qrOptions
            };
            
            // Add to history
            this._addToHistory(this.currentQR);
            
            // Display in terminal if requested
            if (qrOptions.terminal) {
                await this._displayInTerminal(qrData, qrOptions);
            }
            
            // Save as image if requested
            if (qrOptions.save) {
                await this._saveAsImage(qrData, qrOptions);
            }
            
            // Generate data URL if requested
            let dataURL = null;
            if (qrOptions.dataURL) {
                dataURL = await this._generateDataURL(qrData, qrOptions);
            }
            
            const result = {
                data: qrData,
                timestamp: Date.now(),
                format: qrOptions.format,
                size: qrOptions.size,
                saved: qrOptions.save,
                dataURL: dataURL
            };
            
            this.logger.info('✅ QR code generated successfully');
            return result;
            
        } catch (error) {
            this.logger.error('❌ Failed to generate QR code:', error);
            throw new AuthenticationError(`QR generation failed: ${error.message}`, 'QR_GENERATION_FAILED', { error });
        }
    }

    /**
     * Display QR code in terminal
     */
    async _displayInTerminal(qrData, options) {
        try {
            const terminalOptions = {
                small: options.size === 'small'
            };
            
            console.log('\n📱 Scan this QR code with your WhatsApp mobile app:\n');
            qrTerminal.generate(qrData, terminalOptions);
            console.log('\n⏰ QR code will refresh automatically every 30 seconds\n');
            
        } catch (error) {
            this.logger.error('Failed to display QR in terminal:', error);
        }
    }

    /**
     * Save QR code as image file
     */
    async _saveAsImage(qrData, options) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `qr-${timestamp}.${options.format}`;
            const filepath = path.join(this.qrDir, filename);
            
            const qrCodeOptions = {
                errorCorrectionLevel: options.errorCorrectionLevel,
                type: 'image/png',
                quality: 0.92,
                margin: options.margin,
                color: options.color,
                width: this._getSizeInPixels(options.size)
            };
            
            if (options.format === 'svg') {
                qrCodeOptions.type = 'svg';
                await QRCode.toFile(filepath, qrData, qrCodeOptions);
            } else {
                // Generate PNG and optionally convert to other formats
                const buffer = await QRCode.toBuffer(qrData, qrCodeOptions);
                
                if (options.format === 'png') {
                    await fs.writeFile(filepath, buffer);
                } else {
                    // Use sharp to convert to other formats
                    await sharp(buffer)
                        .toFormat(options.format)
                        .toFile(filepath);
                }
            }
            
            this.logger.info(`QR code saved: ${filepath}`);
            return filepath;
            
        } catch (error) {
            this.logger.error('Failed to save QR code:', error);
            throw error;
        }
    }

    /**
     * Generate QR code as data URL
     */
    async _generateDataURL(qrData, options) {
        try {
            const qrCodeOptions = {
                errorCorrectionLevel: options.errorCorrectionLevel,
                margin: options.margin,
                color: options.color,
                width: this._getSizeInPixels(options.size)
            };
            
            return await QRCode.toDataURL(qrData, qrCodeOptions);
            
        } catch (error) {
            this.logger.error('Failed to generate data URL:', error);
            throw error;
        }
    }

    /**
     * Read QR code from image file
     */
    async readQRCode(imagePath) {
        try {
            this.logger.info('📖 Reading QR code from image...');
            
            if (!await fs.pathExists(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }
            
            // Read and process image
            const imageBuffer = await fs.readFile(imagePath);
            const { data, info } = await sharp(imageBuffer)
                .raw()
                .ensureAlpha()
                .toBuffer({ resolveWithObject: true });
            
            // Convert to format expected by jsQR
            const imageData = {
                data: new Uint8ClampedArray(data),
                width: info.width,
                height: info.height
            };
            
            // Decode QR code
            const qrResult = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (!qrResult) {
                throw new Error('No QR code found in image');
            }
            
            this.logger.info('✅ QR code read successfully');
            
            return {
                data: qrResult.data,
                location: qrResult.location,
                version: qrResult.version,
                errorCorrectionLevel: qrResult.errorCorrectionLevel
            };
            
        } catch (error) {
            this.logger.error('❌ Failed to read QR code:', error);
            throw new AuthenticationError(`QR reading failed: ${error.message}`, 'QR_READ_FAILED', { error });
        }
    }

    /**
     * Validate QR code data
     */
    validateQRData(qrData) {
        try {
            if (!qrData || typeof qrData !== 'string') {
                return { valid: false, reason: 'Invalid QR data format' };
            }
            
            // WhatsApp QR format validation
            if (qrData.startsWith('2@')) {
                const parts = qrData.split(',');
                if (parts.length >= 3) {
                    return { 
                        valid: true, 
                        type: 'whatsapp',
                        timestamp: parts[0].substring(2),
                        random: parts[1],
                        publicKey: parts[2],
                        clientId: parts[3] || null
                    };
                }
            }
            
            // ChatPulse device pairing format
            if (qrData.startsWith('chatpulse://device-pair')) {
                return { 
                    valid: true, 
                    type: 'device_pairing',
                    url: qrData
                };
            }
            
            // Generic URL format
            try {
                new URL(qrData);
                return { 
                    valid: true, 
                    type: 'url',
                    url: qrData
                };
            } catch {
                // Not a valid URL
            }
            
            return { 
                valid: true, 
                type: 'text',
                data: qrData
            };
            
        } catch (error) {
            return { 
                valid: false, 
                reason: error.message 
            };
        }
    }

    /**
     * Display QR code with enhanced options
     */
    async displayQRCode(qrData, options = {}) {
        return await this.generateQRCode(qrData, options);
    }

    /**
     * Get QR code in specified format
     */
    async getQRCode(format = 'terminal') {
        try {
            if (!this.currentQR) {
                throw new Error('No QR code available');
            }
            
            const qrData = this.currentQR.data;
            
            switch (format) {
                case 'terminal':
                    qrTerminal.generate(qrData, { small: true });
                    return qrData;
                    
                case 'dataurl':
                    return await this._generateDataURL(qrData, this.currentQR.options);
                    
                case 'buffer':
                    return await QRCode.toBuffer(qrData);
                    
                case 'svg':
                    return await QRCode.toString(qrData, { type: 'svg' });
                    
                default:
                    return qrData;
            }
            
        } catch (error) {
            throw new AuthenticationError(`Failed to get QR code: ${error.message}`, 'QR_GET_FAILED', { error });
        }
    }

    /**
     * Get QR code history
     */
    getQRHistory() {
        return this.qrHistory.map(qr => ({
            timestamp: qr.timestamp,
            data: qr.data.substring(0, 50) + '...',
            format: qr.options.format,
            size: qr.options.size
        }));
    }

    /**
     * Clear QR code history
     */
    clearHistory() {
        this.qrHistory = [];
        this.logger.info('QR code history cleared');
    }

    /**
     * Get current QR code info
     */
    getCurrentQRInfo() {
        if (!this.currentQR) {
            return null;
        }
        
        return {
            timestamp: this.currentQR.timestamp,
            age: Date.now() - this.currentQR.timestamp,
            format: this.currentQR.options.format,
            size: this.currentQR.options.size,
            validation: this.validateQRData(this.currentQR.data)
        };
    }

    /**
     * Ensure QR directory exists
     */
    async _ensureQRDirectory() {
        try {
            await fs.ensureDir(this.qrDir);
        } catch (error) {
            this.logger.error('Failed to create QR directory:', error);
        }
    }

    /**
     * Add QR to history
     */
    _addToHistory(qrInfo) {
        this.qrHistory.push(qrInfo);
        
        // Maintain history size limit
        if (this.qrHistory.length > this.maxHistorySize) {
            this.qrHistory.shift();
        }
    }

    /**
     * Get size in pixels based on size name
     */
    _getSizeInPixels(sizeName) {
        const sizes = {
            small: 200,
            medium: 300,
            large: 400,
            xlarge: 500
        };
        
        return sizes[sizeName] || sizes.medium;
    }

    /**
     * Cleanup old QR files
     */
    async cleanup() {
        try {
            const files = await fs.readdir(this.qrDir);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            for (const file of files) {
                const filePath = path.join(this.qrDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.remove(filePath);
                    this.logger.debug(`Removed old QR file: ${file}`);
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to cleanup QR files:', error);
        }
    }
}

module.exports = { QRHandler };