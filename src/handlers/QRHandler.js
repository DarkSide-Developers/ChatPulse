/**
 * ChatPulse - QR Handler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const { Logger } = require('../utils/Logger');
const { AuthenticationError } = require('../errors/ChatPulseError');
const { EventTypes } = require('../types');

/**
 * Enhanced QR handler with better error management
 */
class QRHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('QRHandler');
        this.qrOutputDir = path.join(process.cwd(), 'qr-codes');
        this.currentQR = null;
        this.qrRefreshInterval = null;
        this.authTimeout = null;
    }

    /**
     * Handle QR code authentication process
     */
    async handleQRCode() {
        try {
            this.logger.info('Starting QR code authentication...');
            
            await this._setupQRMonitoring();
            
            return await this._waitForAuthentication();
            
        } catch (error) {
            throw new AuthenticationError(`QR code authentication failed: ${error.message}`, 'QR_AUTH_FAILED', { error });
        }
    }

    /**
     * Generate QR code in multiple formats
     */
    async generateQRCode(qrData, options = {}) {
        try {
            const qrInfo = {
                data: qrData,
                timestamp: new Date().toISOString(),
                formats: {}
            };

            if (options.terminal !== false) {
                qrcodeTerminal.generate(qrData, { small: true });
                qrInfo.formats.terminal = true;
                this.logger.info('QR code displayed in terminal');
            }

            if (options.png !== false) {
                await fs.ensureDir(this.qrOutputDir);
                const pngPath = path.join(this.qrOutputDir, `qr-${Date.now()}.png`);
                
                await qrcode.toFile(pngPath, qrData, {
                    type: 'png',
                    width: 512,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                
                qrInfo.formats.png = pngPath;
                this.logger.info(`QR code saved as PNG: ${pngPath}`);
            }

            if (options.svg) {
                await fs.ensureDir(this.qrOutputDir);
                const svgPath = path.join(this.qrOutputDir, `qr-${Date.now()}.svg`);
                
                const svgString = await qrcode.toString(qrData, {
                    type: 'svg',
                    width: 512,
                    margin: 2
                });
                
                await fs.writeFile(svgPath, svgString);
                qrInfo.formats.svg = svgPath;
                this.logger.info(`QR code saved as SVG: ${svgPath}`);
            }

            if (options.dataURL) {
                const dataURL = await qrcode.toDataURL(qrData, {
                    width: 512,
                    margin: 2
                });
                
                qrInfo.formats.dataURL = dataURL;
                this.logger.debug('QR code generated as data URL');
            }

            this.currentQR = qrInfo;
            this.client.emit(EventTypes.QR_GENERATED, qrInfo);
            
            return qrInfo;

        } catch (error) {
            throw new AuthenticationError(`Failed to generate QR code: ${error.message}`, 'QR_GENERATE_FAILED', { error });
        }
    }

    /**
     * Get current QR code information
     */
    getCurrentQR() {
        return this.currentQR;
    }

    /**
     * Clear current QR code and cleanup files
     */
    async clearQRCode() {
        try {
            if (this.currentQR) {
                if (this.qrRefreshInterval) {
                    clearInterval(this.qrRefreshInterval);
                    this.qrRefreshInterval = null;
                }

                if (this.authTimeout) {
                    clearTimeout(this.authTimeout);
                    this.authTimeout = null;
                }

                for (const [format, path] of Object.entries(this.currentQR.formats)) {
                    if (format === 'png' || format === 'svg') {
                        try {
                            await fs.remove(path);
                            this.logger.debug(`Removed QR file: ${path}`);
                        } catch (error) {
                            this.logger.warn(`Failed to remove QR file: ${path}`, error);
                        }
                    }
                }

                this.currentQR = null;
                this.client.emit(EventTypes.QR_CLEARED);
                this.logger.info('QR code cleared');
            }

            return true;
        } catch (error) {
            this.logger.error('Failed to clear QR code:', error);
            return false;
        }
    }

    /**
     * Setup QR code monitoring
     */
    async _setupQRMonitoring() {
        // Simulate QR code generation
        const qrData = this._generateQRData();
        await this.generateQRCode(qrData, {
            terminal: true,
            png: true,
            dataURL: true
        });

        // Setup refresh interval
        this.qrRefreshInterval = setInterval(async () => {
            const newQrData = this._generateQRData();
            await this._handleNewQRCode(newQrData);
        }, 30000); // Refresh every 30 seconds
    }

    /**
     * Handle new QR code data
     */
    async _handleNewQRCode(qrData) {
        try {
            this.logger.info('New QR code received');
            
            await this.clearQRCode();
            
            await this.generateQRCode(qrData, {
                terminal: true,
                png: true,
                dataURL: true
            });

            this.client.emit(EventTypes.QR_UPDATED, this.currentQR);
            
        } catch (error) {
            this.logger.error('Failed to handle new QR code:', error);
        }
    }

    /**
     * Wait for authentication completion
     */
    async _waitForAuthentication() {
        return new Promise((resolve, reject) => {
            this.authTimeout = setTimeout(() => {
                reject(new AuthenticationError('QR code authentication timeout', 'AUTH_TIMEOUT'));
            }, this.client.options.authTimeout || 120000);

            // Simulate authentication success after random delay
            const authDelay = Math.random() * 10000 + 5000; // 5-15 seconds
            setTimeout(async () => {
                clearTimeout(this.authTimeout);
                await this.clearQRCode();
                this.logger.success('QR code authentication successful!');
                this.client.emit(EventTypes.AUTHENTICATED);
                resolve(true);
            }, authDelay);
        });
    }

    /**
     * Generate QR data
     */
    _generateQRData() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `2@${timestamp},${random},1`;
    }

    /**
     * Get QR code statistics
     */
    getQRStats() {
        return {
            hasCurrentQR: !!this.currentQR,
            currentQRAge: this.currentQR ? Date.now() - new Date(this.currentQR.timestamp).getTime() : 0,
            outputDirectory: this.qrOutputDir,
            supportedFormats: ['terminal', 'png', 'svg', 'dataURL']
        };
    }

    /**
     * Cleanup QR handler resources
     */
    async cleanup() {
        try {
            await this.clearQRCode();
            
            if (await fs.pathExists(this.qrOutputDir)) {
                const files = await fs.readdir(this.qrOutputDir);
                if (files.length === 0) {
                    await fs.remove(this.qrOutputDir);
                }
            }
            
            this.logger.info('QR handler cleanup completed');
        } catch (error) {
            this.logger.error('QR handler cleanup failed:', error);
        }
    }
}

module.exports = { QRHandler };