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
const crypto = require('crypto');
const mime = require('mime-types');

/**
 * File utilities for safe file operations and management
 * Provides secure file handling with validation and sanitization
 */
class FileUtils {
    /**
     * Allowed file extensions by category
     */
    static allowedExtensions = {
        image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
        video: ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.3gp'],
        audio: ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac', '.wma'],
        document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'],
        archive: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
        code: ['.js', '.html', '.css', '.json', '.xml', '.csv']
    };

    /**
     * Maximum file sizes by category (in bytes)
     */
    static maxFileSizes = {
        image: 16 * 1024 * 1024,    // 16MB
        video: 64 * 1024 * 1024,    // 64MB
        audio: 16 * 1024 * 1024,    // 16MB
        document: 100 * 1024 * 1024, // 100MB
        archive: 100 * 1024 * 1024,  // 100MB
        code: 1 * 1024 * 1024       // 1MB
    };

    /**
     * Validate file path for security
     * @param {string} filePath - File path to validate
     * @returns {Object} Validation result
     */
    static validatePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return { valid: false, error: 'File path is required and must be a string' };
        }

        // Normalize path to prevent directory traversal
        const normalizedPath = path.normalize(filePath);
        
        // Check for directory traversal attempts
        if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
            return { valid: false, error: 'Invalid file path: directory traversal detected' };
        }

        // Check for dangerous characters
        const dangerousChars = /[<>:"|?*\x00-\x1f]/;
        if (dangerousChars.test(normalizedPath)) {
            return { valid: false, error: 'File path contains invalid characters' };
        }

        // Check for reserved names (Windows)
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
        const fileName = path.basename(normalizedPath);
        if (reservedNames.test(fileName)) {
            return { valid: false, error: 'File name is reserved' };
        }

        return { valid: true, sanitized: normalizedPath };
    }

    /**
     * Get file information
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} File information
     */
    static async getFileInfo(filePath) {
        try {
            const pathValidation = this.validatePath(filePath);
            if (!pathValidation.valid) {
                throw new Error(pathValidation.error);
            }

            const stats = await fs.stat(filePath);
            const extension = path.extname(filePath).toLowerCase();
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';
            const category = this.getFileCategory(extension);

            return {
                path: filePath,
                name: path.basename(filePath),
                extension: extension,
                size: stats.size,
                mimeType: mimeType,
                category: category,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            throw new Error(`Failed to get file info: ${error.message}`);
        }
    }

    /**
     * Validate file for upload
     * @param {string} filePath - Path to file
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation result
     */
    static async validateFile(filePath, options = {}) {
        try {
            const {
                allowedCategories = null,
                maxSize = null,
                allowedExtensions = null,
                requireExtension = true
            } = options;

            // Validate path
            const pathValidation = this.validatePath(filePath);
            if (!pathValidation.valid) {
                return pathValidation;
            }

            // Check if file exists
            if (!await fs.pathExists(filePath)) {
                return { valid: false, error: 'File does not exist' };
            }

            // Get file info
            const fileInfo = await this.getFileInfo(filePath);

            // Check if it's actually a file
            if (!fileInfo.isFile) {
                return { valid: false, error: 'Path is not a file' };
            }

            // Validate extension
            if (requireExtension && !fileInfo.extension) {
                return { valid: false, error: 'File must have an extension' };
            }

            // Check allowed extensions
            if (allowedExtensions && !allowedExtensions.includes(fileInfo.extension)) {
                return { valid: false, error: `File extension ${fileInfo.extension} is not allowed` };
            }

            // Check allowed categories
            if (allowedCategories && !allowedCategories.includes(fileInfo.category)) {
                return { valid: false, error: `File category ${fileInfo.category} is not allowed` };
            }

            // Check file size
            const maxFileSize = maxSize || this.maxFileSizes[fileInfo.category] || this.maxFileSizes.document;
            if (fileInfo.size > maxFileSize) {
                return { 
                    valid: false, 
                    error: `File size (${this.formatFileSize(fileInfo.size)}) exceeds maximum allowed size (${this.formatFileSize(maxFileSize)})` 
                };
            }

            return { valid: true, fileInfo: fileInfo };
        } catch (error) {
            return { valid: false, error: `File validation failed: ${error.message}` };
        }
    }

    /**
     * Get file category based on extension
     * @param {string} extension - File extension
     * @returns {string} File category
     */
    static getFileCategory(extension) {
        const ext = extension.toLowerCase();
        
        for (const [category, extensions] of Object.entries(this.allowedExtensions)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }
        
        return 'unknown';
    }

    /**
     * Format file size in human-readable format
     * @param {number} bytes - File size in bytes
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted file size
     */
    static formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Generate unique filename
     * @param {string} originalName - Original filename
     * @param {string} directory - Target directory
     * @returns {Promise<string>} Unique filename
     */
    static async generateUniqueFilename(originalName, directory = '') {
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const sanitizedBaseName = this.sanitizeFilename(baseName);
        
        let counter = 0;
        let filename = `${sanitizedBaseName}${extension}`;
        let fullPath = path.join(directory, filename);

        while (await fs.pathExists(fullPath)) {
            counter++;
            filename = `${sanitizedBaseName}_${counter}${extension}`;
            fullPath = path.join(directory, filename);
        }

        return filename;
    }

    /**
     * Sanitize filename
     * @param {string} filename - Filename to sanitize
     * @returns {string} Sanitized filename
     */
    static sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace invalid characters
            .replace(/^\.+/, '') // Remove leading dots
            .replace(/\.+$/, '') // Remove trailing dots
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 255); // Limit length
    }

    /**
     * Calculate file hash
     * @param {string} filePath - Path to file
     * @param {string} algorithm - Hash algorithm (md5, sha1, sha256)
     * @returns {Promise<string>} File hash
     */
    static async calculateHash(filePath, algorithm = 'sha256') {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash(algorithm);
            const stream = fs.createReadStream(filePath);

            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Copy file safely
     * @param {string} source - Source file path
     * @param {string} destination - Destination file path
     * @param {Object} options - Copy options
     * @returns {Promise<boolean>} Copy success
     */
    static async copyFile(source, destination, options = {}) {
        try {
            const { overwrite = false, preserveTimestamps = true } = options;

            // Validate paths
            const sourceValidation = this.validatePath(source);
            const destValidation = this.validatePath(destination);
            
            if (!sourceValidation.valid) {
                throw new Error(`Invalid source path: ${sourceValidation.error}`);
            }
            
            if (!destValidation.valid) {
                throw new Error(`Invalid destination path: ${destValidation.error}`);
            }

            // Check if source exists
            if (!await fs.pathExists(source)) {
                throw new Error('Source file does not exist');
            }

            // Check if destination exists and overwrite is not allowed
            if (!overwrite && await fs.pathExists(destination)) {
                throw new Error('Destination file already exists');
            }

            // Ensure destination directory exists
            await fs.ensureDir(path.dirname(destination));

            // Copy file
            await fs.copy(source, destination, { 
                overwrite: overwrite,
                preserveTimestamps: preserveTimestamps 
            });

            return true;
        } catch (error) {
            throw new Error(`Failed to copy file: ${error.message}`);
        }
    }

    /**
     * Move file safely
     * @param {string} source - Source file path
     * @param {string} destination - Destination file path
     * @param {Object} options - Move options
     * @returns {Promise<boolean>} Move success
     */
    static async moveFile(source, destination, options = {}) {
        try {
            const { overwrite = false } = options;

            // First copy the file
            await this.copyFile(source, destination, { overwrite });

            // Then remove the source
            await fs.remove(source);

            return true;
        } catch (error) {
            throw new Error(`Failed to move file: ${error.message}`);
        }
    }

    /**
     * Delete file safely
     * @param {string} filePath - Path to file
     * @returns {Promise<boolean>} Delete success
     */
    static async deleteFile(filePath) {
        try {
            const pathValidation = this.validatePath(filePath);
            if (!pathValidation.valid) {
                throw new Error(pathValidation.error);
            }

            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                return true;
            }

            return false;
        } catch (error) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    /**
     * Create directory safely
     * @param {string} dirPath - Directory path
     * @returns {Promise<boolean>} Creation success
     */
    static async createDirectory(dirPath) {
        try {
            const pathValidation = this.validatePath(dirPath);
            if (!pathValidation.valid) {
                throw new Error(pathValidation.error);
            }

            await fs.ensureDir(dirPath);
            return true;
        } catch (error) {
            throw new Error(`Failed to create directory: ${error.message}`);
        }
    }

    /**
     * List directory contents
     * @param {string} dirPath - Directory path
     * @param {Object} options - List options
     * @returns {Promise<Array>} Directory contents
     */
    static async listDirectory(dirPath, options = {}) {
        try {
            const { includeStats = false, recursive = false } = options;

            const pathValidation = this.validatePath(dirPath);
            if (!pathValidation.valid) {
                throw new Error(pathValidation.error);
            }

            if (!await fs.pathExists(dirPath)) {
                throw new Error('Directory does not exist');
            }

            const items = [];
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const item = {
                    name: entry.name,
                    path: fullPath,
                    isFile: entry.isFile(),
                    isDirectory: entry.isDirectory()
                };

                if (includeStats) {
                    const stats = await fs.stat(fullPath);
                    item.size = stats.size;
                    item.created = stats.birthtime;
                    item.modified = stats.mtime;
                }

                items.push(item);

                // Recursive listing for directories
                if (recursive && entry.isDirectory()) {
                    const subItems = await this.listDirectory(fullPath, options);
                    items.push(...subItems);
                }
            }

            return items;
        } catch (error) {
            throw new Error(`Failed to list directory: ${error.message}`);
        }
    }

    /**
     * Clean up temporary files
     * @param {string} tempDir - Temporary directory path
     * @param {number} maxAge - Maximum age in milliseconds
     * @returns {Promise<number>} Number of files cleaned
     */
    static async cleanupTempFiles(tempDir, maxAge = 24 * 60 * 60 * 1000) {
        try {
            if (!await fs.pathExists(tempDir)) {
                return 0;
            }

            const items = await this.listDirectory(tempDir, { includeStats: true });
            const now = Date.now();
            let cleanedCount = 0;

            for (const item of items) {
                if (item.isFile && (now - item.modified.getTime()) > maxAge) {
                    await this.deleteFile(item.path);
                    cleanedCount++;
                }
            }

            return cleanedCount;
        } catch (error) {
            throw new Error(`Failed to cleanup temp files: ${error.message}`);
        }
    }

    /**
     * Get directory size
     * @param {string} dirPath - Directory path
     * @returns {Promise<number>} Directory size in bytes
     */
    static async getDirectorySize(dirPath) {
        try {
            const items = await this.listDirectory(dirPath, { includeStats: true, recursive: true });
            return items
                .filter(item => item.isFile)
                .reduce((total, item) => total + item.size, 0);
        } catch (error) {
            throw new Error(`Failed to get directory size: ${error.message}`);
        }
    }
}

module.exports = { FileUtils };