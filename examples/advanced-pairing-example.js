/**
 * ChatPulse - Advanced Pairing Methods Example
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse } = require('../src/index');

async function advancedPairingExample() {
    console.log('🚀 Starting ChatPulse Advanced Pairing Example...\n');
    
    // Example 1: Phone Number Authentication
    console.log('📞 Example 1: Phone Number Authentication');
    const phoneClient = new ChatPulse({
        sessionName: 'phone-auth-bot',
        authStrategy: 'phone_number',
        phoneNumber: '+1234567890',
        logLevel: 'info'
    });
    
    phoneClient.on('phone_verification_sent', (data) => {
        console.log('📱 Verification code sent to:', data.phoneNumber);
        console.log('⏰ Expires at:', new Date(data.expiresAt).toLocaleTimeString());
        
        // Simulate user entering verification code
        setTimeout(async () => {
            try {
                const result = await phoneClient.authenticator.verifyPhoneNumber(data.sessionId, '123456');
                console.log('✅ Phone verification result:', result);
            } catch (error) {
                console.error('❌ Phone verification failed:', error.message);
            }
        }, 5000);
    });
    
    phoneClient.on('phone_verification_success', (data) => {
        console.log('🎉 Phone authentication successful!');
        console.log('📱 Phone:', data.phoneNumber);
        console.log('🔑 Auth Token:', data.authToken.substring(0, 10) + '...');
    });
    
    // Example 2: Email Authentication
    console.log('\n📧 Example 2: Email Authentication');
    const emailClient = new ChatPulse({
        sessionName: 'email-auth-bot',
        authStrategy: 'email',
        email: 'user@example.com',
        logLevel: 'info'
    });
    
    emailClient.on('email_magic_link_sent', (data) => {
        console.log('📧 Magic link sent to:', data.email);
        console.log('🔗 Magic link:', data.magicLink);
        
        // Simulate user clicking magic link
        setTimeout(async () => {
            try {
                const token = data.magicLink.split('token=')[1].split('&')[0];
                const result = await emailClient.authenticator.verifyMagicLink(token);
                console.log('✅ Email verification result:', result);
            } catch (error) {
                console.error('❌ Email verification failed:', error.message);
            }
        }, 3000);
    });
    
    emailClient.on('email_verification_success', (data) => {
        console.log('🎉 Email authentication successful!');
        console.log('📧 Email:', data.email);
        console.log('🔑 Auth Token:', data.authToken.substring(0, 10) + '...');
    });
    
    // Example 3: Multi-Device Authentication
    console.log('\n📱 Example 3: Multi-Device Authentication');
    const multiDeviceClient = new ChatPulse({
        sessionName: 'multi-device-bot',
        authStrategy: 'multi_device',
        deviceInfo: {
            deviceId: 'device-123',
            deviceName: 'My Laptop',
            deviceType: 'desktop',
            platform: 'linux'
        },
        logLevel: 'info'
    });
    
    multiDeviceClient.on('device_pairing_qr', (data) => {
        console.log('📱 Device pairing QR generated');
        console.log('🆔 Device ID:', data.deviceId);
        console.log('📱 QR Code:', data.qrCode);
        console.log('📋 Device Info:', data.deviceInfo);
    });
    
    multiDeviceClient.on('device_paired', (data) => {
        console.log('🎉 Device paired successfully!');
        console.log('📱 Device:', data.deviceInfo.deviceName);
        console.log('✅ Status:', data.deviceInfo.status);
    });
    
    // Example 4: Backup Code Authentication
    console.log('\n🔑 Example 4: Backup Code Authentication');
    const backupClient = new ChatPulse({
        sessionName: 'backup-auth-bot',
        authStrategy: 'backup_code',
        logLevel: 'info'
    });
    
    backupClient.on('backup_code_success', (data) => {
        console.log('🎉 Backup code authentication successful!');
        console.log('🔑 Auth Token:', data.authToken.substring(0, 10) + '...');
    });
    
    // Example 5: Biometric Authentication
    console.log('\n👆 Example 5: Biometric Authentication');
    const biometricClient = new ChatPulse({
        sessionName: 'biometric-auth-bot',
        authStrategy: 'biometric',
        logLevel: 'info'
    });
    
    biometricClient.on('biometric_success', (data) => {
        console.log('🎉 Biometric authentication successful!');
        console.log('👆 Type:', data.biometricType);
        console.log('🔑 Auth Token:', data.authToken.substring(0, 10) + '...');
    });
    
    // Start authentication examples
    try {
        console.log('\n🔄 Starting authentication examples...\n');
        
        // Phone number authentication
        await phoneClient.initialize();
        
        // Email authentication
        setTimeout(async () => {
            await emailClient.initialize();
        }, 2000);
        
        // Multi-device authentication
        setTimeout(async () => {
            await multiDeviceClient.initialize();
        }, 4000);
        
        // Backup code authentication
        setTimeout(async () => {
            try {
                const result = await backupClient.authenticator.authenticateWithBackupCode('BACKUP123');
                console.log('✅ Backup code result:', result);
            } catch (error) {
                console.error('❌ Backup code failed:', error.message);
            }
        }, 6000);
        
        // Biometric authentication
        setTimeout(async () => {
            try {
                const result = await biometricClient.authenticator.authenticateWithBiometric({
                    type: 'fingerprint',
                    data: 'simulated_fingerprint_data_12345'
                });
                console.log('✅ Biometric result:', result);
            } catch (error) {
                console.error('❌ Biometric failed:', error.message);
            }
        }, 8000);
        
    } catch (error) {
        console.error('❌ Example failed:', error.message);
    }
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down examples...');
        try {
            await Promise.all([
                phoneClient.disconnect(),
                emailClient.disconnect(),
                multiDeviceClient.disconnect(),
                backupClient.disconnect(),
                biometricClient.disconnect()
            ]);
            console.log('✅ All clients disconnected');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error.message);
            process.exit(1);
        }
    });
}

// Run the example
if (require.main === module) {
    advancedPairingExample().catch(console.error);
}

module.exports = advancedPairingExample;