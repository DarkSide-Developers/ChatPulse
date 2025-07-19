/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { Logger } = require('../utils/Logger');

/**
 * Centralized error handling system
 * Provides comprehensive error management and recovery strategies
 */
class ErrorHandler {
    /**
     * Error types and their configurations
     */
    static errorTypes = {
        CONNECTION_ERROR: {
            code: 'CONNECTION_ERROR',
            severity: 'high',
            recoverable: true,
            retryable: true
        },
        AUTHENTICATION_ERROR: {
            code: 'AUTHENTICATION_ERROR',
            severity: 'high',
            recoverable: true,
            retryable: false
        },
        RATE_LIMIT_ERROR: {
            code: 'RATE_LIMIT_ERROR',
            severity: 'medium',
            recoverable: true,
            retryable: true
        },
        VALIDATION_ERROR: {
            code: 'VALIDATION_ERROR',
            severity: 'low',
            recoverable: false,
            retryable: false
        },
        NETWORK_ERROR: {
            code: 'NETWORK_ERROR',
            severity: 'medium',
            recoverable: true,
            retryable: true
        },
        TIMEOUT_ERROR: {
            code: 'TIMEOUT_ERROR',
            severity: 'medium',
            recoverable: true,
            retryable: true
        },
        PERMISSION_ERROR: {
            code: 'PERMISSION_ERROR',
            severity: 'high',
            recoverable: false,
            retryable: false
        },
        RESOURCE_ERROR: {
            code: 'RESOURCE_ERROR',
            severity: 'medium',
            recoverable: true,
            retryable: true
        },
        UNKNOWN_ERROR: {
            code: 'UNKNOWN_ERROR',
            severity: 'high',
            recoverable: false,
            retryable: false
        }
    };

    /**
     * Initialize ErrorHandler
     * @param {ChatPulse} client - ChatPulse client instance
     */
    constructor(client) {
        this.client = client;
        this.logger = new Logger('ErrorHandler');
        this.errorHistory = [];
        this.retryAttempts = new Map();
        this.maxRetryAttempts = 3;
        this.retryDelay = 1000;
        this.errorCallbacks = new Map();
        
        this._setupGlobalErrorHandlers();
    }

    /**
     * Handle error with appropriate strategy
     * @param {Error} error - Error to handle
     * @param {Object} context - Error context
     * @returns {Promise<Object>} Error handling result
     */
    async handleError(error, context = {}) {
        try {
            // Classify error
            const errorInfo = this._classifyError(error, context);
            
            // Log error
            this._logError(errorInfo);
            
            // Store in history
            this._storeErrorHistory(errorInfo);
            
            // Determine recovery strategy
            const strategy = this._determineRecoveryStrategy(errorInfo);
            
            // Execute recovery strategy
            const result = await this._executeRecoveryStrategy(strategy, errorInfo);
            
            // Emit error event
            this.client.emit('error_handled', {
                error: errorInfo,
                strategy: strategy,
                result: result
            });
            
            return result;
            
        } catch (handlingError) {
            this.logger.error('Error in error handler:', handlingError);
            return {
                success: false,
                error: handlingError,
                strategy: 'none'
            };
        }
    }

    /**
     * Register error callback
     * @param {string} errorType - Error type to handle
     * @param {Function} callback - Callback function
     */
    registerErrorCallback(errorType, callback) {
        if (!this.errorCallbacks.has(errorType)) {
            this.errorCallbacks.set(errorType, []);
        }
        this.errorCallbacks.get(errorType).push(callback);
    }

    /**
     * Unregister error callback
     * @param {string} errorType - Error type
     * @param {Function} callback - Callback function to remove
     */
    unregisterErrorCallback(errorType, callback) {
        if (this.errorCallbacks.has(errorType)) {
            const callbacks = this.errorCallbacks.get(errorType);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Classify error type and severity
     * @param {Error} error - Error to classify
     * @param {Object} context - Error context
     * @returns {Object} Error information
     * @private
     */
    _classifyError(error, context) {
        let errorType = 'UNKNOWN_ERROR';
        
        // Classify based on error message and type
        if (error.message.includes('connection') || error.code === 'ECONNREFUSED') {
            errorType = 'CONNECTION_ERROR';
        } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
            errorType = 'AUTHENTICATION_ERROR';
        } else if (error.message.includes('rate limit') || error.code === 'RATE_LIMITED') {
            errorType = 'RATE_LIMIT_ERROR';
        } else if (error.message.includes('validation') || error.name === 'ValidationError') {
            errorType = 'VALIDATION_ERROR';
        } else if (error.message.includes('network') || error.code === 'ENETUNREACH') {
            errorType = 'NETWORK_ERROR';
        } else if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
            errorType = 'TIMEOUT_ERROR';
        } else if (error.message.includes('permission') || error.code === 'EACCES') {
            errorType = 'PERMISSION_ERROR';
        } else if (error.message.includes('resource') || error.code === 'ENOSPC') {
            errorType = 'RESOURCE_ERROR';
        }
        
        const typeConfig = this.errorTypes[errorType];
        
        return {
            id: this._generateErrorId(),
            type: errorType,
            severity: typeConfig.severity,
            recoverable: typeConfig.recoverable,
            retryable: typeConfig.retryable,
            originalError: error,
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            retryCount: this.retryAttempts.get(error.message) || 0
        };
    }

    /**
     * Determine recovery strategy
     * @param {Object} errorInfo - Error information
     * @returns {Object} Recovery strategy
     * @private
     */
    _determineRecoveryStrategy(errorInfo) {
        const strategy = {
            type: 'none',
            actions: [],
            retryable: false,
            delay: 0
        };
        
        switch (errorInfo.type) {
            case 'CONNECTION_ERROR':
                strategy.type = 'reconnect';
                strategy.actions = ['wait', 'reconnect', 'verify'];
                strategy.retryable = true;
                strategy.delay = this.retryDelay * Math.pow(2, errorInfo.retryCount);
                break;
                
            case 'AUTHENTICATION_ERROR':
                strategy.type = 'reauthenticate';
                strategy.actions = ['clear_session', 'restart_auth'];
                strategy.retryable = false;
                break;
                
            case 'RATE_LIMIT_ERROR':
                strategy.type = 'backoff';
                strategy.actions = ['wait', 'retry'];
                strategy.retryable = true;
                strategy.delay = 60000; // 1 minute
                break;
                
            case 'NETWORK_ERROR':
                strategy.type = 'retry';
                strategy.actions = ['wait', 'retry'];
                strategy.retryable = true;
                strategy.delay = this.retryDelay * (errorInfo.retryCount + 1);
                break;
                
            case 'TIMEOUT_ERROR':
                strategy.type = 'retry';
                strategy.actions = ['wait', 'retry'];
                strategy.retryable = true;
                strategy.delay = this.retryDelay;
                break;
                
            case 'RESOURCE_ERROR':
                strategy.type = 'cleanup';
                strategy.actions = ['cleanup_resources', 'retry'];
                strategy.retryable = true;
                strategy.delay = this.retryDelay;
                break;
                
            default:
                strategy.type = 'log';
                strategy.actions = ['log', 'notify'];
                break;
        }
        
        // Check retry limits
        if (strategy.retryable && errorInfo.retryCount >= this.maxRetryAttempts) {
            strategy.type = 'fail';
            strategy.retryable = false;
            strategy.actions = ['log', 'notify', 'fail'];
        }
        
        return strategy;
    }

    /**
     * Execute recovery strategy
     * @param {Object} strategy - Recovery strategy
     * @param {Object} errorInfo - Error information
     * @returns {Promise<Object>} Recovery result
     * @private
     */
    async _executeRecoveryStrategy(strategy, errorInfo) {
        const result = {
            success: false,
            strategy: strategy.type,
            actions: [],
            error: null
        };
        
        try {
            for (const action of strategy.actions) {
                const actionResult = await this._executeRecoveryAction(action, errorInfo, strategy);
                result.actions.push({
                    action: action,
                    success: actionResult.success,
                    details: actionResult.details
                });
                
                if (!actionResult.success && action !== 'log' && action !== 'notify') {
                    throw new Error(`Recovery action '${action}' failed: ${actionResult.error}`);
                }
            }
            
            result.success = true;
            
        } catch (error) {
            result.error = error.message;
            this.logger.error('Recovery strategy execution failed:', error);
        }
        
        return result;
    }

    /**
     * Execute individual recovery action
     * @param {string} action - Action to execute
     * @param {Object} errorInfo - Error information
     * @param {Object} strategy - Recovery strategy
     * @returns {Promise<Object>} Action result
     * @private
     */
    async _executeRecoveryAction(action, errorInfo, strategy) {
        switch (action) {
            case 'wait':
                await this._delay(strategy.delay);
                return { success: true, details: `Waited ${strategy.delay}ms` };
                
            case 'reconnect':
                try {
                    await this.client.connectionManager.connect();
                    return { success: true, details: 'Reconnection successful' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
                
            case 'reauthenticate':
                try {
                    await this.client.sessionManager.deleteSession();
                    await this.client.initialize();
                    return { success: true, details: 'Reauthentication successful' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
                
            case 'retry':
                this._incrementRetryCount(errorInfo.originalError.message);
                return { success: true, details: 'Retry scheduled' };
                
            case 'cleanup_resources':
                try {
                    await this._cleanupResources();
                    return { success: true, details: 'Resources cleaned up' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
                
            case 'clear_session':
                try {
                    await this.client.sessionManager.deleteSession();
                    return { success: true, details: 'Session cleared' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
                
            case 'restart_auth':
                try {
                    await this.client.qrHandler.clearQRCode();
                    return { success: true, details: 'Authentication restarted' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
                
            case 'verify':
                try {
                    const isConnected = this.client.isConnected;
                    return { 
                        success: isConnected, 
                        details: isConnected ? 'Connection verified' : 'Connection verification failed' 
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
                
            case 'log':
                this._logError(errorInfo);
                return { success: true, details: 'Error logged' };
                
            case 'notify':
                await this._notifyErrorCallbacks(errorInfo);
                return { success: true, details: 'Callbacks notified' };
                
            case 'fail':
                this.client.emit('critical_error', errorInfo);
                return { success: true, details: 'Critical error emitted' };
                
            default:
                return { success: false, error: `Unknown action: ${action}` };
        }
    }

    /**
     * Setup global error handlers
     * @private
     */
    _setupGlobalErrorHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught exception:', error);
            this.handleError(error, { type: 'uncaught_exception' });
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled promise rejection:', reason);
            this.handleError(new Error(reason), { type: 'unhandled_rejection', promise });
        });
    }

    /**
     * Log error with appropriate level
     * @param {Object} errorInfo - Error information
     * @private
     */
    _logError(errorInfo) {
        const logLevel = this._getLogLevel(errorInfo.severity);
        const message = `[${errorInfo.type}] ${errorInfo.message}`;
        
        this.logger[logLevel](message, {
            id: errorInfo.id,
            type: errorInfo.type,
            severity: errorInfo.severity,
            retryCount: errorInfo.retryCount,
            context: errorInfo.context,
            stack: errorInfo.stack
        });
    }

    /**
     * Store error in history
     * @param {Object} errorInfo - Error information
     * @private
     */
    _storeErrorHistory(errorInfo) {
        this.errorHistory.push(errorInfo);
        
        // Keep only last 100 errors
        if (this.errorHistory.length > 100) {
            this.errorHistory.shift();
        }
    }

    /**
     * Notify error callbacks
     * @param {Object} errorInfo - Error information
     * @private
     */
    async _notifyErrorCallbacks(errorInfo) {
        const callbacks = this.errorCallbacks.get(errorInfo.type) || [];
        
        for (const callback of callbacks) {
            try {
                await callback(errorInfo);
            } catch (error) {
                this.logger.error('Error in error callback:', error);
            }
        }
    }

    /**
     * Increment retry count for error
     * @param {string} errorKey - Error key
     * @private
     */
    _incrementRetryCount(errorKey) {
        const current = this.retryAttempts.get(errorKey) || 0;
        this.retryAttempts.set(errorKey, current + 1);
    }

    /**
     * Cleanup resources
     * @private
     */
    async _cleanupResources() {
        // Cleanup temporary files
        if (this.client.mediaHandler) {
            await this.client.mediaHandler._ensureTempDir();
        }
        
        // Clear message queue
        if (this.client.messageHandler) {
            this.client.messageHandler.messageQueue = [];
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    /**
     * Get log level for severity
     * @param {string} severity - Error severity
     * @returns {string} Log level
     * @private
     */
    _getLogLevel(severity) {
        switch (severity) {
            case 'low': return 'warn';
            case 'medium': return 'error';
            case 'high': return 'error';
            default: return 'error';
        }
    }

    /**
     * Generate unique error ID
     * @returns {string} Error ID
     * @private
     */
    _generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorHistory.length,
            byType: {},
            bySeverity: {},
            recent: this.errorHistory.slice(-10)
        };
        
        for (const error of this.errorHistory) {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        }
        
        return stats;
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
        this.retryAttempts.clear();
    }

    /**
     * Set retry configuration
     * @param {Object} config - Retry configuration
     */
    setRetryConfig(config) {
        if (config.maxRetryAttempts !== undefined) {
            this.maxRetryAttempts = config.maxRetryAttempts;
        }
        if (config.retryDelay !== undefined) {
            this.retryDelay = config.retryDelay;
        }
    }
}

module.exports = { ErrorHandler };