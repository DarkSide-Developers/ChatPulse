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
const crypto = require('crypto-js');
const { Logger } = require('../utils/Logger');

/**
 * Manages WhatsApp Web sessions with encryption and multi-session support
 * Provides secure session storage and restoration capabilities
 */
class SessionManager {
    /**
     * Initialize SessionManager
     * @param {string} sessionName - Unique session identifier
     * @param {string} baseDir - Base directory for session storage
     */
    constructor(sessionName = 'default', baseDir = './sessions') {
        this.sessionName = sessionName;
        this.baseDir = baseDir;
        this.sessionPath = path.join(baseDir, sessionName);
        this.logger = new Logger('SessionManager');
        this.encryptionKey = process.env.SESSION_ENCRYPTION_KEY || this._generateEncryptionKey();
    }

    /**
     * Get session directory path
     * @returns {string} Session directory path
     */
    getSessionPath() {
        return this.sessionPath;
    }

    /**
     * Check if session exists
     * @returns {Promise<boolean>} Session existence status
     */
    async sessionExists() {
        try {
            const exists = await fs.pathExists(this.sessionPath);
            const hasSessionData = exists && await this._hasValidSessionData();
            
            this.logger.debug(`Session ${this.sessionName} exists: ${hasSessionData}`);
            return hasSessionData;
        } catch (error) {
            this.logger.error('Error checking session existence:', error);
            return false;
        }
    }

    /**
     * Create new session directory
     * @returns {Promise<boolean>} Creation success status
     */
    async createSession() {
        try {
            await fs.ensureDir(this.sessionPath);
            
            // Create session metadata
            const metadata = {
                sessionName: this.sessionName,
                createdAt: new Date().toISOString(),
                version: '1.0.0',
                encrypted: !!process.env.SESSION_ENCRYPTION_KEY
            };
            
            await this.saveSessionData('metadata', metadata);
            
            this.logger.info(`Session created: ${this.sessionName}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to create session:', error);
            return false;
        }
    }

    /**
     * Delete session
     * @returns {Promise<boolean>} Deletion success status
     */
    async deleteSession() {
        try {
            if (await fs.pathExists(this.sessionPath)) {
                await fs.remove(this.sessionPath);
                this.logger.info(`Session deleted: ${this.sessionName}`);
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error('Failed to delete session:', error);
            return false;
        }
    }

    /**
     * Save session data with optional encryption
     * @param {string} key - Data key
     * @param {*} data - Data to save
     * @returns {Promise<boolean>} Save success status
     */
    async saveSessionData(key, data) {
        try {
            await fs.ensureDir(this.sessionPath);
            
            const filePath = path.join(this.sessionPath, `${key}.json`);
            let dataToSave = JSON.stringify(data, null, 2);
            
            // Encrypt sensitive data
            if (this._shouldEncrypt(key)) {
                dataToSave = this._encrypt(dataToSave);
            }
            
            await fs.writeFile(filePath, dataToSave, 'utf8');
            this.logger.debug(`Session data saved: ${key}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to save session data ${key}:`, error);
            return false;
        }
    }

    /**
     * Load session data with automatic decryption
     * @param {string} key - Data key
     * @returns {Promise<*>} Loaded data or null
     */
    async loadSessionData(key) {
        try {
            const filePath = path.join(this.sessionPath, `${key}.json`);
            
            if (!await fs.pathExists(filePath)) {
                return null;
            }
            
            let rawData = await fs.readFile(filePath, 'utf8');
            
            // Decrypt if necessary
            if (this._shouldEncrypt(key)) {
                rawData = this._decrypt(rawData);
            }
            
            const data = JSON.parse(rawData);
            this.logger.debug(`Session data loaded: ${key}`);
            return data;
        } catch (error) {
            this.logger.error(`Failed to load session data ${key}:`, error);
            return null;
        }
    }

    /**
     * Get session metadata
     * @returns {Promise<Object|null>} Session metadata
     */
    async getSessionMetadata() {
        return await this.loadSessionData('metadata');
    }

    /**
     * Update session metadata
     * @param {Object} updates - Metadata updates
     * @returns {Promise<boolean>} Update success status
     */
    async updateSessionMetadata(updates) {
        try {
            const metadata = await this.getSessionMetadata() || {};
            const updatedMetadata = {
                ...metadata,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            return await this.saveSessionData('metadata', updatedMetadata);
        } catch (error) {
            this.logger.error('Failed to update session metadata:', error);
            return false;
        }
    }

    /**
     * List all available sessions
     * @returns {Promise<Array>} Array of session names
     */
    async listSessions() {
        try {
            if (!await fs.pathExists(this.baseDir)) {
                return [];
            }
            
            const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
            const sessions = [];
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const sessionPath = path.join(this.baseDir, entry.name);
                    const metadataPath = path.join(sessionPath, 'metadata.json');
                    
                    if (await fs.pathExists(metadataPath)) {
                        sessions.push(entry.name);
                    }
                }
            }
            
            return sessions;
        } catch (error) {
            this.logger.error('Failed to list sessions:', error);
            return [];
        }
    }

    /**
     * Get session statistics
     * @returns {Promise<Object>} Session statistics
     */
    async getSessionStats() {
        try {
            const stats = await fs.stat(this.sessionPath);
            const files = await fs.readdir(this.sessionPath);
            
            return {
                sessionName: this.sessionName,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                fileCount: files.length,
                size: await this._getDirectorySize(this.sessionPath)
            };
        } catch (error) {
            this.logger.error('Failed to get session stats:', error);
            return null;
        }
    }

    /**
     * Backup session to a zip file
     * @param {string} backupPath - Backup file path
     * @returns {Promise<boolean>} Backup success status
     */
    async backupSession(backupPath) {
        try {
            // This would require additional dependencies like archiver
            // For now, we'll copy the session directory
            const backupDir = path.dirname(backupPath);
            await fs.ensureDir(backupDir);
            await fs.copy(this.sessionPath, backupPath);
            
            this.logger.info(`Session backed up to: ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to backup session:', error);
            return false;
        }
    }

    /**
     * Restore session from backup
     * @param {string} backupPath - Backup file path
     * @returns {Promise<boolean>} Restore success status
     */
    async restoreSession(backupPath) {
        try {
            if (!await fs.pathExists(backupPath)) {
                throw new Error('Backup file not found');
            }
            
            // Remove existing session
            if (await fs.pathExists(this.sessionPath)) {
                await fs.remove(this.sessionPath);
            }
            
            // Restore from backup
            await fs.copy(backupPath, this.sessionPath);
            
            this.logger.info(`Session restored from: ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to restore session:', error);
            return false;
        }
    }

    /**
     * Check if session has valid data
     * @returns {Promise<boolean>} Validity status
     * @private
     */
    async _hasValidSessionData() {
        try {
            const metadataExists = await fs.pathExists(path.join(this.sessionPath, 'metadata.json'));
            const hasUserData = await fs.pathExists(path.join(this.sessionPath, 'Default'));
            
            return metadataExists && hasUserData;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if data should be encrypted
     * @param {string} key - Data key
     * @returns {boolean} Should encrypt
     * @private
     */
    _shouldEncrypt(key) {
        const sensitiveKeys = ['auth', 'credentials', 'tokens', 'keys'];
        return sensitiveKeys.some(sensitive => key.includes(sensitive));
    }

    /**
     * Encrypt data
     * @param {string} data - Data to encrypt
     * @returns {string} Encrypted data
     * @private
     */
    _encrypt(data) {
        try {
            return crypto.AES.encrypt(data, this.encryptionKey).toString();
        } catch (error) {
            this.logger.error('Encryption failed:', error);
            return data; // Return unencrypted data as fallback
        }
    }

    /**
     * Decrypt data
     * @param {string} encryptedData - Encrypted data
     * @returns {string} Decrypted data
     * @private
     */
    _decrypt(encryptedData) {
        try {
            const bytes = crypto.AES.decrypt(encryptedData, this.encryptionKey);
            return bytes.toString(crypto.enc.Utf8);
        } catch (error) {
            this.logger.error('Decryption failed:', error);
            return encryptedData; // Return as-is if decryption fails
        }
    }

    /**
     * Generate encryption key
     * @returns {string} Generated key
     * @private
     */
    _generateEncryptionKey() {
        return crypto.lib.WordArray.random(256/8).toString();
    }

    /**
     * Get directory size recursively
     * @param {string} dirPath - Directory path
     * @returns {Promise<number>} Size in bytes
     * @private
     */
    async _getDirectorySize(dirPath) {
        try {
            let size = 0;
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const file of files) {
                const filePath = path.join(dirPath, file.name);
                if (file.isDirectory()) {
                    size += await this._getDirectorySize(filePath);
                } else {
                    const stats = await fs.stat(filePath);
                    size += stats.size;
                }
            }
            
            return size;
        } catch (error) {
            return 0;
        }
    }
}

module.exports = { SessionManager };