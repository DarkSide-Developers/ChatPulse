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
 * Phone Number Validator with international format support
 * Provides comprehensive phone number validation and formatting
 */
class PhoneNumberValidator {
    /**
     * Country codes and their phone number patterns
     */
    static countryCodes = {
        // North America
        'US': { code: '1', pattern: /^1[2-9]\d{9}$/, length: 11 },
        'CA': { code: '1', pattern: /^1[2-9]\d{9}$/, length: 11 },
        
        // Europe
        'GB': { code: '44', pattern: /^44[1-9]\d{8,9}$/, length: [12, 13] },
        'DE': { code: '49', pattern: /^49[1-9]\d{9,11}$/, length: [12, 13, 14] },
        'FR': { code: '33', pattern: /^33[1-9]\d{8}$/, length: 11 },
        'IT': { code: '39', pattern: /^39[0-9]\d{8,9}$/, length: [11, 12] },
        'ES': { code: '34', pattern: /^34[6-9]\d{8}$/, length: 11 },
        'NL': { code: '31', pattern: /^31[6]\d{8}$/, length: 11 },
        
        // Asia
        'IN': { code: '91', pattern: /^91[6-9]\d{9}$/, length: 12 },
        'CN': { code: '86', pattern: /^86[1]\d{10}$/, length: 13 },
        'JP': { code: '81', pattern: /^81[7-9]\d{8,9}$/, length: [11, 12] },
        'KR': { code: '82', pattern: /^82[1]\d{8,9}$/, length: [11, 12] },
        'SG': { code: '65', pattern: /^65[8-9]\d{7}$/, length: 10 },
        'MY': { code: '60', pattern: /^60[1]\d{8,9}$/, length: [11, 12] },
        'TH': { code: '66', pattern: /^66[6-9]\d{8}$/, length: 11 },
        'ID': { code: '62', pattern: /^62[8]\d{8,11}$/, length: [11, 12, 13, 14] },
        'PH': { code: '63', pattern: /^63[9]\d{9}$/, length: 12 },
        'VN': { code: '84', pattern: /^84[3-9]\d{8}$/, length: 11 },
        
        // Middle East
        'AE': { code: '971', pattern: /^971[5]\d{8}$/, length: 12 },
        'SA': { code: '966', pattern: /^966[5]\d{8}$/, length: 12 },
        'IL': { code: '972', pattern: /^972[5]\d{8}$/, length: 12 },
        
        // Africa
        'ZA': { code: '27', pattern: /^27[6-8]\d{8}$/, length: 11 },
        'EG': { code: '20', pattern: /^20[1]\d{8,9}$/, length: [11, 12] },
        'NG': { code: '234', pattern: /^234[7-9]\d{9}$/, length: 13 },
        
        // South America
        'BR': { code: '55', pattern: /^55[1-9]\d{10}$/, length: 13 },
        'AR': { code: '54', pattern: /^54[9]\d{9,10}$/, length: [12, 13] },
        'CL': { code: '56', pattern: /^56[9]\d{8}$/, length: 11 },
        'CO': { code: '57', pattern: /^57[3]\d{9}$/, length: 12 },
        
        // Oceania
        'AU': { code: '61', pattern: /^61[4]\d{8}$/, length: 11 },
        'NZ': { code: '64', pattern: /^64[2]\d{7,8}$/, length: [10, 11] }
    };

    /**
     * Validate and format phone number
     * @param {string} phoneNumber - Phone number to validate
     * @param {string} defaultCountry - Default country code (optional)
     * @returns {Object} Validation result
     */
    static validate(phoneNumber, defaultCountry = null) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return {
                valid: false,
                error: 'Phone number is required and must be a string'
            };
        }

        // Clean the phone number
        const cleaned = this.cleanPhoneNumber(phoneNumber);
        
        if (!cleaned) {
            return {
                valid: false,
                error: 'Phone number contains no valid digits'
            };
        }

        // Try to detect country and validate
        const detection = this.detectCountry(cleaned, defaultCountry);
        
        if (!detection.country) {
            // Fallback to basic validation
            return this.basicValidation(cleaned);
        }

        // Validate against country-specific pattern
        const countryInfo = this.countryCodes[detection.country];
        const isValidLength = Array.isArray(countryInfo.length) 
            ? countryInfo.length.includes(cleaned.length)
            : cleaned.length === countryInfo.length;

        if (!isValidLength || !countryInfo.pattern.test(cleaned)) {
            return {
                valid: false,
                error: `Invalid phone number format for ${detection.country}`
            };
        }

        return {
            valid: true,
            formatted: cleaned,
            country: detection.country,
            countryCode: countryInfo.code,
            nationalNumber: cleaned.substring(countryInfo.code.length),
            whatsappId: `${cleaned}@c.us`,
            international: `+${cleaned}`,
            display: this.formatForDisplay(cleaned, detection.country)
        };
    }

    /**
     * Clean phone number by removing non-digit characters
     * @param {string} phoneNumber - Raw phone number
     * @returns {string} Cleaned phone number
     */
    static cleanPhoneNumber(phoneNumber) {
        // Remove all non-digit characters except +
        let cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        // Remove leading + if present
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1);
        }
        
        // Remove leading zeros (except for specific cases)
        cleaned = cleaned.replace(/^0+/, '');
        
        return cleaned;
    }

    /**
     * Detect country from phone number
     * @param {string} phoneNumber - Cleaned phone number
     * @param {string} defaultCountry - Default country code
     * @returns {Object} Detection result
     */
    static detectCountry(phoneNumber, defaultCountry = null) {
        // Try exact matches first (longest country codes first)
        const sortedCountries = Object.entries(this.countryCodes)
            .sort(([,a], [,b]) => b.code.length - a.code.length);

        for (const [country, info] of sortedCountries) {
            if (phoneNumber.startsWith(info.code)) {
                return { country, countryCode: info.code };
            }
        }

        // If no match and default country provided, try with default country code
        if (defaultCountry && this.countryCodes[defaultCountry]) {
            const defaultInfo = this.countryCodes[defaultCountry];
            const withCountryCode = defaultInfo.code + phoneNumber;
            
            if (defaultInfo.pattern.test(withCountryCode)) {
                return { 
                    country: defaultCountry, 
                    countryCode: defaultInfo.code,
                    modified: withCountryCode
                };
            }
        }

        return { country: null, countryCode: null };
    }

    /**
     * Basic validation for unknown country codes
     * @param {string} phoneNumber - Cleaned phone number
     * @returns {Object} Validation result
     */
    static basicValidation(phoneNumber) {
        // Basic international format validation
        if (phoneNumber.length < 7 || phoneNumber.length > 15) {
            return {
                valid: false,
                error: 'Phone number must be between 7 and 15 digits'
            };
        }

        // Must not start with 0 or 1 (international format)
        if (phoneNumber.startsWith('0') || phoneNumber.startsWith('1')) {
            return {
                valid: false,
                error: 'Invalid international phone number format'
            };
        }

        return {
            valid: true,
            formatted: phoneNumber,
            country: 'UNKNOWN',
            countryCode: null,
            whatsappId: `${phoneNumber}@c.us`,
            international: `+${phoneNumber}`,
            display: `+${phoneNumber}`
        };
    }

    /**
     * Format phone number for display
     * @param {string} phoneNumber - Cleaned phone number
     * @param {string} country - Country code
     * @returns {string} Formatted phone number
     */
    static formatForDisplay(phoneNumber, country) {
        const countryInfo = this.countryCodes[country];
        if (!countryInfo) {
            return `+${phoneNumber}`;
        }

        const nationalNumber = phoneNumber.substring(countryInfo.code.length);
        
        // Apply country-specific formatting
        switch (country) {
            case 'US':
            case 'CA':
                // Format: +1 (XXX) XXX-XXXX
                if (nationalNumber.length === 10) {
                    return `+${countryInfo.code} (${nationalNumber.substring(0, 3)}) ${nationalNumber.substring(3, 6)}-${nationalNumber.substring(6)}`;
                }
                break;
                
            case 'GB':
                // Format: +44 XXXX XXX XXX
                if (nationalNumber.length >= 9) {
                    return `+${countryInfo.code} ${nationalNumber.substring(0, 4)} ${nationalNumber.substring(4, 7)} ${nationalNumber.substring(7)}`;
                }
                break;
                
            case 'DE':
                // Format: +49 XXX XXXXXXX
                if (nationalNumber.length >= 10) {
                    return `+${countryInfo.code} ${nationalNumber.substring(0, 3)} ${nationalNumber.substring(3)}`;
                }
                break;
                
            default:
                // Default international format
                return `+${countryInfo.code} ${nationalNumber}`;
        }

        return `+${phoneNumber}`;
    }

    /**
     * Get country information
     * @param {string} countryCode - ISO country code
     * @returns {Object|null} Country information
     */
    static getCountryInfo(countryCode) {
        return this.countryCodes[countryCode] || null;
    }

    /**
     * Get all supported countries
     * @returns {Array} Array of supported country codes
     */
    static getSupportedCountries() {
        return Object.keys(this.countryCodes);
    }

    /**
     * Validate multiple phone numbers
     * @param {Array} phoneNumbers - Array of phone numbers
     * @param {string} defaultCountry - Default country code
     * @returns {Array} Array of validation results
     */
    static validateMultiple(phoneNumbers, defaultCountry = null) {
        if (!Array.isArray(phoneNumbers)) {
            return [{ valid: false, error: 'Input must be an array' }];
        }

        return phoneNumbers.map(phone => this.validate(phone, defaultCountry));
    }

    /**
     * Check if phone number is likely a mobile number
     * @param {string} phoneNumber - Phone number to check
     * @returns {boolean} True if likely mobile
     */
    static isMobile(phoneNumber) {
        const validation = this.validate(phoneNumber);
        if (!validation.valid || !validation.country) {
            return false;
        }

        const mobilePatterns = {
            'US': /^1[2-9]\d{9}$/,
            'GB': /^44[7]\d{9}$/,
            'DE': /^49[1][5-7]\d{8,9}$/,
            'IN': /^91[6-9]\d{9}$/,
            'CN': /^86[1][3-9]\d{9}$/,
            // Add more mobile-specific patterns as needed
        };

        const pattern = mobilePatterns[validation.country];
        return pattern ? pattern.test(validation.formatted) : true; // Default to true for unknown patterns
    }

    /**
     * Generate random valid phone number for testing
     * @param {string} country - Country code
     * @returns {string} Random valid phone number
     */
    static generateRandom(country = 'US') {
        const countryInfo = this.countryCodes[country];
        if (!countryInfo) {
            throw new Error(`Unsupported country: ${country}`);
        }

        // This is a simplified generator - in practice, you'd want more sophisticated logic
        const countryCode = countryInfo.code;
        const length = Array.isArray(countryInfo.length) ? countryInfo.length[0] : countryInfo.length;
        const remainingDigits = length - countryCode.length;
        
        let number = countryCode;
        for (let i = 0; i < remainingDigits; i++) {
            number += Math.floor(Math.random() * 10);
        }

        return number;
    }
}

module.exports = { PhoneNumberValidator };