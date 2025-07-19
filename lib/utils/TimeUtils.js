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
 * Time utilities for date/time operations and formatting
 * Provides comprehensive time handling and timezone support
 */
class TimeUtils {
    /**
     * Time constants
     */
    static constants = {
        SECOND: 1000,
        MINUTE: 60 * 1000,
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000,
        WEEK: 7 * 24 * 60 * 60 * 1000,
        MONTH: 30 * 24 * 60 * 60 * 1000,
        YEAR: 365 * 24 * 60 * 60 * 1000
    };

    /**
     * Common date formats
     */
    static formats = {
        ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
        DATE: 'YYYY-MM-DD',
        TIME: 'HH:mm:ss',
        DATETIME: 'YYYY-MM-DD HH:mm:ss',
        HUMAN: 'MMM DD, YYYY',
        FULL: 'dddd, MMMM DD, YYYY',
        SHORT: 'MM/DD/YY',
        TIMESTAMP: 'x'
    };

    /**
     * Get current timestamp
     * @returns {number} Current timestamp in milliseconds
     */
    static now() {
        return Date.now();
    }

    /**
     * Get current timestamp in seconds
     * @returns {number} Current timestamp in seconds
     */
    static nowSeconds() {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Create date from various inputs
     * @param {*} input - Date input (string, number, Date, etc.)
     * @returns {Date} Date object
     */
    static createDate(input = null) {
        if (input === null) {
            return new Date();
        }
        
        if (input instanceof Date) {
            return new Date(input);
        }
        
        if (typeof input === 'number') {
            // Assume seconds if less than year 2000 timestamp
            if (input < 946684800000) {
                return new Date(input * 1000);
            }
            return new Date(input);
        }
        
        if (typeof input === 'string') {
            return new Date(input);
        }
        
        throw new Error('Invalid date input');
    }

    /**
     * Format date to string
     * @param {Date|string|number} date - Date to format
     * @param {string} format - Format string
     * @param {string} locale - Locale for formatting
     * @returns {string} Formatted date string
     */
    static format(date, format = 'YYYY-MM-DD HH:mm:ss', locale = 'en-US') {
        const dateObj = this.createDate(date);
        
        // Simple format replacements (basic implementation)
        const formatMap = {
            'YYYY': dateObj.getFullYear().toString(),
            'YY': dateObj.getFullYear().toString().slice(-2),
            'MM': (dateObj.getMonth() + 1).toString().padStart(2, '0'),
            'M': (dateObj.getMonth() + 1).toString(),
            'DD': dateObj.getDate().toString().padStart(2, '0'),
            'D': dateObj.getDate().toString(),
            'HH': dateObj.getHours().toString().padStart(2, '0'),
            'H': dateObj.getHours().toString(),
            'mm': dateObj.getMinutes().toString().padStart(2, '0'),
            'm': dateObj.getMinutes().toString(),
            'ss': dateObj.getSeconds().toString().padStart(2, '0'),
            's': dateObj.getSeconds().toString(),
            'sss': dateObj.getMilliseconds().toString().padStart(3, '0'),
            'x': dateObj.getTime().toString(),
            'X': Math.floor(dateObj.getTime() / 1000).toString()
        };
        
        let result = format;
        for (const [token, value] of Object.entries(formatMap)) {
            result = result.replace(new RegExp(token, 'g'), value);
        }
        
        return result;
    }

    /**
     * Parse date string
     * @param {string} dateString - Date string to parse
     * @param {string} format - Expected format (optional)
     * @returns {Date} Parsed date
     */
    static parse(dateString, format = null) {
        if (!format) {
            return new Date(dateString);
        }
        
        // Basic parsing implementation
        // In a real implementation, you'd want a more robust parser
        return new Date(dateString);
    }

    /**
     * Add time to date
     * @param {Date|string|number} date - Base date
     * @param {number} amount - Amount to add
     * @param {string} unit - Time unit (seconds, minutes, hours, days, weeks, months, years)
     * @returns {Date} New date
     */
    static add(date, amount, unit) {
        const dateObj = this.createDate(date);
        const result = new Date(dateObj);
        
        switch (unit.toLowerCase()) {
            case 'second':
            case 'seconds':
                result.setSeconds(result.getSeconds() + amount);
                break;
            case 'minute':
            case 'minutes':
                result.setMinutes(result.getMinutes() + amount);
                break;
            case 'hour':
            case 'hours':
                result.setHours(result.getHours() + amount);
                break;
            case 'day':
            case 'days':
                result.setDate(result.getDate() + amount);
                break;
            case 'week':
            case 'weeks':
                result.setDate(result.getDate() + (amount * 7));
                break;
            case 'month':
            case 'months':
                result.setMonth(result.getMonth() + amount);
                break;
            case 'year':
            case 'years':
                result.setFullYear(result.getFullYear() + amount);
                break;
            default:
                throw new Error(`Invalid time unit: ${unit}`);
        }
        
        return result;
    }

    /**
     * Subtract time from date
     * @param {Date|string|number} date - Base date
     * @param {number} amount - Amount to subtract
     * @param {string} unit - Time unit
     * @returns {Date} New date
     */
    static subtract(date, amount, unit) {
        return this.add(date, -amount, unit);
    }

    /**
     * Get difference between two dates
     * @param {Date|string|number} date1 - First date
     * @param {Date|string|number} date2 - Second date
     * @param {string} unit - Unit for result
     * @returns {number} Difference
     */
    static diff(date1, date2, unit = 'milliseconds') {
        const d1 = this.createDate(date1);
        const d2 = this.createDate(date2);
        const diffMs = d1.getTime() - d2.getTime();
        
        switch (unit.toLowerCase()) {
            case 'millisecond':
            case 'milliseconds':
                return diffMs;
            case 'second':
            case 'seconds':
                return Math.floor(diffMs / this.constants.SECOND);
            case 'minute':
            case 'minutes':
                return Math.floor(diffMs / this.constants.MINUTE);
            case 'hour':
            case 'hours':
                return Math.floor(diffMs / this.constants.HOUR);
            case 'day':
            case 'days':
                return Math.floor(diffMs / this.constants.DAY);
            case 'week':
            case 'weeks':
                return Math.floor(diffMs / this.constants.WEEK);
            case 'month':
            case 'months':
                return Math.floor(diffMs / this.constants.MONTH);
            case 'year':
            case 'years':
                return Math.floor(diffMs / this.constants.YEAR);
            default:
                throw new Error(`Invalid time unit: ${unit}`);
        }
    }

    /**
     * Check if date is before another date
     * @param {Date|string|number} date1 - First date
     * @param {Date|string|number} date2 - Second date
     * @returns {boolean} True if date1 is before date2
     */
    static isBefore(date1, date2) {
        return this.createDate(date1).getTime() < this.createDate(date2).getTime();
    }

    /**
     * Check if date is after another date
     * @param {Date|string|number} date1 - First date
     * @param {Date|string|number} date2 - Second date
     * @returns {boolean} True if date1 is after date2
     */
    static isAfter(date1, date2) {
        return this.createDate(date1).getTime() > this.createDate(date2).getTime();
    }

    /**
     * Check if date is same as another date
     * @param {Date|string|number} date1 - First date
     * @param {Date|string|number} date2 - Second date
     * @param {string} unit - Precision unit
     * @returns {boolean} True if dates are same
     */
    static isSame(date1, date2, unit = 'milliseconds') {
        const d1 = this.createDate(date1);
        const d2 = this.createDate(date2);
        
        switch (unit.toLowerCase()) {
            case 'year':
                return d1.getFullYear() === d2.getFullYear();
            case 'month':
                return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
            case 'day':
                return d1.toDateString() === d2.toDateString();
            case 'hour':
                return Math.floor(d1.getTime() / this.constants.HOUR) === Math.floor(d2.getTime() / this.constants.HOUR);
            case 'minute':
                return Math.floor(d1.getTime() / this.constants.MINUTE) === Math.floor(d2.getTime() / this.constants.MINUTE);
            case 'second':
                return Math.floor(d1.getTime() / this.constants.SECOND) === Math.floor(d2.getTime() / this.constants.SECOND);
            default:
                return d1.getTime() === d2.getTime();
        }
    }

    /**
     * Check if date is between two dates
     * @param {Date|string|number} date - Date to check
     * @param {Date|string|number} start - Start date
     * @param {Date|string|number} end - End date
     * @param {boolean} inclusive - Include boundaries
     * @returns {boolean} True if date is between start and end
     */
    static isBetween(date, start, end, inclusive = true) {
        const d = this.createDate(date);
        const s = this.createDate(start);
        const e = this.createDate(end);
        
        if (inclusive) {
            return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
        } else {
            return d.getTime() > s.getTime() && d.getTime() < e.getTime();
        }
    }

    /**
     * Get start of time unit
     * @param {Date|string|number} date - Input date
     * @param {string} unit - Time unit
     * @returns {Date} Start of unit
     */
    static startOf(date, unit) {
        const dateObj = new Date(this.createDate(date));
        
        switch (unit.toLowerCase()) {
            case 'year':
                dateObj.setMonth(0, 1);
                dateObj.setHours(0, 0, 0, 0);
                break;
            case 'month':
                dateObj.setDate(1);
                dateObj.setHours(0, 0, 0, 0);
                break;
            case 'week':
                const day = dateObj.getDay();
                dateObj.setDate(dateObj.getDate() - day);
                dateObj.setHours(0, 0, 0, 0);
                break;
            case 'day':
                dateObj.setHours(0, 0, 0, 0);
                break;
            case 'hour':
                dateObj.setMinutes(0, 0, 0);
                break;
            case 'minute':
                dateObj.setSeconds(0, 0);
                break;
            case 'second':
                dateObj.setMilliseconds(0);
                break;
        }
        
        return dateObj;
    }

    /**
     * Get end of time unit
     * @param {Date|string|number} date - Input date
     * @param {string} unit - Time unit
     * @returns {Date} End of unit
     */
    static endOf(date, unit) {
        const dateObj = new Date(this.createDate(date));
        
        switch (unit.toLowerCase()) {
            case 'year':
                dateObj.setMonth(11, 31);
                dateObj.setHours(23, 59, 59, 999);
                break;
            case 'month':
                dateObj.setMonth(dateObj.getMonth() + 1, 0);
                dateObj.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = dateObj.getDay();
                dateObj.setDate(dateObj.getDate() + (6 - day));
                dateObj.setHours(23, 59, 59, 999);
                break;
            case 'day':
                dateObj.setHours(23, 59, 59, 999);
                break;
            case 'hour':
                dateObj.setMinutes(59, 59, 999);
                break;
            case 'minute':
                dateObj.setSeconds(59, 999);
                break;
            case 'second':
                dateObj.setMilliseconds(999);
                break;
        }
        
        return dateObj;
    }

    /**
     * Format duration in human-readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @param {Object} options - Formatting options
     * @returns {string} Formatted duration
     */
    static formatDuration(milliseconds, options = {}) {
        const {
            largest = 2,
            units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'],
            round = false,
            delimiter = ', '
        } = options;
        
        const durations = {
            years: Math.floor(milliseconds / this.constants.YEAR),
            months: Math.floor((milliseconds % this.constants.YEAR) / this.constants.MONTH),
            days: Math.floor((milliseconds % this.constants.MONTH) / this.constants.DAY),
            hours: Math.floor((milliseconds % this.constants.DAY) / this.constants.HOUR),
            minutes: Math.floor((milliseconds % this.constants.HOUR) / this.constants.MINUTE),
            seconds: Math.floor((milliseconds % this.constants.MINUTE) / this.constants.SECOND)
        };
        
        const parts = [];
        let count = 0;
        
        for (const unit of units) {
            if (count >= largest) break;
            
            const value = durations[unit];
            if (value > 0) {
                const unitName = value === 1 ? unit.slice(0, -1) : unit;
                parts.push(`${value} ${unitName}`);
                count++;
            }
        }
        
        return parts.length > 0 ? parts.join(delimiter) : '0 seconds';
    }

    /**
     * Get relative time (time ago)
     * @param {Date|string|number} date - Date to compare
     * @param {Date|string|number} baseDate - Base date (default: now)
     * @returns {string} Relative time string
     */
    static timeAgo(date, baseDate = null) {
        const now = baseDate ? this.createDate(baseDate) : new Date();
        const past = this.createDate(date);
        const diffMs = now.getTime() - past.getTime();
        
        if (diffMs < 0) {
            return 'in the future';
        }
        
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffYears > 0) {
            return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
        } else if (diffMonths > 0) {
            return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
        } else if (diffWeeks > 0) {
            return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
        } else if (diffDays > 0) {
            return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        } else if (diffHours > 0) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffMinutes > 0) {
            return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
        } else {
            return 'just now';
        }
    }

    /**
     * Check if date is valid
     * @param {*} date - Date to validate
     * @returns {boolean} True if valid date
     */
    static isValid(date) {
        try {
            const dateObj = this.createDate(date);
            return !isNaN(dateObj.getTime());
        } catch (error) {
            return false;
        }
    }

    /**
     * Get timezone offset
     * @param {Date|string|number} date - Date to check
     * @returns {number} Timezone offset in minutes
     */
    static getTimezoneOffset(date = null) {
        const dateObj = date ? this.createDate(date) : new Date();
        return dateObj.getTimezoneOffset();
    }

    /**
     * Convert to UTC
     * @param {Date|string|number} date - Date to convert
     * @returns {Date} UTC date
     */
    static toUTC(date) {
        const dateObj = this.createDate(date);
        return new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
    }

    /**
     * Convert from UTC
     * @param {Date|string|number} date - UTC date
     * @returns {Date} Local date
     */
    static fromUTC(date) {
        const dateObj = this.createDate(date);
        return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
    }

    /**
     * Get age from birthdate
     * @param {Date|string|number} birthdate - Birth date
     * @param {Date|string|number} referenceDate - Reference date (default: now)
     * @returns {number} Age in years
     */
    static getAge(birthdate, referenceDate = null) {
        const birth = this.createDate(birthdate);
        const reference = referenceDate ? this.createDate(referenceDate) : new Date();
        
        let age = reference.getFullYear() - birth.getFullYear();
        const monthDiff = reference.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Sleep/delay function
     * @param {number} milliseconds - Time to sleep
     * @returns {Promise} Promise that resolves after delay
     */
    static sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    /**
     * Create timeout promise
     * @param {number} milliseconds - Timeout duration
     * @param {string} message - Timeout message
     * @returns {Promise} Promise that rejects after timeout
     */
    static timeout(milliseconds, message = 'Operation timed out') {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), milliseconds);
        });
    }

    /**
     * Race promise with timeout
     * @param {Promise} promise - Promise to race
     * @param {number} milliseconds - Timeout duration
     * @param {string} message - Timeout message
     * @returns {Promise} Promise that resolves or times out
     */
    static withTimeout(promise, milliseconds, message = 'Operation timed out') {
        return Promise.race([
            promise,
            this.timeout(milliseconds, message)
        ]);
    }
}

module.exports = { TimeUtils };