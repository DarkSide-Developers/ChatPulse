/**
 * ChatPulse - Enhanced QR Handler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const qrcode = require('qrcode');
const qrTerminal = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const { Logger } = require('../utils/Logger');
const { AuthenticationError } = require('../errors/ChatPulseError');

/**
 * Enhanced QR code handler with real WhatsApp Web integration
 */
class QRHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('QRHandler');
        this.qrDir = path.join(process.cwd(), 'qr-codes');
        this.currentQR = null;
        this.qrHistory = [];
        this.maxQRHistory = 10;
        
        this._ensureQRDirectory();
    }

    /**
     * Display QR code with multiple format support
     */
    async displayQRCode(qrData, options = {}) {
        try {
            if (!qrData) {
                throw new AuthenticationError('No QR data provided', 'INVALID_QR_DATA');
            }
            
            this.currentQR = {
                data: qrData,
                timestamp: Date.now(),
                expires: Date.now() + 30000
            };
            
            // Add to history
            this._addToHistory(this.currentQR);
            
            const {
                terminal = true,
                save = true,
                format = 'png',
                size = 'medium'
            } = options;
            
            // Display in terminal
            if (terminal) {
                await this._displayInTerminal(qrData, size);
            }
            
            // Save as file
            if (save) {
                await this._saveQRCode(qrData, format);
            }
            
            this.logger.info('✅ QR code displayed successfully');
            
            return {
                data: qrData,
                timestamp: this.currentQR.timestamp,
                expires: this.currentQR.expires,
                saved: save,
                format: format
            };
            
        } catch (error) {
            this.logger.error('❌ Failed to display QR code:', error);
            throw new AuthenticationError(`QR display failed: ${error.message}`, 'QR_DISPLAY_FAILED', { error });
        }
    }

    /**
     * Get current QR code
     */
    async getQRCode(format = 'terminal') {
        try {
            if (!this.currentQR) {
                throw new AuthenticationError('No QR code available', 'NO_QR_AVAILABLE');
            }
            
            // Check if QR code is expired
            if (Date.now() > this.currentQR.expires) {
                throw new AuthenticationError('QR code has expired', 'QR_EXPIRED');
            }
            
            switch (format) {
                case 'terminal':
                    return this.currentQR.data;
                case 'png':
                    return await this._generatePNG(this.currentQR.data);
                case 'svg':
                    return await this._generateSVG(this.currentQR.data);
                case 'dataurl':
                    return await this._generateDataURL(this.currentQR.data);
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            
        } catch (error) {
            this.logger.error('❌ Failed to get QR code:', error);
            throw error;
        }
    }

    /**
     * Generate QR code with enhanced options
     */
    async generateQRCode(data, options = {}) {
        try {
            const {
                terminal = true,
                png = false,
                svg = false,
                dataURL = false,
                size = 'medium',
                errorCorrectionLevel = 'M',
                margin = 4,
                color = {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            } = options;
            
            const qrOptions = {
                errorCorrectionLevel,
                margin,
                color,
                width: this._getSizePixels(size)
            };
            
            const results = {};
            
            // Terminal display
            if (terminal) {
                qrTerminal.generate(data, { small: size === 'small' });
                results.terminal = true;
                this.logger.info('📱 QR code displayed in terminal');
            }
            
            // PNG generation
            if (png) {
                const pngBuffer = await qrcode.toBuffer(data, { ...qrOptions, type: 'png' });
                const filename = `qr-${Date.now()}.png`;
                const filepath = path.join(this.qrDir, filename);
                await fs.writeFile(filepath, pngBuffer);
                results.png = filepath;
                this.logger.info(`💾 QR code saved as PNG: ${filepath}`);
            }
            
            // SVG generation
            if (svg) {
                const svgString = await qrcode.toString(data, { ...qrOptions, type: 'svg' });
                const filename = `qr-${Date.now()}.svg`;
                const filepath = path.join(this.qrDir, filename);
                await fs.writeFile(filepath, svgString);
                results.svg = filepath;
                this.logger.info(`💾 QR code saved as SVG: ${filepath}`);
            }
            
            // Data URL generation
            if (dataURL) {
                const dataUrl = await qrcode.toDataURL(data, qrOptions);
                results.dataURL = dataUrl;
                this.logger.info('🔗 QR code generated as data URL');
            }
            
            return results;
            
        } catch (error) {
            this.logger.error('❌ Failed to generate QR code:', error);
            throw new AuthenticationError(`QR generation failed: ${error.message}`, 'QR_GENERATION_FAILED', { error });
        }
    }

    /**
     * Clear current QR code
     */
    clearQRCode() {
        if (this.currentQR) {
            this.logger.info('🧹 QR code cleared');
            this.currentQR = null;
            
            // Clear terminal
            if (process.stdout.isTTY) {
                console.clear();
            }
        }
    }

    /**
     * Get QR code history
     */
    getQRHistory() {
        return [...this.qrHistory];
    }

    /**
     * Check if QR code is expired
     */
    isQRExpired() {
        if (!this.currentQR) {
            return true;
        }
        
        return Date.now() > this.currentQR.expires;
    }

    /**
     * Display QR code in terminal with enhanced formatting
     */
    async _displayInTerminal(qrData, size = 'medium') {
        try {
            // Clear previous QR code
            if (process.stdout.isTTY) {
                console.clear();
            }
            
            console.log('\n' + '='.repeat(50));
            console.log('📱 CHATPULSE - WHATSAPP WEB QR CODE');
            console.log('='.repeat(50));
            console.log('📱 Scan this QR code with your WhatsApp mobile app');
            console.log('⏰ QR code expires in 30 seconds');
            console.log('🔄 QR code will refresh automatically');
            console.log('='.repeat(50) + '\n');
            
            // Generate QR code in terminal
            qrTerminal.generate(qrData, { 
                small: size === 'small',
                errorCorrectionLevel: 'M'
            });
            
            console.log('\n' + '='.repeat(50));
            console.log('📱 Open WhatsApp on your phone');
            console.log('⚙️ Go to Settings > Linked Devices');
            console.log('➕ Tap "Link a Device"');
            console.log('📷 Point your camera at this QR code');
            console.log('='.repeat(50) + '\n');
            
        } catch (error) {
            this.logger.error('❌ Failed to display QR in terminal:', error);
            throw error;
        }
    }

    /**
     * Save QR code as file
     */
    async _saveQRCode(qrData, format = 'png') {
        try {
            const timestamp = Date.now();
            const filename = `qr-${timestamp}.${format}`;
            const filepath = path.join(this.qrDir, filename);
            
            switch (format.toLowerCase()) {
                case 'png':
                    const pngBuffer = await qrcode.toBuffer(qrData, {
                        type: 'png',
                        width: 512,
                        margin: 4,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                    await fs.writeFile(filepath, pngBuffer);
                    break;
                    
                case 'svg':
                    const svgString = await qrcode.toString(qrData, {
                        type: 'svg',
                        width: 512,
                        margin: 4
                    });
                    await fs.writeFile(filepath, svgString);
                    break;
                    
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            
            this.logger.info(`💾 QR code saved: ${filepath}`);
            return filepath;
            
        } catch (error) {
            this.logger.error('❌ Failed to save QR code:', error);
            throw error;
        }
    }

    /**
     * Generate PNG buffer
     */
    async _generatePNG(data) {
        return await qrcode.toBuffer(data, {
            type: 'png',
            width: 512,
            margin: 4
        });
    }

    /**
     * Generate SVG string
     */
    async _generateSVG(data) {
        return await qrcode.toString(data, {
            type: 'svg',
            width: 512,
            margin: 4
        });
    }

    /**
     * Generate data URL
     */
    async _generateDataURL(data) {
        return await qrcode.toDataURL(data, {
            width: 512,
            margin: 4
        });
    }

    /**
     * Get size in pixels
     */
    _getSizePixels(size) {
        const sizes = {
            small: 256,
            medium: 512,
            large: 1024
        };
        
        return sizes[size] || sizes.medium;
    }

    /**
     * Add QR to history
     */
    _addToHistory(qrInfo) {
        this.qrHistory.unshift(qrInfo);
        
        // Maintain history size
        if (this.qrHistory.length > this.maxQRHistory) {
            this.qrHistory = this.qrHistory.slice(0, this.maxQRHistory);
        }
    }

    /**
     * Ensure QR directory exists
     */
    async _ensureQRDirectory() {
        try {
            await fs.ensureDir(this.qrDir);
        } catch (error) {
            this.logger.warn('⚠️ Failed to create QR directory:', error);
        }
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
                const filepath = path.join(this.qrDir, file);
                const stats = await fs.stat(filepath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.remove(filepath);
                    this.logger.debug(`🧹 Cleaned up old QR file: ${file}`);
                }
            }
            
        } catch (error) {
            this.logger.warn('⚠️ Failed to cleanup QR files:', error);
        }
    }
}

module.exports = { QRHandler };