/**
 * ChatPulse - Centralized Error Handler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { Logger } = require('../utils/Logger');
const { ChatPulseError } = require('./ChatPulseError');
const { ErrorTypes } = require('../types');

/**
 * Centralized error handling and recovery system
 */
class ErrorHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('ErrorHandler');
        this.errorStats = new Map();
        this.recoveryStrategies = new Map();
        this.errorQueue = [];
        this.maxErrorQueueSize = 100;
        
        this._setupRecoveryStrategies();
        this._setupGlobalErrorHandlers();
    }

    /**
     * Handle error with automatic recovery
     */
    async handleError(error, context = {}) {
        try {
            // Convert to ChatPulseError if needed
            const chatPulseError = this._normalizError(error, context);
            
            // Log error
            this._logError(chatPulseError, context);
            
            // Update error statistics
            this._updateErrorStats(chatPulseError);
            
            // Add to error queue
            this._addToErrorQueue(chatPulseError, context);
            
            // Attempt recovery
            const recovered = await this._attemptRecovery(chatPulseError, context);
            
            // Emit error event
            this.client.emit('error', chatPulseError, context, recovered);
            
            return recovered;
            
        } catch (handlerError) {
            this.logger.error('Error in error handler:', handlerError);
            return false;
        }
    }

    /**
     * Handle warning
     */
    handleWarning(message, context = {}) {
        const warning = {
            message,
            context,
            timestamp: new Date().toISOString(),
            type: 'warning'
        };
        
        this.logger.warn(message, context);
        this.client.emit('warning', warning);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {};
        for (const [type, count] of this.errorStats.entries()) {
            stats[type] = count;
        }
        
        return {
            errorCounts: stats,
            totalErrors: Array.from(this.errorStats.values()).reduce((sum, count) => sum + count, 0),
            recentErrors: this.errorQueue.slice(-10),
            queueSize: this.errorQueue.length
        };
    }

    /**
     * Clear error statistics
     */
    clearErrorStats() {
        this.errorStats.clear();
        this.errorQueue = [];
        this.logger.info('Error statistics cleared');
    }

    /**
     * Register custom recovery strategy
     */
    registerRecoveryStrategy(errorType, strategy) {
        if (typeof strategy !== 'function') {
            throw new Error('Recovery strategy must be a function');
        }
        
        this.recoveryStrategies.set(errorType, strategy);
        this.logger.info(`Recovery strategy registered for ${errorType}`);
    }

    /**
     * Normalize error to ChatPulseError
     */
    _normalizError(error, context) {
        if (error instanceof ChatPulseError) {
            return error;
        }
        
        // Detect error type based on message/context
        let errorType = ErrorTypes.UNKNOWN_ERROR;
        
        if (error.message?.includes('connection') || error.code === 'ECONNREFUSED') {
            errorType = ErrorTypes.CONNECTION_ERROR;
        } else if (error.message?.includes('timeout')) {
            errorType = ErrorTypes.TIMEOUT_ERROR;
        } else if (error.message?.includes('network') || error.code === 'ENETUNREACH') {
            errorType = ErrorTypes.NETWORK_ERROR;
        } else if (error.message?.includes('auth')) {
            errorType = ErrorTypes.AUTHENTICATION_ERROR;
        } else if (error.message?.includes('rate limit')) {
            errorType = ErrorTypes.RATE_LIMIT_ERROR;
        } else if (error.message?.includes('validation')) {
            errorType = ErrorTypes.VALIDATION_ERROR;
        }
        
        return new ChatPulseError(
            error.message || 'Unknown error occurred',
            errorType,
            error.code,
            { originalError: error, context }
        );
    }

    /**
     * Log error with appropriate level
     */
    _logError(error, context) {
        const severity = error.getSeverity();
        const logData = {
            type: error.type,
            code: error.code,
            context,
            recoverable: error.isRecoverable()
        };
        
        switch (severity) {
            case 'high':
                this.logger.error(error.message, logData);
                break;
            case 'medium':
                this.logger.warn(error.message, logData);
                break;
            case 'low':
                this.logger.info(error.message, logData);
                break;
            default:
                this.logger.error(error.message, logData);
        }
    }

    /**
     * Update error statistics
     */
    _updateErrorStats(error) {
        const count = this.errorStats.get(error.type) || 0;
        this.errorStats.set(error.type, count + 1);
    }

    /**
     * Add error to queue
     */
    _addToErrorQueue(error, context) {
        this.errorQueue.push({
            error: error.toJSON(),
            context,
            timestamp: new Date().toISOString()
        });
        
        // Maintain queue size
        if (this.errorQueue.length > this.maxErrorQueueSize) {
            this.errorQueue.shift();
        }
    }

    /**
     * Attempt error recovery
     */
    async _attemptRecovery(error, context) {
        if (!error.isRecoverable()) {
            this.logger.debug(`Error type ${error.type} is not recoverable`);
            return false;
        }
        
        const strategy = this.recoveryStrategies.get(error.type);
        if (!strategy) {
            this.logger.debug(`No recovery strategy found for ${error.type}`);
            return false;
        }
        
        try {
            this.logger.info(`Attempting recovery for ${error.type}`);
            const result = await strategy(error, context, this.client);
            
            if (result) {
                this.logger.info(`Recovery successful for ${error.type}`);
            } else {
                this.logger.warn(`Recovery failed for ${error.type}`);
            }
            
            return result;
        } catch (recoveryError) {
            this.logger.error(`Recovery strategy failed for ${error.type}:`, recoveryError);
            return false;
        }
    }

    /**
     * Setup default recovery strategies
     */
    _setupRecoveryStrategies() {
        // Connection error recovery
        this.recoveryStrategies.set(ErrorTypes.CONNECTION_ERROR, async (error, context, client) => {
            if (client.options.autoReconnect) {
                await this._delay(client.options.reconnectInterval || 5000);
                return await client._attemptReconnection();
            }
            return false;
        });
        
        // Network error recovery
        this.recoveryStrategies.set(ErrorTypes.NETWORK_ERROR, async (error, context, client) => {
            await this._delay(2000);
            return await client._checkNetworkConnectivity();
        });
        
        // Timeout error recovery
        this.recoveryStrategies.set(ErrorTypes.TIMEOUT_ERROR, async (error, context, client) => {
            if (context.retryable !== false) {
                await this._delay(1000);
                return true; // Allow retry
            }
            return false;
        });
        
        // Rate limit error recovery
        this.recoveryStrategies.set(ErrorTypes.RATE_LIMIT_ERROR, async (error, context, client) => {
            const delay = error.details.retryAfter || 60000; // 1 minute default
            this.logger.info(`Rate limited, waiting ${delay}ms before retry`);
            await this._delay(delay);
            return true;
        });
    }

    /**
     * Setup global error handlers
     */
    _setupGlobalErrorHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception:', error);
            this.handleError(error, { type: 'uncaughtException' });
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Rejection:', reason);
            this.handleError(reason, { type: 'unhandledRejection', promise });
        });
        
        // Handle warnings
        process.on('warning', (warning) => {
            this.handleWarning(warning.message, { warning });
        });
    }

    /**
     * Utility delay function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { ErrorHandler };