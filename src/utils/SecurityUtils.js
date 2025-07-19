/**
 * ChatPulse - Security Utilities
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const crypto = require('crypto');
const { Logger } = require('./Logger');

/**
 * Security utilities for ChatPulse
 */
class SecurityUtils {
    constructor() {
        this.logger = new Logger('SecurityUtils');
    }

    /**
     * Generate secure random string
     */
    generateSecureRandom(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Hash data with salt
     */
    hashWithSalt(data, salt = null) {
        if (!salt) {
            salt = crypto.randomBytes(16).toString('hex');
        }
        
        const hash = crypto.createHash('sha256');
        hash.update(data + salt);
        
        return {
            hash: hash.digest('hex'),
            salt
        };
    }

    /**
     * Verify hashed data
     */
    verifyHash(data, hash, salt) {
        const computed = this.hashWithSalt(data, salt);
        return computed.hash === hash;
    }

    /**
     * Encrypt data
     */
    encrypt(data, key) {
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Decrypt data
     */
    decrypt(encryptedData, key) {
        const algorithm = 'aes-256-gcm';
        const decipher = crypto.createDecipher(algorithm, key);
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    /**
     * Sanitize input to prevent injection attacks
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    }

    /**
     * Validate phone number format
     */
    validatePhoneNumber(phoneNumber) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber.replace(/\s|-/g, ''));
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Generate TOTP token
     */
    generateTOTP(secret, window = 0) {
        const time = Math.floor(Date.now() / 1000 / 30) + window;
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeUInt32BE(time, 4);
        
        const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
        hmac.update(timeBuffer);
        const hash = hmac.digest();
        
        const offset = hash[hash.length - 1] & 0xf;
        const code = ((hash[offset] & 0x7f) << 24) |
                    ((hash[offset + 1] & 0xff) << 16) |
                    ((hash[offset + 2] & 0xff) << 8) |
                    (hash[offset + 3] & 0xff);
        
        return (code % 1000000).toString().padStart(6, '0');
    }

    /**
     * Verify TOTP token
     */
    verifyTOTP(token, secret, window = 1) {
        for (let i = -window; i <= window; i++) {
            if (this.generateTOTP(secret, i) === token) {
                return true;
            }
        }
        return false;
    }

    /**
     * Rate limiting check
     */
    checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
        const now = Date.now();
        const key = `rate_limit_${identifier}`;
        
        if (!this.rateLimitStore) {
            this.rateLimitStore = new Map();
        }
        
        const requests = this.rateLimitStore.get(key) || [];
        const validRequests = requests.filter(time => now - time < windowMs);
        
        if (validRequests.length >= maxRequests) {
            return false;
        }
        
        validRequests.push(now);
        this.rateLimitStore.set(key, validRequests);
        
        return true;
    }
}

module.exports = { SecurityUtils };