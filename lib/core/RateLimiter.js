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
 * Rate limiter to prevent API abuse and respect WhatsApp limits
 * Implements token bucket and sliding window algorithms
 */
class RateLimiter {
    /**
     * Default rate limits for different operations
     */
    static defaultLimits = {
        message: { requests: 20, window: 60000 }, // 20 messages per minute
        media: { requests: 10, window: 60000 },   // 10 media per minute
        group: { requests: 5, window: 60000 },    // 5 group operations per minute
        contact: { requests: 30, window: 60000 }, // 30 contact operations per minute
        status: { requests: 10, window: 60000 },  // 10 status updates per minute
        global: { requests: 100, window: 60000 }  // 100 total operations per minute
    };

    /**
     * Initialize RateLimiter
     * @param {Object} options - Rate limiter options
     */
    constructor(options = {}) {
        this.logger = new Logger('RateLimiter');
        this.limits = { ...RateLimiter.defaultLimits, ...options.limits };
        this.buckets = new Map();
        this.windows = new Map();
        this.enabled = options.enabled !== false;
        this.strictMode = options.strictMode || false;
        
        // Cleanup interval
        this.cleanupInterval = setInterval(() => {
            this._cleanup();
        }, 60000); // Cleanup every minute
    }

    /**
     * Check if operation is allowed
     * @param {string} operation - Operation type
     * @param {string} identifier - Unique identifier (e.g., chat ID)
     * @returns {Promise<Object>} Rate limit result
     */
    async checkLimit(operation, identifier = 'global') {
        if (!this.enabled) {
            return { allowed: true, remaining: Infinity, resetTime: null };
        }

        const key = `${operation}:${identifier}`;
        const limit = this.limits[operation] || this.limits.global;
        
        // Use token bucket for burst handling
        const tokenResult = this._checkTokenBucket(key, limit);
        
        // Use sliding window for sustained rate limiting
        const windowResult = this._checkSlidingWindow(key, limit);
        
        const allowed = tokenResult.allowed && windowResult.allowed;
        const remaining = Math.min(tokenResult.remaining, windowResult.remaining);
        const resetTime = Math.max(tokenResult.resetTime || 0, windowResult.resetTime || 0);
        
        if (!allowed) {
            this.logger.warn(`Rate limit exceeded for ${operation}:${identifier}`);
            
            if (this.strictMode) {
                throw new Error(`Rate limit exceeded for ${operation}. Try again in ${Math.ceil((resetTime - Date.now()) / 1000)} seconds.`);
            }
        }
        
        return {
            allowed: allowed,
            remaining: remaining,
            resetTime: resetTime,
            limit: limit.requests,
            window: limit.window
        };
    }

    /**
     * Consume a token for an operation
     * @param {string} operation - Operation type
     * @param {string} identifier - Unique identifier
     * @returns {Promise<boolean>} Success status
     */
    async consume(operation, identifier = 'global') {
        const result = await this.checkLimit(operation, identifier);
        
        if (result.allowed) {
            const key = `${operation}:${identifier}`;
            this._consumeToken(key);
            this._recordRequest(key);
            return true;
        }
        
        return false;
    }

    /**
     * Wait until operation is allowed
     * @param {string} operation - Operation type
     * @param {string} identifier - Unique identifier
     * @param {number} maxWait - Maximum wait time in milliseconds
     * @returns {Promise<boolean>} Success status
     */
    async waitForLimit(operation, identifier = 'global', maxWait = 60000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            const result = await this.checkLimit(operation, identifier);
            
            if (result.allowed) {
                await this.consume(operation, identifier);
                return true;
            }
            
            // Wait until reset time or a short interval
            const waitTime = Math.min(
                result.resetTime - Date.now(),
                1000 // Maximum 1 second wait
            );
            
            if (waitTime > 0) {
                await this._delay(waitTime);
            }
        }
        
        return false;
    }

    /**
     * Get current rate limit status
     * @param {string} operation - Operation type
     * @param {string} identifier - Unique identifier
     * @returns {Object} Rate limit status
     */
    getStatus(operation, identifier = 'global') {
        const key = `${operation}:${identifier}`;
        const limit = this.limits[operation] || this.limits.global;
        
        const bucket = this.buckets.get(key);
        const window = this.windows.get(key);
        
        return {
            operation: operation,
            identifier: identifier,
            limit: limit.requests,
            window: limit.window,
            tokensRemaining: bucket ? bucket.tokens : limit.requests,
            requestsInWindow: window ? window.requests.length : 0,
            nextReset: bucket ? bucket.lastRefill + limit.window : Date.now() + limit.window
        };
    }

    /**
     * Reset rate limits for an operation
     * @param {string} operation - Operation type
     * @param {string} identifier - Unique identifier
     */
    reset(operation, identifier = 'global') {
        const key = `${operation}:${identifier}`;
        this.buckets.delete(key);
        this.windows.delete(key);
        this.logger.debug(`Rate limit reset for ${key}`);
    }

    /**
     * Reset all rate limits
     */
    resetAll() {
        this.buckets.clear();
        this.windows.clear();
        this.logger.info('All rate limits reset');
    }

    /**
     * Update rate limits
     * @param {Object} newLimits - New rate limits
     */
    updateLimits(newLimits) {
        this.limits = { ...this.limits, ...newLimits };
        this.logger.info('Rate limits updated');
    }

    /**
     * Enable or disable rate limiting
     * @param {boolean} enabled - Enable status
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.logger.info(`Rate limiting ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check token bucket algorithm
     * @param {string} key - Rate limit key
     * @param {Object} limit - Rate limit configuration
     * @returns {Object} Token bucket result
     * @private
     */
    _checkTokenBucket(key, limit) {
        let bucket = this.buckets.get(key);
        const now = Date.now();
        
        if (!bucket) {
            bucket = {
                tokens: limit.requests,
                lastRefill: now
            };
            this.buckets.set(key, bucket);
        }
        
        // Refill tokens based on time passed
        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = Math.floor(timePassed / limit.window * limit.requests);
        
        if (tokensToAdd > 0) {
            bucket.tokens = Math.min(limit.requests, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
        }
        
        const allowed = bucket.tokens > 0;
        const resetTime = bucket.lastRefill + limit.window;
        
        return {
            allowed: allowed,
            remaining: bucket.tokens,
            resetTime: resetTime
        };
    }

    /**
     * Check sliding window algorithm
     * @param {string} key - Rate limit key
     * @param {Object} limit - Rate limit configuration
     * @returns {Object} Sliding window result
     * @private
     */
    _checkSlidingWindow(key, limit) {
        let window = this.windows.get(key);
        const now = Date.now();
        
        if (!window) {
            window = {
                requests: [],
                lastCleanup: now
            };
            this.windows.set(key, window);
        }
        
        // Remove old requests outside the window
        const cutoff = now - limit.window;
        window.requests = window.requests.filter(timestamp => timestamp > cutoff);
        
        const allowed = window.requests.length < limit.requests;
        const remaining = limit.requests - window.requests.length;
        const resetTime = window.requests.length > 0 ? window.requests[0] + limit.window : now;
        
        return {
            allowed: allowed,
            remaining: remaining,
            resetTime: resetTime
        };
    }

    /**
     * Consume a token from bucket
     * @param {string} key - Rate limit key
     * @private
     */
    _consumeToken(key) {
        const bucket = this.buckets.get(key);
        if (bucket && bucket.tokens > 0) {
            bucket.tokens--;
        }
    }

    /**
     * Record a request in sliding window
     * @param {string} key - Rate limit key
     * @private
     */
    _recordRequest(key) {
        const window = this.windows.get(key);
        if (window) {
            window.requests.push(Date.now());
        }
    }

    /**
     * Cleanup old data
     * @private
     */
    _cleanup() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        // Cleanup old buckets
        for (const [key, bucket] of this.buckets.entries()) {
            if (now - bucket.lastRefill > maxAge) {
                this.buckets.delete(key);
            }
        }
        
        // Cleanup old windows
        for (const [key, window] of this.windows.entries()) {
            if (now - window.lastCleanup > maxAge) {
                this.windows.delete(key);
            }
        }
        
        this.logger.debug('Rate limiter cleanup completed');
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
     * Get rate limiter statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            enabled: this.enabled,
            strictMode: this.strictMode,
            activeBuckets: this.buckets.size,
            activeWindows: this.windows.size,
            limits: this.limits
        };
    }

    /**
     * Cleanup and destroy rate limiter
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.buckets.clear();
        this.windows.clear();
        
        this.logger.info('Rate limiter destroyed');
    }
}

module.exports = { RateLimiter };