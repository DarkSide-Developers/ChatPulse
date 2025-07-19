/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Test Suite for ValidationUtils
 */

const { ValidationUtils } = require('../../lib/utils/ValidationUtils');

describe('ValidationUtils', () => {
    describe('validatePhoneNumber', () => {
        test('should validate correct phone numbers', () => {
            const result = ValidationUtils.validatePhoneNumber('1234567890');
            expect(result.valid).toBe(true);
            expect(result.formatted).toBe('1234567890');
            expect(result.whatsappId).toBe('1234567890@c.us');
        });

        test('should reject invalid phone numbers', () => {
            const result = ValidationUtils.validatePhoneNumber('123');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('must be between 7 and 15 digits');
        });

        test('should reject non-string input', () => {
            const result = ValidationUtils.validatePhoneNumber(123);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('must be a string');
        });
    });

    describe('validateChatId', () => {
        test('should validate individual chat IDs', () => {
            const result = ValidationUtils.validateChatId('1234567890@c.us');
            expect(result.valid).toBe(true);
            expect(result.type).toBe('individual');
        });

        test('should validate group chat IDs', () => {
            const result = ValidationUtils.validateChatId('123456789-987654321@g.us');
            expect(result.valid).toBe(true);
        });

        test('should reject invalid chat IDs', () => {
            const result = ValidationUtils.validateChatId('invalid');
            expect(result.valid).toBe(false);
        });
    });

    describe('validateMessage', () => {
        test('should validate normal messages', () => {
            const result = ValidationUtils.validateMessage('Hello World');
            expect(result.valid).toBe(true);
            expect(result.sanitized).toBe('Hello World');
        });

        test('should reject empty messages', () => {
            const result = ValidationUtils.validateMessage('');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('cannot be empty');
        });

        test('should reject messages that are too long', () => {
            const longMessage = 'a'.repeat(70000);
            const result = ValidationUtils.validateMessage(longMessage);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('cannot exceed');
        });
    });

    describe('validateEmail', () => {
        test('should validate correct email addresses', () => {
            const result = ValidationUtils.validateEmail('test@example.com');
            expect(result.valid).toBe(true);
            expect(result.formatted).toBe('test@example.com');
        });

        test('should reject invalid email addresses', () => {
            const result = ValidationUtils.validateEmail('invalid-email');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid email format');
        });
    });

    describe('validateCoordinates', () => {
        test('should validate correct coordinates', () => {
            const result = ValidationUtils.validateCoordinates(40.7128, -74.0060);
            expect(result.valid).toBe(true);
            expect(result.latitude).toBe(40.7128);
            expect(result.longitude).toBe(-74.006);
        });

        test('should reject invalid latitude', () => {
            const result = ValidationUtils.validateCoordinates(91, 0);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Latitude must be between -90 and 90');
        });

        test('should reject invalid longitude', () => {
            const result = ValidationUtils.validateCoordinates(0, 181);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Longitude must be between -180 and 180');
        });
    });
});