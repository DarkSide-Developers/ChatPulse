/**
 * ChatPulse - Advanced Example
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse } = require('../src/index');

async function advancedExample() {
    console.log('🚀 Starting ChatPulse Advanced Example...\n');
    
    const client = new ChatPulse({
        sessionName: 'advanced-bot',
        authStrategy: 'qr',
        autoReconnect: true,
        maxReconnectAttempts: 15,
        logLevel: 'debug',
        qrCodeOptions: {
            terminal: true,
            save: true,
            format: 'png',
            size: 'large'
        }
    });
    
    client.on('ready', async () => {
        console.log('🎉 ChatPulse Advanced Bot is ready!');
        const status = client.getConnectionStatus();
        console.log('📊 Connection Status:', status);
    });
    
    client.on('qr_generated', (qrInfo) => {
        console.log('📱 QR Code generated!');
        console.log('📱 Scan with WhatsApp mobile app\n');
    });
    
    client.on('authenticated', (authData) => {
        console.log('🔐 Authentication successful!');
    });
    
    client.on('message', async (message) => {
        try {
            console.log(`📨 Message from ${message.from}: ${message.body}`);
            
            const command = message.body.toLowerCase().trim();
            
            switch (command) {
                case '!menu':
                    await sendMainMenu(client, message.from);
                    break;
                    
                case '!status':
                    await sendAdvancedStatus(client, message.from);
                    break;
                    
                case '!phone':
                    await demonstratePhoneAuth(client, message.from);
                    break;
                    
                case '!email':
                    await demonstrateEmailAuth(client, message.from);
                    break;
                    
                default:
                    if (command.startsWith('!echo ')) {
                        const text = message.body.substring(6);
                        await client.sendMessage(message.from, `Echo: ${text}`);
                    }
            }
        } catch (error) {
            console.error('❌ Error handling message:', error.message);
        }
    });
    
    try {
        await client.initialize();
    } catch (error) {
        console.error('❌ Failed to initialize:', error.message);
        process.exit(1);
    }
    
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down...');
        try {
            await client.disconnect();
            process.exit(0);
        } catch (error) {
            process.exit(1);
        }
    });
}

async function sendMainMenu(client, chatId) {
    const menuText = `
🤖 *ChatPulse Advanced Bot*

Available commands:
• !menu - Show this menu
• !status - Advanced status info
• !phone - Phone authentication demo
• !email - Email authentication demo
• !echo <text> - Echo your message

Powered by ChatPulse 2.0 🚀`;
    
    await client.sendMessage(chatId, menuText);
}

async function sendAdvancedStatus(client, chatId) {
    const status = client.getConnectionStatus();
    const statusText = `
📊 *Advanced Bot Status*

🔌 *Connection*
• Connected: ${status.connected ? '✅' : '❌'}
• Authenticated: ${status.authenticated ? '✅' : '❌'}
• Ready: ${status.ready ? '✅' : '❌'}
• State: ${status.state}

🔄 *Reconnection*
• Attempts: ${status.reconnectAttempts}

🤖 *Bot Info*
• Version: ChatPulse 2.0
• Session: ${client.options.sessionName}

Powered by ChatPulse 🚀`;
    
    await client.sendMessage(chatId, statusText);
}

async function demonstratePhoneAuth(client, chatId) {
    try {
        const result = await client.authenticateWithPhoneNumber('+1234567890');
        await client.sendMessage(chatId, `📞 Phone auth demo: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
        await client.sendMessage(chatId, `❌ Phone auth error: ${error.message}`);
    }
}

async function demonstrateEmailAuth(client, chatId) {
    try {
        const result = await client.authenticateWithEmail('demo@example.com');
        await client.sendMessage(chatId, `📧 Email auth demo: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
        await client.sendMessage(chatId, `❌ Email auth error: ${error.message}`);
    }
}

if (require.main === module) {
    advancedExample().catch(console.error);
}

module.exports = advancedExample;