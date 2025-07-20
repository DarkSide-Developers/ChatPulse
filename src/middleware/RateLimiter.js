/**
 * ChatPulse - Rate Limiter
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { RateLimitError } = require('../errors/ChatPulseError');

/**
 * Simple rate limiter to prevent spam
 */
class RateLimiter {
    constructor(options = {}) {
        this.limits = new Map();
        this.defaultLimit = options.defaultLimit || 10; // messages per minute
        this.windowMs = options.windowMs || 60000; // 1 minute
        this.enabled = options.enabled !== false;
    }

    /**
     * Check if action is within rate limit
     */
    checkLimit(identifier, action = 'default') {
        if (!this.enabled) {
            return true;
        }

        const key = `${identifier}:${action}`;
        const now = Date.now();
        
        if (!this.limits.has(key)) {
            this.limits.set(key, {
                count: 1,
                resetTime: now + this.windowMs
            });
            return true;
        }

        const limit = this.limits.get(key);
        
        // Reset if window expired
        if (now >= limit.resetTime) {
            limit.count = 1;
            limit.resetTime = now + this.windowMs;
            return true;
        }

        // Check if within limit
        if (limit.count >= this.defaultLimit) {
            throw new RateLimitError(
                `Rate limit exceeded for ${action}. Try again later.`,
                'RATE_LIMIT_EXCEEDED',
                {
                    identifier,
                    action,
                    limit: this.defaultLimit,
                    resetTime: limit.resetTime
                }
            );
        }

        limit.count++;
        return true;
    }

    /**
     * Reset rate limit for identifier
     */
    reset(identifier, action = 'default') {
        const key = `${identifier}:${action}`;
        this.limits.delete(key);
    }

    /**
     * Clear all rate limits
     */
    clear() {
        this.limits.clear();
    }

    /**
     * Get current usage for identifier
     */
    getUsage(identifier, action = 'default') {
        const key = `${identifier}:${action}`;
        const limit = this.limits.get(key);
        
        if (!limit) {
            return { count: 0, remaining: this.defaultLimit };
        }

        const now = Date.now();
        if (now >= limit.resetTime) {
            return { count: 0, remaining: this.defaultLimit };
        }

        return {
            count: limit.count,
            remaining: Math.max(0, this.defaultLimit - limit.count),
            resetTime: limit.resetTime
        };
    }
}

module.exports = { RateLimiter };