/**
 * ChatPulse - Session Manager
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
const { SessionError } = require('../errors/ChatPulseError');

/**
 * Enhanced session management with better error handling
 */
class SessionManager {
    constructor(sessionName = 'default', baseDir = './sessions') {
        this.sessionName = sessionName;
        this.baseDir = baseDir;
        this.sessionPath = path.join(baseDir, sessionName);
        this.logger = new Logger('SessionManager');
        this.encryptionKey = process.env.SESSION_ENCRYPTION_KEY || this._generateEncryptionKey();
        this.isInitialized = false;
    }

    /**
     * Initialize session manager
     */
    async initialize() {
        try {
            await fs.ensureDir(this.sessionPath);
            this.isInitialized = true;
            this.logger.info(`Session manager initialized: ${this.sessionName}`);
        } catch (error) {
            throw new SessionError('Failed to initialize session manager', 'INIT_FAILED', { error });
        }
    }

    /**
     * Get session directory path
     */
    getSessionPath() {
        return this.sessionPath;
    }

    /**
     * Check if session exists
     */
    async sessionExists() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
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
     */
    async createSession() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            await fs.ensureDir(this.sessionPath);
            
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
            throw new SessionError('Failed to create session', 'CREATE_FAILED', { error });
        }
    }

    /**
     * Delete session
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
            throw new SessionError('Failed to delete session', 'DELETE_FAILED', { error });
        }
    }

    /**
     * Save session data with optional encryption
     */
    async saveSessionData(key, data) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            await fs.ensureDir(this.sessionPath);
            
            const filePath = path.join(this.sessionPath, `${key}.json`);
            let dataToSave = JSON.stringify(data, null, 2);
            
            if (this._shouldEncrypt(key)) {
                dataToSave = this._encrypt(dataToSave);
            }
            
            await fs.writeFile(filePath, dataToSave, 'utf8');
            this.logger.debug(`Session data saved: ${key}`);
            return true;
        } catch (error) {
            throw new SessionError(`Failed to save session data: ${key}`, 'SAVE_FAILED', { key, error });
        }
    }

    /**
     * Load session data with automatic decryption
     */
    async loadSessionData(key) {
        try {
            const filePath = path.join(this.sessionPath, `${key}.json`);
            
            if (!await fs.pathExists(filePath)) {
                return null;
            }
            
            let rawData = await fs.readFile(filePath, 'utf8');
            
            if (this._shouldEncrypt(key)) {
                rawData = this._decrypt(rawData);
            }
            
            const data = JSON.parse(rawData);
            this.logger.debug(`Session data loaded: ${key}`);
            return data;
        } catch (error) {
            throw new SessionError(`Failed to load session data: ${key}`, 'LOAD_FAILED', { key, error });
        }
    }

    /**
     * Get session metadata
     */
    async getSessionMetadata() {
        return await this.loadSessionData('metadata');
    }

    /**
     * Update session metadata
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
            throw new SessionError('Failed to update session metadata', 'UPDATE_FAILED', { error });
        }
    }

    /**
     * List all available sessions
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
            throw new SessionError('Failed to list sessions', 'LIST_FAILED', { error });
        }
    }

    /**
     * Get session statistics
     */
    async getSessionStats() {
        try {
            if (!await fs.pathExists(this.sessionPath)) {
                return null;
            }
            
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
            throw new SessionError('Failed to get session stats', 'STATS_FAILED', { error });
        }
    }

    /**
     * Backup session to a zip file
     */
    async backupSession(backupPath) {
        try {
            const backupDir = path.dirname(backupPath);
            await fs.ensureDir(backupDir);
            await fs.copy(this.sessionPath, backupPath);
            
            this.logger.info(`Session backed up to: ${backupPath}`);
            return true;
        } catch (error) {
            throw new SessionError('Failed to backup session', 'BACKUP_FAILED', { backupPath, error });
        }
    }

    /**
     * Restore session from backup
     */
    async restoreSession(backupPath) {
        try {
            if (!await fs.pathExists(backupPath)) {
                throw new Error('Backup file not found');
            }
            
            if (await fs.pathExists(this.sessionPath)) {
                await fs.remove(this.sessionPath);
            }
            
            await fs.copy(backupPath, this.sessionPath);
            
            this.logger.info(`Session restored from: ${backupPath}`);
            return true;
        } catch (error) {
            throw new SessionError('Failed to restore session', 'RESTORE_FAILED', { backupPath, error });
        }
    }

    /**
     * Check if session has valid data
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
     */
    _shouldEncrypt(key) {
        const sensitiveKeys = ['auth', 'credentials', 'tokens', 'keys'];
        return sensitiveKeys.some(sensitive => key.includes(sensitive));
    }

    /**
     * Encrypt data
     */
    _encrypt(data) {
        try {
            return crypto.AES.encrypt(data, this.encryptionKey).toString();
        } catch (error) {
            this.logger.error('Encryption failed:', error);
            return data;
        }
    }

    /**
     * Decrypt data
     */
    _decrypt(encryptedData) {
        try {
            const bytes = crypto.AES.decrypt(encryptedData, this.encryptionKey);
            return bytes.toString(crypto.enc.Utf8);
        } catch (error) {
            this.logger.error('Decryption failed:', error);
            return encryptedData;
        }
    }

    /**
     * Generate encryption key
     */
    _generateEncryptionKey() {
        return crypto.lib.WordArray.random(256/8).toString();
    }

    /**
     * Get directory size recursively
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