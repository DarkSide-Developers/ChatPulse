/**
 * ChatPulse - Pairing Handler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const crypto = require('crypto');
const { Logger } = require('../utils/Logger');
const { AuthenticationError } = require('../errors/ChatPulseError');

/**
 * Phone number pairing handler for WhatsApp Web
 */
class PairingHandler {
    constructor(client) {
        this.client = client;
        this.logger = new Logger('PairingHandler');
        this.activePairings = new Map();
        this.pairingHistory = [];
        this.maxHistorySize = 10;
    }

    /**
     * Request pairing code for phone number
     */
    async requestPairingCode(phoneNumber, options = {}) {
        try {
            this.logger.info('📞 Requesting pairing code for phone number...');
            
            // Validate phone number
            const validatedPhone = this._validatePhoneNumber(phoneNumber);
            
            // Generate pairing code
            const pairingCode = this._generatePairingCode();
            const pairingId = this._generatePairingId();
            
            // Store pairing session
            const pairingSession = {
                id: pairingId,
                phoneNumber: validatedPhone,
                pairingCode: pairingCode,
                timestamp: Date.now(),
                expires: Date.now() + 300000, // 5 minutes
                attempts: 0,
                maxAttempts: 3,
                status: 'pending'
            };
            
            this.activePairings.set(pairingId, pairingSession);
            this._addToHistory(pairingSession);
            
            // Display pairing code
            this._displayPairingCode(pairingCode, validatedPhone);
            
            // Set expiration timer
            this._setPairingExpiration(pairingId);
            
            this.logger.info(`Pairing code generated: ${pairingCode}`);
            
            return {
                success: true,
                pairingId: pairingId,
                pairingCode: pairingCode,
                phoneNumber: validatedPhone,
                expiresIn: 300000, // 5 minutes
                expires: pairingSession.expires
            };
            
        } catch (error) {
            this.logger.error('❌ Failed to request pairing code:', error);
            throw new AuthenticationError(`Pairing code request failed: ${error.message}`, 'PAIRING_REQUEST_FAILED', { error });
        }
    }

    /**
     * Validate phone number format
     */
    _validatePhoneNumber(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            throw new Error('Phone number is required and must be a string');
        }
        
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Validate length
        if (cleaned.length < 7 || cleaned.length > 15) {
            throw new Error('Phone number must be between 7 and 15 digits');
        }
        
        // Validate format (basic international format)
        if (!/^[1-9]\d{6,14}$/.test(cleaned)) {
            throw new Error('Invalid phone number format');
        }
        
        return cleaned;
    }

    /**
     * Generate 8-character pairing code
     */
    _generatePairingCode() {
        // Generate 8-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Format as XXXX-XXXX for better readability
        return `${code.substring(0, 4)}-${code.substring(4, 8)}`;
    }

    /**
     * Generate unique pairing ID
     */
    _generatePairingId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Display pairing code in console
     */
    _displayPairingCode(pairingCode, phoneNumber) {
        console.log('\n' + '='.repeat(60));
        console.log('📞 WHATSAPP PAIRING CODE');
        console.log('='.repeat(60));
        console.log('');
        console.log(`📱 Phone Number: +${phoneNumber}`);
        console.log(`🔑 Pairing Code: ${pairingCode}`);
        console.log('');
        console.log('📋 Instructions:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Go to Settings > Linked Devices');
        console.log('3. Tap "Link a Device"');
        console.log('4. Tap "Link with phone number instead"');
        console.log('5. Enter the pairing code above');
        console.log('');
        console.log('⏰ Code expires in 5 minutes');
        console.log('='.repeat(60));
        console.log('');
    }

    /**
     * Verify pairing code
     */
    async verifyPairingCode(pairingId, enteredCode) {
        try {
            const pairingSession = this.activePairings.get(pairingId);
            
            if (!pairingSession) {
                throw new Error('Pairing session not found');
            }
            
            if (Date.now() > pairingSession.expires) {
                this.activePairings.delete(pairingId);
                throw new Error('Pairing code has expired');
            }
            
            if (pairingSession.attempts >= pairingSession.maxAttempts) {
                this.activePairings.delete(pairingId);
                throw new Error('Maximum pairing attempts exceeded');
            }
            
            pairingSession.attempts++;
            
            // Verify code
            if (enteredCode !== pairingSession.pairingCode) {
                throw new Error('Invalid pairing code');
            }
            
            // Mark as verified
            pairingSession.status = 'verified';
            pairingSession.verifiedAt = Date.now();
            
            this.logger.info('✅ Pairing code verified successfully');
            
            return {
                success: true,
                pairingId: pairingId,
                phoneNumber: pairingSession.phoneNumber,
                verifiedAt: pairingSession.verifiedAt
            };
            
        } catch (error) {
            this.logger.error('❌ Pairing verification failed:', error);
            throw new AuthenticationError(`Pairing verification failed: ${error.message}`, 'PAIRING_VERIFICATION_FAILED', { error });
        }
    }

    /**
     * Complete pairing process
     */
    async completePairing(pairingId) {
        try {
            const pairingSession = this.activePairings.get(pairingId);
            
            if (!pairingSession) {
                throw new Error('Pairing session not found');
            }
            
            if (pairingSession.status !== 'verified') {
                throw new Error('Pairing code not verified');
            }
            
            // Mark as completed
            pairingSession.status = 'completed';
            pairingSession.completedAt = Date.now();
            
            // Clean up active pairing
            this.activePairings.delete(pairingId);
            
            this.logger.info('✅ Pairing completed successfully');
            
            return {
                success: true,
                phoneNumber: pairingSession.phoneNumber,
                completedAt: pairingSession.completedAt
            };
            
        } catch (error) {
            this.logger.error('❌ Pairing completion failed:', error);
            throw new AuthenticationError(`Pairing completion failed: ${error.message}`, 'PAIRING_COMPLETION_FAILED', { error });
        }
    }

    /**
     * Cancel pairing session
     */
    cancelPairing(pairingId) {
        try {
            const pairingSession = this.activePairings.get(pairingId);
            
            if (pairingSession) {
                pairingSession.status = 'cancelled';
                pairingSession.cancelledAt = Date.now();
                this.activePairings.delete(pairingId);
                
                this.logger.info('Pairing session cancelled');
                return true;
            }
            
            return false;
            
        } catch (error) {
            this.logger.error('Error cancelling pairing:', error);
            return false;
        }
    }

    /**
     * Get active pairing sessions
     */
    getActivePairings() {
        const active = [];
        
        for (const [id, session] of this.activePairings.entries()) {
            active.push({
                id: id,
                phoneNumber: session.phoneNumber,
                status: session.status,
                timestamp: session.timestamp,
                expires: session.expires,
                attempts: session.attempts,
                timeRemaining: Math.max(0, session.expires - Date.now())
            });
        }
        
        return active;
    }

    /**
     * Get pairing history
     */
    getPairingHistory() {
        return this.pairingHistory.map(session => ({
            phoneNumber: session.phoneNumber,
            status: session.status,
            timestamp: session.timestamp,
            completedAt: session.completedAt,
            cancelledAt: session.cancelledAt
        }));
    }

    /**
     * Set pairing expiration timer
     */
    _setPairingExpiration(pairingId) {
        setTimeout(() => {
            const pairingSession = this.activePairings.get(pairingId);
            if (pairingSession && pairingSession.status === 'pending') {
                pairingSession.status = 'expired';
                this.activePairings.delete(pairingId);
                this.logger.info(`Pairing session ${pairingId} expired`);
            }
        }, 300000); // 5 minutes
    }

    /**
     * Add pairing to history
     */
    _addToHistory(pairingSession) {
        this.pairingHistory.push({
            phoneNumber: pairingSession.phoneNumber,
            status: pairingSession.status,
            timestamp: pairingSession.timestamp,
            completedAt: pairingSession.completedAt,
            cancelledAt: pairingSession.cancelledAt
        });
        
        // Maintain history size limit
        if (this.pairingHistory.length > this.maxHistorySize) {
            this.pairingHistory.shift();
        }
    }

    /**
     * Cleanup expired pairings
     */
    cleanup() {
        const now = Date.now();
        const expired = [];
        
        for (const [id, session] of this.activePairings.entries()) {
            if (now > session.expires) {
                expired.push(id);
            }
        }
        
        for (const id of expired) {
            const session = this.activePairings.get(id);
            if (session) {
                session.status = 'expired';
                this.activePairings.delete(id);
            }
        }
        
        if (expired.length > 0) {
            this.logger.info(`Cleaned up ${expired.length} expired pairing sessions`);
        }
    }
}

module.exports = { PairingHandler };