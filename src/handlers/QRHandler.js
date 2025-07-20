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
            
            // Validate QR data
            if (!qrData || typeof qrData !== 'string') {
                throw new AuthenticationError('Invalid QR data provided', 'INVALID_QR_DATA');
            }
            
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
            
            let savedPath = null;
            let dataURL = null;
            
            // Display in terminal if requested
            if (qrOptions.terminal) {
                this._displayInTerminal(qrData, qrOptions);
            }
            
            // Save as image if requested
            if (qrOptions.save) {
                try {
                    savedPath = await this._saveAsImage(qrData, qrOptions);
                } catch (error) {
                    this.logger.warn('Failed to save QR image:', error.message);
                }
            }
            
            // Generate data URL if requested
            if (qrOptions.dataURL) {
                try {
                    dataURL = await this._generateDataURL(qrData, qrOptions);
                } catch (error) {
                    this.logger.warn('Failed to generate data URL:', error.message);
                }
            }
            
            const result = {
                data: qrData,
                timestamp: Date.now(),
                format: qrOptions.format,
                size: qrOptions.size,
                saved: qrOptions.save,
                savedPath: savedPath,
                dataURL: dataURL,
                expires: Date.now() + 30000 // 30 seconds
            };
            
            this.logger.info('✅ QR code generated successfully');
            return result;
            
        } catch (error) {
            this.logger.error('❌ Failed to generate QR code:', error);
            throw new AuthenticationError(`QR generation failed: ${error.message}`, 'QR_GENERATION_FAILED', { error });
        }
    }

    /**
     * Generate and display QR code with multiple format support
     */
    async displayQRCode(qrData, options = {}) {
        try {
            const qrOptions = {
                terminal: options.terminal !== false,
                save: options.save !== false,
                format: options.format || 'png',
                size: options.size || 'medium',
                ...options
            };
            
            let savedPath = null;
            
            // Display in terminal if requested
            if (qrOptions.terminal) {
                this._displayInTerminal(qrData, qrOptions);
            }
            
            // Save as image if requested
            if (qrOptions.save) {
                try {
                    savedPath = await this._saveAsImage(qrData, qrOptions);
                } catch (error) {
                    this.logger.warn('Failed to save QR image:', error.message);
                }
            }
            
            return {
                data: qrData,
                timestamp: Date.now(),
                format: qrOptions.format,
                size: qrOptions.size,
                saved: qrOptions.save,
                savedPath: savedPath,
                expires: Date.now() + 30000
            };
            
        } catch (error) {
            this.logger.error('Failed to display QR code:', error);
            throw error;
        }
    }

    /**
     * Display QR code in terminal with better formatting
     */
    _displayInTerminal(qrData, options) {
        try {
            console.log('\n' + '='.repeat(50));
            console.log('📱 SCAN QR CODE WITH WHATSAPP');
            console.log('='.repeat(50));
            
            // Generate QR code for terminal with proper options
            qrTerminal.generate(qrData, { small: options.size === 'small' }, (qr) => {
                console.log(qr);
            });
            
            console.log('⏰ Expires in 30 seconds');
            console.log('='.repeat(50));
            
        } catch (error) {
            this.logger.error('Failed to display QR in terminal:', error);
            // Fallback display
            console.log('\n📱 QR Code (scan with QR reader):');
            console.log(qrData);
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
                margin: options.margin,
                color: options.color,
                width: this._getSizeInPixels(options.size)
            };
            
            if (options.format === 'svg') {
                const svgString = await QRCode.toString(qrData, { 
                    ...qrCodeOptions, 
                    type: 'svg' 
                });
                await fs.writeFile(filepath, svgString);
            } else {
                // Generate PNG
                await QRCode.toFile(filepath, qrData, {
                    ...qrCodeOptions,
                    type: 'png'
                });
            }
            
            this.logger.info(`QR code saved: ${filepath}`);
            return filepath;
            
        } catch (error) {
            this.logger.error('Failed to save QR code:', error);
            return null;
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
                    this._displayInTerminal(qrData, this.currentQR.options);
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
            if (!await fs.pathExists(this.qrDir)) {
                return;
            }
            
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