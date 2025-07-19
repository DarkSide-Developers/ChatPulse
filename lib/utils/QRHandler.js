/**
 * ChatPulse - Advanced WhatsApp Web API Library
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
const { Logger } = require('./Logger');

/**
 * Handles QR code generation, display, and management
 * Provides multiple output formats for QR codes
 */
class QRHandler {
    /**
     * Initialize QRHandler
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('QRHandler');
        this.qrOutputDir = path.join(process.cwd(), 'qr-codes');
        this.currentQR = null;
        this.qrRefreshInterval = null;
    }

    /**
     * Handle QR code authentication process
     * @returns {Promise<boolean>} Authentication success
     */
    async handleQRCode() {
        try {
            this.logger.info('Starting QR code authentication...');
            
            // Setup QR code monitoring
            await this._setupQRMonitoring();
            
            // Wait for authentication
            return await this._waitForAuthentication();
            
        } catch (error) {
            this.logger.error('QR code authentication failed:', error);
            throw error;
        }
    }

    /**
     * Generate QR code in multiple formats
     * @param {string} qrData - QR code data
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generated QR code information
     */
    async generateQRCode(qrData, options = {}) {
        try {
            const qrInfo = {
                data: qrData,
                timestamp: new Date().toISOString(),
                formats: {}
            };

            // Generate terminal QR code
            if (options.terminal !== false) {
                qrcodeTerminal.generate(qrData, { small: true });
                qrInfo.formats.terminal = true;
                this.logger.info('QR code displayed in terminal');
            }

            // Generate PNG image
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

            // Generate SVG
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

            // Generate base64 data URL
            if (options.dataURL) {
                const dataURL = await qrcode.toDataURL(qrData, {
                    width: 512,
                    margin: 2
                });
                
                qrInfo.formats.dataURL = dataURL;
                this.logger.debug('QR code generated as data URL');
            }

            this.currentQR = qrInfo;
            this.client.emit('qr_generated', qrInfo);
            
            return qrInfo;

        } catch (error) {
            this.logger.error('Failed to generate QR code:', error);
            throw error;
        }
    }

    /**
     * Get current QR code information
     * @returns {Object|null} Current QR code info
     */
    getCurrentQR() {
        return this.currentQR;
    }

    /**
     * Clear current QR code and cleanup files
     * @returns {Promise<boolean>} Cleanup success
     */
    async clearQRCode() {
        try {
            if (this.currentQR) {
                // Clear refresh interval
                if (this.qrRefreshInterval) {
                    clearInterval(this.qrRefreshInterval);
                    this.qrRefreshInterval = null;
                }

                // Remove generated files
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
                this.client.emit('qr_cleared');
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
     * @private
     */
    async _setupQRMonitoring() {
        await this.client.page.exposeFunction('onQRCodeReceived', (qrData) => {
            this._handleNewQRCode(qrData);
        });

        await this.client.page.evaluate(() => {
            // Monitor QR code changes
            const qrObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-ref') {
                        const qrElement = document.querySelector('[data-testid="qr-code"]');
                        if (qrElement && qrElement.getAttribute('data-ref')) {
                            const qrData = qrElement.getAttribute('data-ref');
                            window.onQRCodeReceived(qrData);
                        }
                    }
                });
            });

            const qrContainer = document.querySelector('[data-testid="qr-code"]');
            if (qrContainer) {
                qrObserver.observe(qrContainer, {
                    attributes: true,
                    attributeFilter: ['data-ref']
                });

                // Get initial QR code if available
                const initialQR = qrContainer.getAttribute('data-ref');
                if (initialQR) {
                    window.onQRCodeReceived(initialQR);
                }
            }
        });
    }

    /**
     * Handle new QR code data
     * @param {string} qrData - QR code data
     * @private
     */
    async _handleNewQRCode(qrData) {
        try {
            this.logger.info('New QR code received');
            
            // Clear previous QR code
            await this.clearQRCode();
            
            // Generate new QR code
            await this.generateQRCode(qrData, {
                terminal: true,
                png: true,
                dataURL: true
            });

            this.client.emit('qr_updated', this.currentQR);
            
        } catch (error) {
            this.logger.error('Failed to handle new QR code:', error);
        }
    }

    /**
     * Wait for authentication completion
     * @returns {Promise<boolean>} Authentication success
     * @private
     */
    async _waitForAuthentication() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('QR code authentication timeout'));
            }, 120000); // 2 minutes timeout

            // Monitor for authentication success
            const checkAuth = async () => {
                try {
                    const isAuthenticated = await this.client.page.evaluate(() => {
                        return !document.querySelector('[data-testid="qr-code"]') &&
                               document.querySelector('[data-testid="chat-list"]');
                    });

                    if (isAuthenticated) {
                        clearTimeout(timeout);
                        clearInterval(authInterval);
                        await this.clearQRCode();
                        this.logger.success('QR code authentication successful!');
                        resolve(true);
                    }
                } catch (error) {
                    this.logger.error('Error checking authentication status:', error);
                }
            };

            const authInterval = setInterval(checkAuth, 1000);
            
            // Initial check
            checkAuth();
        });
    }

    /**
     * Get QR code statistics
     * @returns {Object} QR code statistics
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
            
            // Remove QR output directory if empty
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