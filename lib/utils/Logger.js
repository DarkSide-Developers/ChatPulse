/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

/**
 * Advanced logging utility with multiple levels and file output
 * Provides colored console output and optional file logging
 */
class Logger {
    /**
     * Initialize Logger
     * @param {string} module - Module name for log prefixing
     * @param {Object} options - Logger options
     */
    constructor(module = 'ChatPulse', options = {}) {
        this.module = module;
        this.options = {
            level: process.env.LOG_LEVEL || 'info',
            enableFile: process.env.LOG_TO_FILE === 'true',
            logDir: process.env.LOG_DIR || './logs',
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            ...options
        };

        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };

        this.colors = {
            error: chalk.red,
            warn: chalk.yellow,
            info: chalk.blue,
            debug: chalk.green,
            trace: chalk.gray,
            success: chalk.green.bold
        };

        this._ensureLogDir();
    }

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    error(message, ...args) {
        this._log('error', message, ...args);
    }

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    warn(message, ...args) {
        this._log('warn', message, ...args);
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    info(message, ...args) {
        this._log('info', message, ...args);
    }

    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    debug(message, ...args) {
        this._log('debug', message, ...args);
    }

    /**
     * Log trace message
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    trace(message, ...args) {
        this._log('trace', message, ...args);
    }

    /**
     * Log success message
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    success(message, ...args) {
        this._log('success', message, ...args);
    }

    /**
     * Internal logging method
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     * @private
     */
    _log(level, message, ...args) {
        const levelNum = this.levels[level] !== undefined ? this.levels[level] : this.levels.info;
        const currentLevelNum = this.levels[this.options.level] || this.levels.info;

        if (levelNum > currentLevelNum && level !== 'success') {
            return;
        }

        const timestamp = new Date().toISOString();
        const colorFn = this.colors[level] || chalk.white;
        
        // Format message
        const formattedMessage = this._formatMessage(message, args);
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${formattedMessage}`;
        
        // Console output with colors
        console.log(colorFn(logEntry));

        // File output (without colors)
        if (this.options.enableFile) {
            this._writeToFile(logEntry);
        }
    }

    /**
     * Format log message with arguments
     * @param {string} message - Base message
     * @param {Array} args - Additional arguments
     * @returns {string} Formatted message
     * @private
     */
    _formatMessage(message, args) {
        let formatted = message;

        if (args.length > 0) {
            // Handle error objects
            const processedArgs = args.map(arg => {
                if (arg instanceof Error) {
                    return `${arg.message}\n${arg.stack}`;
                } else if (typeof arg === 'object') {
                    return JSON.stringify(arg, null, 2);
                }
                return String(arg);
            });

            formatted += ' ' + processedArgs.join(' ');
        }

        return formatted;
    }

    /**
     * Write log entry to file
     * @param {string} logEntry - Log entry to write
     * @private
     */
    async _writeToFile(logEntry) {
        try {
            const logFile = path.join(this.options.logDir, `chatpulse-${new Date().toISOString().split('T')[0]}.log`);
            
            // Check file size and rotate if necessary
            if (await fs.pathExists(logFile)) {
                const stats = await fs.stat(logFile);
                if (stats.size > this.options.maxFileSize) {
                    await this._rotateLogFile(logFile);
                }
            }

            await fs.appendFile(logFile, logEntry + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Rotate log file when it exceeds max size
     * @param {string} logFile - Current log file path
     * @private
     */
    async _rotateLogFile(logFile) {
        try {
            const baseName = path.basename(logFile, '.log');
            const dir = path.dirname(logFile);
            
            // Rotate existing files
            for (let i = this.options.maxFiles - 1; i > 0; i--) {
                const oldFile = path.join(dir, `${baseName}.${i}.log`);
                const newFile = path.join(dir, `${baseName}.${i + 1}.log`);
                
                if (await fs.pathExists(oldFile)) {
                    await fs.move(oldFile, newFile, { overwrite: true });
                }
            }
            
            // Move current file to .1
            const rotatedFile = path.join(dir, `${baseName}.1.log`);
            await fs.move(logFile, rotatedFile, { overwrite: true });
            
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }

    /**
     * Ensure log directory exists
     * @private
     */
    async _ensureLogDir() {
        if (this.options.enableFile) {
            try {
                await fs.ensureDir(this.options.logDir);
            } catch (error) {
                console.error('Failed to create log directory:', error);
                this.options.enableFile = false;
            }
        }
    }

    /**
     * Create child logger with additional context
     * @param {string} childModule - Child module name
     * @returns {Logger} Child logger instance
     */
    child(childModule) {
        return new Logger(`${this.module}:${childModule}`, this.options);
    }

    /**
     * Set log level
     * @param {string} level - New log level
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.options.level = level;
        } else {
            this.warn(`Invalid log level: ${level}`);
        }
    }

    /**
     * Get current log level
     * @returns {string} Current log level
     */
    getLevel() {
        return this.options.level;
    }
}

module.exports = { Logger };