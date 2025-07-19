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
 * Advanced Message Formatter with rich text support
 * Provides WhatsApp-compatible text formatting and styling
 */
class MessageFormatter {
    /**
     * Format text with bold styling
     * @param {string} text - Text to format
     * @returns {string} Formatted text
     */
    static bold(text) {
        return `*${text}*`;
    }

    /**
     * Format text with italic styling
     * @param {string} text - Text to format
     * @returns {string} Formatted text
     */
    static italic(text) {
        return `_${text}_`;
    }

    /**
     * Format text with strikethrough styling
     * @param {string} text - Text to format
     * @returns {string} Formatted text
     */
    static strikethrough(text) {
        return `~${text}~`;
    }

    /**
     * Format text with monospace styling
     * @param {string} text - Text to format
     * @returns {string} Formatted text
     */
    static monospace(text) {
        return `\`\`\`${text}\`\`\``;
    }

    /**
     * Format inline code
     * @param {string} text - Text to format
     * @returns {string} Formatted text
     */
    static code(text) {
        return `\`${text}\``;
    }

    /**
     * Create a mention
     * @param {string} phoneNumber - Phone number to mention
     * @param {string} displayName - Display name (optional)
     * @returns {string} Mention text
     */
    static mention(phoneNumber, displayName = null) {
        const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
        const name = displayName || cleanNumber;
        return `@${name}`;
    }

    /**
     * Create a clickable link
     * @param {string} url - URL
     * @param {string} text - Link text (optional)
     * @returns {string} Link text
     */
    static link(url, text = null) {
        if (text) {
            return `[${text}](${url})`;
        }
        return url;
    }

    /**
     * Create a quote/reply format
     * @param {string} text - Text to quote
     * @param {string} author - Quote author (optional)
     * @returns {string} Quoted text
     */
    static quote(text, author = null) {
        const lines = text.split('\n').map(line => `> ${line}`);
        if (author) {
            lines.push(`> — ${author}`);
        }
        return lines.join('\n');
    }

    /**
     * Create a list
     * @param {Array} items - List items
     * @param {boolean} numbered - Use numbered list
     * @returns {string} Formatted list
     */
    static list(items, numbered = false) {
        return items.map((item, index) => {
            const prefix = numbered ? `${index + 1}.` : '•';
            return `${prefix} ${item}`;
        }).join('\n');
    }

    /**
     * Create a table
     * @param {Array} headers - Table headers
     * @param {Array} rows - Table rows
     * @returns {string} Formatted table
     */
    static table(headers, rows) {
        const headerRow = `| ${headers.join(' | ')} |`;
        const separator = `|${headers.map(() => '---').join('|')}|`;
        const dataRows = rows.map(row => `| ${row.join(' | ')} |`);
        
        return [headerRow, separator, ...dataRows].join('\n');
    }

    /**
     * Create a progress bar
     * @param {number} percentage - Progress percentage (0-100)
     * @param {number} length - Bar length
     * @param {string} fillChar - Fill character
     * @param {string} emptyChar - Empty character
     * @returns {string} Progress bar
     */
    static progressBar(percentage, length = 20, fillChar = '█', emptyChar = '░') {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return `${fillChar.repeat(filled)}${emptyChar.repeat(empty)} ${percentage}%`;
    }

    /**
     * Create a divider
     * @param {string} char - Divider character
     * @param {number} length - Divider length
     * @returns {string} Divider
     */
    static divider(char = '─', length = 30) {
        return char.repeat(length);
    }

    /**
     * Format currency
     * @param {number} amount - Amount
     * @param {string} currency - Currency code
     * @param {string} locale - Locale
     * @returns {string} Formatted currency
     */
    static currency(amount, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Format date and time
     * @param {Date|string} date - Date to format
     * @param {string} locale - Locale
     * @param {Object} options - Formatting options
     * @returns {string} Formatted date
     */
    static datetime(date, locale = 'en-US', options = {}) {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return dateObj.toLocaleDateString(locale, { ...defaultOptions, ...options });
    }

    /**
     * Format file size
     * @param {number} bytes - File size in bytes
     * @param {number} decimals - Decimal places
     * @returns {string} Formatted file size
     */
    static fileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Create an emoji reaction
     * @param {string} emoji - Emoji character
     * @param {number} count - Reaction count
     * @returns {string} Formatted reaction
     */
    static reaction(emoji, count = 1) {
        return count > 1 ? `${emoji} ${count}` : emoji;
    }

    /**
     * Create a status indicator
     * @param {string} status - Status type
     * @param {string} text - Status text
     * @returns {string} Formatted status
     */
    static status(status, text) {
        const indicators = {
            online: '🟢',
            offline: '🔴',
            away: '🟡',
            busy: '🔴',
            typing: '✍️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const indicator = indicators[status] || '⚪';
        return `${indicator} ${text}`;
    }

    /**
     * Create a card layout
     * @param {Object} card - Card data
     * @returns {string} Formatted card
     */
    static card(card) {
        let result = '';
        
        if (card.title) {
            result += this.bold(card.title) + '\n';
        }
        
        if (card.subtitle) {
            result += this.italic(card.subtitle) + '\n';
        }
        
        if (card.description) {
            result += card.description + '\n';
        }
        
        if (card.fields && card.fields.length > 0) {
            result += '\n';
            card.fields.forEach(field => {
                result += `${this.bold(field.name)}: ${field.value}\n`;
            });
        }
        
        if (card.footer) {
            result += '\n' + this.italic(card.footer);
        }
        
        return result.trim();
    }

    /**
     * Create a notification message
     * @param {string} type - Notification type
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @returns {string} Formatted notification
     */
    static notification(type, title, message) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            update: '🔄',
            new: '🆕',
            reminder: '⏰'
        };
        
        const icon = icons[type] || 'ℹ️';
        
        return `${icon} ${this.bold(title)}\n${message}`;
    }

    /**
     * Create a template message
     * @param {string} template - Template string with placeholders
     * @param {Object} variables - Variables to replace
     * @returns {string} Formatted message
     */
    static template(template, variables = {}) {
        let result = template;
        
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value);
        });
        
        return result;
    }

    /**
     * Escape WhatsApp formatting characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escape(text) {
        return text.replace(/([*_~`])/g, '\\$1');
    }

    /**
     * Remove formatting from text
     * @param {string} text - Formatted text
     * @returns {string} Plain text
     */
    static stripFormatting(text) {
        return text.replace(/[*_~`]/g, '');
    }

    /**
     * Truncate text with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @param {string} suffix - Suffix to add
     * @returns {string} Truncated text
     */
    static truncate(text, maxLength = 100, suffix = '...') {
        if (text.length <= maxLength) {
            return text;
        }
        
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Center text
     * @param {string} text - Text to center
     * @param {number} width - Total width
     * @param {string} fillChar - Fill character
     * @returns {string} Centered text
     */
    static center(text, width = 30, fillChar = ' ') {
        const padding = Math.max(0, width - text.length);
        const leftPadding = Math.floor(padding / 2);
        const rightPadding = padding - leftPadding;
        
        return fillChar.repeat(leftPadding) + text + fillChar.repeat(rightPadding);
    }

    /**
     * Create a multi-line message with consistent formatting
     * @param {Array} lines - Array of line objects
     * @returns {string} Formatted multi-line message
     */
    static multiLine(lines) {
        return lines.map(line => {
            if (typeof line === 'string') {
                return line;
            }
            
            let formatted = line.text || '';
            
            if (line.bold) formatted = this.bold(formatted);
            if (line.italic) formatted = this.italic(formatted);
            if (line.strikethrough) formatted = this.strikethrough(formatted);
            if (line.monospace) formatted = this.monospace(formatted);
            if (line.code) formatted = this.code(formatted);
            
            return formatted;
        }).join('\n');
    }
}

module.exports = { MessageFormatter };