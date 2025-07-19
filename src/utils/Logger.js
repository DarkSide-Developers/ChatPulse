/**
 * ChatPulse - Enhanced Logger using Pino
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');

/**
 * Enhanced logger wrapper using Pino
 */
class Logger {
    constructor(name, options = {}) {
        this.name = name;
        this.options = {
            level: process.env.LOG_LEVEL || 'info',
            logToFile: process.env.LOG_TO_FILE === 'true',
            logDir: process.env.LOG_DIR || './logs',
            ...options
        };

        this._setupLogger();
    }

    /**
     * Setup Pino logger
     */
    _setupLogger() {
        const loggerConfig = {
            name: this.name,
            level: this.options.level,
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label) => {
                    return { level: label.toUpperCase() };
                }
            }
        };

        // Setup file transport if enabled
        if (this.options.logToFile) {
            this._ensureLogDir();
            
            const logFile = path.join(this.options.logDir, `${this.name.toLowerCase()}.log`);
            
            loggerConfig.transport = {
                target: 'pino/file',
                options: {
                    destination: logFile,
                    mkdir: true,
                    sync: false
                }
            };
        } else {
            // Pretty print for development
            if (process.env.NODE_ENV !== 'production') {
                try {
                    // Only use pino-pretty if it's available
                    require.resolve('pino-pretty');
                    loggerConfig.transport = {
                        target: 'pino-pretty',
                        options: {
                            colorize: true,
                            translateTime: 'SYS:standard',
                            ignore: 'pid,hostname'
                        }
                    };
                } catch (error) {
                    // pino-pretty not available, use default console output
                    // No transport needed for basic console output
                }
            }
        }

        this.logger = pino(loggerConfig);
    }

    /**
     * Ensure log directory exists
     */
    _ensureLogDir() {
        try {
            fs.ensureDirSync(this.options.logDir);
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    /**
     * Log debug message
     */
    debug(message, data = {}) {
        this.logger.debug(data, message);
    }

    /**
     * Log info message
     */
    info(message, data = {}) {
        this.logger.info(data, message);
    }

    /**
     * Log success message (info level with success flag)
     */
    success(message, data = {}) {
        this.logger.info({ ...data, success: true }, message);
    }

    /**
     * Log warning message
     */
    warn(message, data = {}) {
        this.logger.warn(data, message);
    }

    /**
     * Log error message
     */
    error(message, data = {}) {
        if (data instanceof Error) {
            this.logger.error({ err: data }, message);
        } else if (data.error instanceof Error) {
            this.logger.error({ ...data, err: data.error }, message);
        } else {
            this.logger.error(data, message);
        }
    }

    /**
     * Log fatal message
     */
    fatal(message, data = {}) {
        this.logger.fatal(data, message);
    }

    /**
     * Create child logger
     */
    child(bindings) {
        const childLogger = this.logger.child(bindings);
        return {
            debug: (msg, data) => childLogger.debug(data, msg),
            info: (msg, data) => childLogger.info(data, msg),
            success: (msg, data) => childLogger.info({ ...data, success: true }, msg),
            warn: (msg, data) => childLogger.warn(data, msg),
            error: (msg, data) => {
                if (data instanceof Error) {
                    childLogger.error({ err: data }, msg);
                } else if (data?.error instanceof Error) {
                    childLogger.error({ ...data, err: data.error }, msg);
                } else {
                    childLogger.error(data, msg);
                }
            },
            fatal: (msg, data) => childLogger.fatal(data, msg)
        };
    }

    /**
     * Set log level
     */
    setLevel(level) {
        this.logger.level = level;
    }

    /**
     * Get current log level
     */
    getLevel() {
        return this.logger.level;
    }

    /**
     * Flush logs (useful for file logging)
     */
    flush() {
        if (this.logger.flush) {
            this.logger.flush();
        }
    }
}

module.exports = { Logger };