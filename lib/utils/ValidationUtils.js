/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

/**
 * Validation utilities for input validation and sanitization
 * Provides comprehensive validation for various data types
 */
class ValidationUtils {
    /**
     * Validate phone number format
     * @param {string} phoneNumber - Phone number to validate
     * @returns {Object} Validation result
     */
    static validatePhoneNumber(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return { valid: false, error: 'Phone number is required and must be a string' };
        }

        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Check length (international format: 7-15 digits)
        if (cleaned.length < 7 || cleaned.length > 15) {
            return { valid: false, error: 'Phone number must be between 7 and 15 digits' };
        }

        // Basic format validation
        const phoneRegex = /^[1-9]\d{6,14}$/;
        if (!phoneRegex.test(cleaned)) {
            return { valid: false, error: 'Invalid phone number format' };
        }

        return { 
            valid: true, 
            formatted: cleaned,
            whatsappId: `${cleaned}@c.us`
        };
    }

    /**
     * Validate group ID format
     * @param {string} groupId - Group ID to validate
     * @returns {Object} Validation result
     */
    static validateGroupId(groupId) {
        if (!groupId || typeof groupId !== 'string') {
            return { valid: false, error: 'Group ID is required and must be a string' };
        }

        // WhatsApp group ID format: numbers-timestamp@g.us
        const groupRegex = /^\d+-\d+@g\.us$/;
        if (!groupRegex.test(groupId)) {
            return { valid: false, error: 'Invalid group ID format' };
        }

        return { valid: true, formatted: groupId };
    }

    /**
     * Validate chat ID (phone number or group ID)
     * @param {string} chatId - Chat ID to validate
     * @returns {Object} Validation result
     */
    static validateChatId(chatId) {
        if (!chatId || typeof chatId !== 'string') {
            return { valid: false, error: 'Chat ID is required and must be a string' };
        }

        // Check if it's a group ID
        if (chatId.includes('-') && chatId.endsWith('@g.us')) {
            return this.validateGroupId(chatId);
        }

        // Check if it's already formatted
        if (chatId.endsWith('@c.us')) {
            const phoneNumber = chatId.replace('@c.us', '');
            const phoneValidation = this.validatePhoneNumber(phoneNumber);
            return {
                valid: phoneValidation.valid,
                error: phoneValidation.error,
                formatted: chatId,
                type: 'individual'
            };
        }

        // Validate as phone number
        const phoneValidation = this.validatePhoneNumber(chatId);
        if (phoneValidation.valid) {
            return {
                valid: true,
                formatted: phoneValidation.whatsappId,
                type: 'individual'
            };
        }

        return { valid: false, error: 'Invalid chat ID format' };
    }

    /**
     * Validate message content
     * @param {string} message - Message content to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateMessage(message, options = {}) {
        const {
            maxLength = 65536, // WhatsApp message limit
            minLength = 1,
            allowEmpty = false
        } = options;

        if (!allowEmpty && (!message || message.trim().length === 0)) {
            return { valid: false, error: 'Message cannot be empty' };
        }

        if (typeof message !== 'string') {
            return { valid: false, error: 'Message must be a string' };
        }

        if (message.length < minLength) {
            return { valid: false, error: `Message must be at least ${minLength} characters` };
        }

        if (message.length > maxLength) {
            return { valid: false, error: `Message cannot exceed ${maxLength} characters` };
        }

        return { valid: true, sanitized: message.trim() };
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {Object} Validation result
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, error: 'Email is required and must be a string' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, error: 'Invalid email format' };
        }

        return { valid: true, formatted: email.toLowerCase().trim() };
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {Object} Validation result
     */
    static validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, error: 'URL is required and must be a string' };
        }

        try {
            const urlObj = new URL(url);
            return { 
                valid: true, 
                formatted: urlObj.href,
                protocol: urlObj.protocol,
                hostname: urlObj.hostname
            };
        } catch (error) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    /**
     * Validate coordinates (latitude, longitude)
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Object} Validation result
     */
    static validateCoordinates(latitude, longitude) {
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return { valid: false, error: 'Coordinates must be numbers' };
        }

        if (latitude < -90 || latitude > 90) {
            return { valid: false, error: 'Latitude must be between -90 and 90' };
        }

        if (longitude < -180 || longitude > 180) {
            return { valid: false, error: 'Longitude must be between -180 and 180' };
        }

        return { 
            valid: true, 
            latitude: parseFloat(latitude.toFixed(6)),
            longitude: parseFloat(longitude.toFixed(6))
        };
    }

    /**
     * Validate file path
     * @param {string} filePath - File path to validate
     * @returns {Object} Validation result
     */
    static validateFilePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return { valid: false, error: 'File path is required and must be a string' };
        }

        // Check for dangerous patterns
        const dangerousPatterns = [
            /\.\./,  // Directory traversal
            /[<>:"|?*]/,  // Invalid filename characters
            /^\/dev\//,  // System devices
            /^\/proc\//,  // Process filesystem
            /^\/sys\//   // System filesystem
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(filePath)) {
                return { valid: false, error: 'File path contains invalid or dangerous characters' };
            }
        }

        return { valid: true, sanitized: filePath.trim() };
    }

    /**
     * Validate session name
     * @param {string} sessionName - Session name to validate
     * @returns {Object} Validation result
     */
    static validateSessionName(sessionName) {
        if (!sessionName || typeof sessionName !== 'string') {
            return { valid: false, error: 'Session name is required and must be a string' };
        }

        // Allow only alphanumeric characters, hyphens, and underscores
        const sessionRegex = /^[a-zA-Z0-9_-]+$/;
        if (!sessionRegex.test(sessionName)) {
            return { valid: false, error: 'Session name can only contain letters, numbers, hyphens, and underscores' };
        }

        if (sessionName.length < 1 || sessionName.length > 50) {
            return { valid: false, error: 'Session name must be between 1 and 50 characters' };
        }

        return { valid: true, sanitized: sessionName.trim() };
    }

    /**
     * Sanitize HTML content
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     */
    static sanitizeHtml(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }

        return html
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Validate and sanitize user input
     * @param {*} input - Input to validate
     * @param {string} type - Expected type
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateInput(input, type, options = {}) {
        switch (type) {
            case 'string':
                return this.validateString(input, options);
            case 'number':
                return this.validateNumber(input, options);
            case 'boolean':
                return this.validateBoolean(input);
            case 'array':
                return this.validateArray(input, options);
            case 'object':
                return this.validateObject(input, options);
            default:
                return { valid: false, error: `Unknown validation type: ${type}` };
        }
    }

    /**
     * Validate string input
     * @param {*} input - Input to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateString(input, options = {}) {
        if (typeof input !== 'string') {
            return { valid: false, error: 'Input must be a string' };
        }

        const { minLength = 0, maxLength = Infinity, pattern = null } = options;

        if (input.length < minLength) {
            return { valid: false, error: `String must be at least ${minLength} characters` };
        }

        if (input.length > maxLength) {
            return { valid: false, error: `String cannot exceed ${maxLength} characters` };
        }

        if (pattern && !pattern.test(input)) {
            return { valid: false, error: 'String does not match required pattern' };
        }

        return { valid: true, value: input };
    }

    /**
     * Validate number input
     * @param {*} input - Input to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateNumber(input, options = {}) {
        const num = Number(input);
        
        if (isNaN(num)) {
            return { valid: false, error: 'Input must be a valid number' };
        }

        const { min = -Infinity, max = Infinity, integer = false } = options;

        if (num < min) {
            return { valid: false, error: `Number must be at least ${min}` };
        }

        if (num > max) {
            return { valid: false, error: `Number cannot exceed ${max}` };
        }

        if (integer && !Number.isInteger(num)) {
            return { valid: false, error: 'Number must be an integer' };
        }

        return { valid: true, value: num };
    }

    /**
     * Validate boolean input
     * @param {*} input - Input to validate
     * @returns {Object} Validation result
     */
    static validateBoolean(input) {
        if (typeof input === 'boolean') {
            return { valid: true, value: input };
        }

        if (typeof input === 'string') {
            const lower = input.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') {
                return { valid: true, value: true };
            }
            if (lower === 'false' || lower === '0' || lower === 'no') {
                return { valid: true, value: false };
            }
        }

        if (typeof input === 'number') {
            return { valid: true, value: Boolean(input) };
        }

        return { valid: false, error: 'Input must be a boolean value' };
    }

    /**
     * Validate array input
     * @param {*} input - Input to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateArray(input, options = {}) {
        if (!Array.isArray(input)) {
            return { valid: false, error: 'Input must be an array' };
        }

        const { minLength = 0, maxLength = Infinity, itemType = null } = options;

        if (input.length < minLength) {
            return { valid: false, error: `Array must have at least ${minLength} items` };
        }

        if (input.length > maxLength) {
            return { valid: false, error: `Array cannot have more than ${maxLength} items` };
        }

        if (itemType) {
            for (let i = 0; i < input.length; i++) {
                const itemValidation = this.validateInput(input[i], itemType);
                if (!itemValidation.valid) {
                    return { valid: false, error: `Item at index ${i}: ${itemValidation.error}` };
                }
            }
        }

        return { valid: true, value: input };
    }

    /**
     * Validate object input
     * @param {*} input - Input to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateObject(input, options = {}) {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            return { valid: false, error: 'Input must be an object' };
        }

        const { requiredKeys = [], allowedKeys = null } = options;

        // Check required keys
        for (const key of requiredKeys) {
            if (!(key in input)) {
                return { valid: false, error: `Missing required key: ${key}` };
            }
        }

        // Check allowed keys
        if (allowedKeys) {
            for (const key of Object.keys(input)) {
                if (!allowedKeys.includes(key)) {
                    return { valid: false, error: `Unknown key: ${key}` };
                }
            }
        }

        return { valid: true, value: input };
    }
}

module.exports = { ValidationUtils };