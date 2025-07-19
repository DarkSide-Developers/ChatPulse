/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const crypto = require('crypto');

/**
 * Cryptographic utilities for secure operations
 * Provides encryption, hashing, and secure random generation
 */
class CryptoUtils {
    /**
     * Encryption algorithms and their configurations
     */
    static algorithms = {
        AES_256_GCM: {
            algorithm: 'aes-256-gcm',
            keyLength: 32,
            ivLength: 16,
            tagLength: 16
        },
        AES_256_CBC: {
            algorithm: 'aes-256-cbc',
            keyLength: 32,
            ivLength: 16
        },
        CHACHA20_POLY1305: {
            algorithm: 'chacha20-poly1305',
            keyLength: 32,
            ivLength: 12,
            tagLength: 16
        }
    };

    /**
     * Hash algorithms
     */
    static hashAlgorithms = {
        SHA256: 'sha256',
        SHA512: 'sha512',
        SHA3_256: 'sha3-256',
        SHA3_512: 'sha3-512',
        BLAKE2B512: 'blake2b512'
    };

    /**
     * Generate cryptographically secure random bytes
     * @param {number} length - Number of bytes to generate
     * @returns {Buffer} Random bytes
     */
    static generateRandomBytes(length = 32) {
        return crypto.randomBytes(length);
    }

    /**
     * Generate cryptographically secure random string
     * @param {number} length - String length
     * @param {string} charset - Character set to use
     * @returns {string} Random string
     */
    static generateRandomString(length = 32, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        const bytes = this.generateRandomBytes(length);
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += charset[bytes[i] % charset.length];
        }
        
        return result;
    }

    /**
     * Generate secure API key
     * @param {number} length - Key length
     * @returns {string} API key
     */
    static generateApiKey(length = 64) {
        return this.generateRandomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_');
    }

    /**
     * Generate UUID v4
     * @returns {string} UUID
     */
    static generateUUID() {
        return crypto.randomUUID();
    }

    /**
     * Derive key from password using PBKDF2
     * @param {string} password - Password
     * @param {Buffer} salt - Salt
     * @param {number} iterations - Number of iterations
     * @param {number} keyLength - Key length in bytes
     * @param {string} digest - Hash algorithm
     * @returns {Promise<Buffer>} Derived key
     */
    static async deriveKey(password, salt, iterations = 100000, keyLength = 32, digest = 'sha256') {
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(password, salt, iterations, keyLength, digest, (err, derivedKey) => {
                if (err) reject(err);
                else resolve(derivedKey);
            });
        });
    }

    /**
     * Encrypt data using AES-256-GCM
     * @param {string|Buffer} data - Data to encrypt
     * @param {string|Buffer} key - Encryption key
     * @param {Buffer} iv - Initialization vector (optional)
     * @returns {Object} Encrypted data with metadata
     */
    static encrypt(data, key, iv = null) {
        try {
            const config = this.algorithms.AES_256_GCM;
            
            // Ensure key is correct length
            const keyBuffer = this.normalizeKey(key, config.keyLength);
            
            // Generate IV if not provided
            const ivBuffer = iv || this.generateRandomBytes(config.ivLength);
            
            // Create cipher
            const cipher = crypto.createCipher(config.algorithm, keyBuffer);
            cipher.setAAD(Buffer.from('ChatPulse')); // Additional authenticated data
            
            // Encrypt data
            const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
            let encrypted = cipher.update(dataBuffer);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // Get authentication tag
            const tag = cipher.getAuthTag();
            
            return {
                encrypted: encrypted.toString('base64'),
                iv: ivBuffer.toString('base64'),
                tag: tag.toString('base64'),
                algorithm: config.algorithm
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt data using AES-256-GCM
     * @param {Object} encryptedData - Encrypted data object
     * @param {string|Buffer} key - Decryption key
     * @returns {Buffer} Decrypted data
     */
    static decrypt(encryptedData, key) {
        try {
            const config = this.algorithms.AES_256_GCM;
            
            // Ensure key is correct length
            const keyBuffer = this.normalizeKey(key, config.keyLength);
            
            // Parse encrypted data
            const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
            const iv = Buffer.from(encryptedData.iv, 'base64');
            const tag = Buffer.from(encryptedData.tag, 'base64');
            
            // Create decipher
            const decipher = crypto.createDecipher(encryptedData.algorithm, keyBuffer);
            decipher.setAAD(Buffer.from('ChatPulse'));
            decipher.setAuthTag(tag);
            
            // Decrypt data
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Hash data using specified algorithm
     * @param {string|Buffer} data - Data to hash
     * @param {string} algorithm - Hash algorithm
     * @param {string} encoding - Output encoding
     * @returns {string} Hash
     */
    static hash(data, algorithm = 'sha256', encoding = 'hex') {
        const hash = crypto.createHash(algorithm);
        hash.update(data);
        return hash.digest(encoding);
    }

    /**
     * Create HMAC
     * @param {string|Buffer} data - Data to authenticate
     * @param {string|Buffer} key - Secret key
     * @param {string} algorithm - Hash algorithm
     * @param {string} encoding - Output encoding
     * @returns {string} HMAC
     */
    static hmac(data, key, algorithm = 'sha256', encoding = 'hex') {
        const hmac = crypto.createHmac(algorithm, key);
        hmac.update(data);
        return hmac.digest(encoding);
    }

    /**
     * Verify HMAC
     * @param {string|Buffer} data - Original data
     * @param {string|Buffer} key - Secret key
     * @param {string} signature - HMAC signature to verify
     * @param {string} algorithm - Hash algorithm
     * @returns {boolean} Verification result
     */
    static verifyHmac(data, key, signature, algorithm = 'sha256') {
        const expectedSignature = this.hmac(data, key, algorithm);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Generate salt for password hashing
     * @param {number} length - Salt length
     * @returns {Buffer} Salt
     */
    static generateSalt(length = 32) {
        return this.generateRandomBytes(length);
    }

    /**
     * Hash password with salt
     * @param {string} password - Password to hash
     * @param {Buffer} salt - Salt (optional, will generate if not provided)
     * @param {number} iterations - PBKDF2 iterations
     * @returns {Promise<Object>} Hash result
     */
    static async hashPassword(password, salt = null, iterations = 100000) {
        const saltBuffer = salt || this.generateSalt();
        const hash = await this.deriveKey(password, saltBuffer, iterations);
        
        return {
            hash: hash.toString('base64'),
            salt: saltBuffer.toString('base64'),
            iterations: iterations,
            algorithm: 'pbkdf2'
        };
    }

    /**
     * Verify password against hash
     * @param {string} password - Password to verify
     * @param {Object} hashData - Hash data object
     * @returns {Promise<boolean>} Verification result
     */
    static async verifyPassword(password, hashData) {
        try {
            const salt = Buffer.from(hashData.salt, 'base64');
            const hash = await this.deriveKey(password, salt, hashData.iterations);
            const expectedHash = Buffer.from(hashData.hash, 'base64');
            
            return crypto.timingSafeEqual(hash, expectedHash);
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate RSA key pair
     * @param {number} keySize - Key size in bits
     * @returns {Object} Key pair
     */
    static generateRSAKeyPair(keySize = 2048) {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: keySize,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
    }

    /**
     * Sign data with RSA private key
     * @param {string|Buffer} data - Data to sign
     * @param {string} privateKey - RSA private key in PEM format
     * @param {string} algorithm - Signature algorithm
     * @returns {string} Signature
     */
    static signRSA(data, privateKey, algorithm = 'sha256') {
        const sign = crypto.createSign(algorithm);
        sign.update(data);
        return sign.sign(privateKey, 'base64');
    }

    /**
     * Verify RSA signature
     * @param {string|Buffer} data - Original data
     * @param {string} signature - Signature to verify
     * @param {string} publicKey - RSA public key in PEM format
     * @param {string} algorithm - Signature algorithm
     * @returns {boolean} Verification result
     */
    static verifyRSA(data, signature, publicKey, algorithm = 'sha256') {
        try {
            const verify = crypto.createVerify(algorithm);
            verify.update(data);
            return verify.verify(publicKey, signature, 'base64');
        } catch (error) {
            return false;
        }
    }

    /**
     * Normalize key to specified length
     * @param {string|Buffer} key - Input key
     * @param {number} length - Target length
     * @returns {Buffer} Normalized key
     * @private
     */
    static normalizeKey(key, length) {
        const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf8');
        
        if (keyBuffer.length === length) {
            return keyBuffer;
        } else if (keyBuffer.length > length) {
            return keyBuffer.slice(0, length);
        } else {
            // Pad with zeros if too short
            const padded = Buffer.alloc(length);
            keyBuffer.copy(padded);
            return padded;
        }
    }

    /**
     * Constant-time string comparison
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {boolean} Comparison result
     */
    static constantTimeEqual(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        
        return crypto.timingSafeEqual(
            Buffer.from(a, 'utf8'),
            Buffer.from(b, 'utf8')
        );
    }

    /**
     * Generate secure token
     * @param {number} length - Token length
     * @returns {string} Secure token
     */
    static generateToken(length = 32) {
        return this.generateRandomBytes(length).toString('hex');
    }

    /**
     * Generate JWT-style token (without actual JWT implementation)
     * @param {Object} payload - Token payload
     * @param {string} secret - Secret key
     * @param {number} expiresIn - Expiration time in seconds
     * @returns {string} Token
     */
    static generateJWTStyleToken(payload, secret, expiresIn = 3600) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const payloadWithExp = {
            ...payload,
            exp: Math.floor(Date.now() / 1000) + expiresIn,
            iat: Math.floor(Date.now() / 1000)
        };
        const payloadEncoded = Buffer.from(JSON.stringify(payloadWithExp)).toString('base64url');
        const signature = this.hmac(`${header}.${payloadEncoded}`, secret, 'sha256', 'base64url');
        
        return `${header}.${payloadEncoded}.${signature}`;
    }

    /**
     * Verify JWT-style token
     * @param {string} token - Token to verify
     * @param {string} secret - Secret key
     * @returns {Object|null} Decoded payload or null if invalid
     */
    static verifyJWTStyleToken(token, secret) {
        try {
            const [header, payload, signature] = token.split('.');
            
            // Verify signature
            const expectedSignature = this.hmac(`${header}.${payload}`, secret, 'sha256', 'base64url');
            if (!this.constantTimeEqual(signature, expectedSignature)) {
                return null;
            }
            
            // Decode payload
            const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            
            // Check expiration
            if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
                return null;
            }
            
            return decodedPayload;
        } catch (error) {
            return null;
        }
    }
}

module.exports = { CryptoUtils };