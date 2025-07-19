/**
 * ChatPulse - Input Validation System
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ValidationError } = require('../errors/ChatPulseError');
const { MessageTypes, ChatTypes } = require('../types');

/**
 * Comprehensive input validation system
 */
class InputValidator {
    constructor() {
        this.rules = new Map();
        this._setupDefaultRules();
    }

    /**
     * Validate input against rules
     */
    validate(input, ruleName, options = {}) {
        const rule = this.rules.get(ruleName);
        if (!rule) {
            throw new ValidationError(`Validation rule '${ruleName}' not found`);
        }

        try {
            return rule(input, options);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new ValidationError(`Validation failed for '${ruleName}': ${error.message}`);
        }
    }

    /**
     * Validate multiple inputs
     */
    validateMultiple(inputs, rules) {
        const results = {};
        const errors = [];

        for (const [key, value] of Object.entries(inputs)) {
            const rule = rules[key];
            if (!rule) continue;

            try {
                results[key] = this.validate(value, rule.name, rule.options);
            } catch (error) {
                errors.push({ field: key, error: error.message });
            }
        }

        if (errors.length > 0) {
            throw new ValidationError('Multiple validation errors', null, { errors });
        }

        return results;
    }

    /**
     * Register custom validation rule
     */
    registerRule(name, validator) {
        if (typeof validator !== 'function') {
            throw new Error('Validator must be a function');
        }

        this.rules.set(name, validator);
    }

    /**
     * Setup default validation rules
     */
    _setupDefaultRules() {
        // Phone number validation
        this.rules.set('phoneNumber', (input, options = {}) => {
            if (!input || typeof input !== 'string') {
                throw new ValidationError('Phone number is required and must be a string');
            }

            const cleaned = input.replace(/\D/g, '');
            
            if (cleaned.length < 7 || cleaned.length > 15) {
                throw new ValidationError('Phone number must be between 7 and 15 digits');
            }

            const phoneRegex = /^[1-9]\d{6,14}$/;
            if (!phoneRegex.test(cleaned)) {
                throw new ValidationError('Invalid phone number format');
            }

            return {
                valid: true,
                formatted: cleaned,
                whatsappId: `${cleaned}@c.us`
            };
        });

        // Chat ID validation
        this.rules.set('chatId', (input, options = {}) => {
            if (!input || typeof input !== 'string') {
                throw new ValidationError('Chat ID is required and must be a string');
            }

            // Group ID format
            if (input.includes('-') && input.endsWith('@g.us')) {
                const groupRegex = /^\d+-\d+@g\.us$/;
                if (!groupRegex.test(input)) {
                    throw new ValidationError('Invalid group ID format');
                }
                return { valid: true, formatted: input, type: ChatTypes.GROUP };
            }

            // Individual chat format
            if (input.endsWith('@c.us')) {
                const phoneNumber = input.replace('@c.us', '');
                const phoneValidation = this.validate(phoneNumber, 'phoneNumber');
                return {
                    valid: true,
                    formatted: input,
                    type: ChatTypes.INDIVIDUAL
                };
            }

            // Try as phone number
            try {
                const phoneValidation = this.validate(input, 'phoneNumber');
                return {
                    valid: true,
                    formatted: phoneValidation.whatsappId,
                    type: ChatTypes.INDIVIDUAL
                };
            } catch (error) {
                throw new ValidationError('Invalid chat ID format');
            }
        });

        // Message validation
        this.rules.set('message', (input, options = {}) => {
            const {
                maxLength = 65536,
                minLength = 1,
                allowEmpty = false,
                allowMarkdown = true
            } = options;

            if (!allowEmpty && (!input || input.trim().length === 0)) {
                throw new ValidationError('Message cannot be empty');
            }

            if (typeof input !== 'string') {
                throw new ValidationError('Message must be a string');
            }

            if (input.length < minLength) {
                throw new ValidationError(`Message must be at least ${minLength} characters`);
            }

            if (input.length > maxLength) {
                throw new ValidationError(`Message cannot exceed ${maxLength} characters`);
            }

            // Sanitize if needed
            let sanitized = input.trim();
            if (!allowMarkdown) {
                sanitized = this._sanitizeMarkdown(sanitized);
            }

            return { valid: true, sanitized };
        });

        // Email validation
        this.rules.set('email', (input, options = {}) => {
            if (!input || typeof input !== 'string') {
                throw new ValidationError('Email is required and must be a string');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input)) {
                throw new ValidationError('Invalid email format');
            }

            return { valid: true, formatted: input.toLowerCase().trim() };
        });

        // URL validation
        this.rules.set('url', (input, options = {}) => {
            if (!input || typeof input !== 'string') {
                throw new ValidationError('URL is required and must be a string');
            }

            try {
                const urlObj = new URL(input);
                return {
                    valid: true,
                    formatted: urlObj.href,
                    protocol: urlObj.protocol,
                    hostname: urlObj.hostname
                };
            } catch (error) {
                throw new ValidationError('Invalid URL format');
            }
        });

        // Coordinates validation
        this.rules.set('coordinates', (input, options = {}) => {
            if (!input || typeof input !== 'object') {
                throw new ValidationError('Coordinates must be an object with lat and lng');
            }

            const { lat, lng } = input;

            if (typeof lat !== 'number' || typeof lng !== 'number') {
                throw new ValidationError('Latitude and longitude must be numbers');
            }

            if (lat < -90 || lat > 90) {
                throw new ValidationError('Latitude must be between -90 and 90');
            }

            if (lng < -180 || lng > 180) {
                throw new ValidationError('Longitude must be between -180 and 180');
            }

            return {
                valid: true,
                latitude: parseFloat(lat.toFixed(6)),
                longitude: parseFloat(lng.toFixed(6))
            };
        });

        // File path validation
        this.rules.set('filePath', (input, options = {}) => {
            if (!input || typeof input !== 'string') {
                throw new ValidationError('File path is required and must be a string');
            }

            // Check for dangerous patterns
            const dangerousPatterns = [
                /\.\./,
                /[<>:"|?*]/,
                /^\/dev\//,
                /^\/proc\//,
                /^\/sys\//
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(input)) {
                    throw new ValidationError('File path contains invalid or dangerous characters');
                }
            }

            return { valid: true, sanitized: input.trim() };
        });

        // Session name validation
        this.rules.set('sessionName', (input, options = {}) => {
            if (!input || typeof input !== 'string') {
                throw new ValidationError('Session name is required and must be a string');
            }

            const sessionRegex = /^[a-zA-Z0-9_-]+$/;
            if (!sessionRegex.test(input)) {
                throw new ValidationError('Session name can only contain letters, numbers, hyphens, and underscores');
            }

            if (input.length < 1 || input.length > 50) {
                throw new ValidationError('Session name must be between 1 and 50 characters');
            }

            return { valid: true, sanitized: input.trim() };
        });

        // Button validation
        this.rules.set('buttons', (input, options = {}) => {
            if (!Array.isArray(input)) {
                throw new ValidationError('Buttons must be an array');
            }

            if (input.length === 0) {
                throw new ValidationError('Buttons array cannot be empty');
            }

            if (input.length > 3) {
                throw new ValidationError('Maximum 3 buttons allowed');
            }

            const validatedButtons = input.map((button, index) => {
                if (!button || typeof button !== 'object') {
                    throw new ValidationError(`Button at index ${index} must be an object`);
                }

                if (!button.text || typeof button.text !== 'string') {
                    throw new ValidationError(`Button at index ${index} must have a text property`);
                }

                if (button.text.length > 20) {
                    throw new ValidationError(`Button text at index ${index} cannot exceed 20 characters`);
                }

                return {
                    id: button.id || `btn_${index}`,
                    text: button.text.trim(),
                    type: button.type || 'reply'
                };
            });

            return { valid: true, buttons: validatedButtons };
        });

        // List sections validation
        this.rules.set('listSections', (input, options = {}) => {
            if (!Array.isArray(input)) {
                throw new ValidationError('List sections must be an array');
            }

            if (input.length === 0) {
                throw new ValidationError('List sections array cannot be empty');
            }

            if (input.length > 10) {
                throw new ValidationError('Maximum 10 sections allowed');
            }

            const validatedSections = input.map((section, sectionIndex) => {
                if (!section || typeof section !== 'object') {
                    throw new ValidationError(`Section at index ${sectionIndex} must be an object`);
                }

                if (!section.title || typeof section.title !== 'string') {
                    throw new ValidationError(`Section at index ${sectionIndex} must have a title`);
                }

                if (!Array.isArray(section.rows)) {
                    throw new ValidationError(`Section at index ${sectionIndex} must have a rows array`);
                }

                if (section.rows.length === 0) {
                    throw new ValidationError(`Section at index ${sectionIndex} cannot have empty rows`);
                }

                if (section.rows.length > 10) {
                    throw new ValidationError(`Section at index ${sectionIndex} cannot have more than 10 rows`);
                }

                const validatedRows = section.rows.map((row, rowIndex) => {
                    if (!row || typeof row !== 'object') {
                        throw new ValidationError(`Row at section ${sectionIndex}, index ${rowIndex} must be an object`);
                    }

                    if (!row.title || typeof row.title !== 'string') {
                        throw new ValidationError(`Row at section ${sectionIndex}, index ${rowIndex} must have a title`);
                    }

                    return {
                        id: row.id || `row_${sectionIndex}_${rowIndex}`,
                        title: row.title.trim(),
                        description: row.description ? row.description.trim() : ''
                    };
                });

                return {
                    title: section.title.trim(),
                    rows: validatedRows
                };
            });

            return { valid: true, sections: validatedSections };
        });

        // Contact validation
        this.rules.set('contact', (input, options = {}) => {
            if (!input || typeof input !== 'object') {
                throw new ValidationError('Contact must be an object');
            }

            if (!input.name || typeof input.name !== 'string') {
                throw new ValidationError('Contact must have a name');
            }

            if (!input.number || typeof input.number !== 'string') {
                throw new ValidationError('Contact must have a number');
            }

            // Validate phone number
            const phoneValidation = this.validate(input.number, 'phoneNumber');

            return {
                valid: true,
                contact: {
                    name: input.name.trim(),
                    number: phoneValidation.formatted,
                    organization: input.organization ? input.organization.trim() : '',
                    email: input.email ? input.email.trim() : ''
                }
            };
        });
    }

    /**
     * Sanitize markdown from text
     */
    _sanitizeMarkdown(text) {
        return text
            .replace(/\*/g, '')
            .replace(/_/g, '')
            .replace(/~/g, '')
            .replace(/`/g, '');
    }
}

module.exports = { InputValidator };