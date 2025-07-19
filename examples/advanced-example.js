/**
 * ChatPulse - Advanced Usage Example
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse, getConfigForUseCase } = require('chatpulse');

async function advancedExample() {
    console.log('🚀 Starting ChatPulse Advanced Example...\n');
    
    // Initialize ChatPulse with advanced configuration
    const client = new ChatPulse({
        sessionName: 'advanced-bot',
        authStrategy: 'qr',
        autoReconnect: true,
        maxReconnectAttempts: 15,
        reconnectInterval: 3000,
        logLevel: 'debug',
        
        // Enhanced QR options
        qrCodeOptions: {
            terminal: true,
            save: true,
            format: 'png',
            size: 'large',
            autoRefresh: true
        },
        
        // Rate limiting
        rateLimitPerMinute: 100,
        rateLimitPerHour: 2000,
        
        // Advanced features
        enablePresenceUpdates: true,
        enableReadReceipts: true,
        enableTypingIndicator: true,
        enableMessageQueue: true
    });
    
    // Enhanced event handlers
    client.on('ready', async () => {
        console.log('🎉 ChatPulse Advanced Bot is ready!');
        
        // Get connection status
        const status = client.getConnectionStatus();
        console.log('📊 Connection Status:', status);
    });
    
    client.on('qr_generated', (qrInfo) => {
        console.log('📱 New QR Code generated!');
        console.log(`🆔 QR Data: ${qrInfo.data.substring(0, 20)}...`);
        console.log(`⏰ Expires: ${new Date(qrInfo.expires).toLocaleTimeString()}`);
        console.log('📱 Scan with WhatsApp mobile app to connect\n');
    });
    
    client.on('qr_updated', (qrInfo) => {
        console.log('🔄 QR Code refreshed automatically');
    });
    
    client.on('authenticated', (authData) => {
        console.log('🔐 Authentication successful!');
        console.log('👤 Client Info:', authData);
    });
    
    client.on('disconnected', () => {
        console.log('🔌 Disconnected from WhatsApp Web');
    });
    
    client.on('reconnecting', () => {
        console.log('🔄 Attempting to reconnect...');
    });
    
    client.on('error', (error, context, recovered) => {
        console.error('❌ Error occurred:', error.message);
        if (context) console.error('📍 Context:', context);
        if (recovered) console.log('✅ Error was recovered automatically');
    });
    
    client.on('warning', (warning) => {
        console.warn('⚠️ Warning:', warning.message);
    });
    
    // Advanced message handling
    client.on('message', async (message) => {
        try {
            console.log(`📨 Message from ${message.from}: ${message.body}`);
            
            // Advanced command handling
            const command = message.body.toLowerCase().trim();
            
            switch (command) {
                case '!menu':
                    await sendMainMenu(client, message.from);
                    break;
                    
                case '!buttons':
                    await sendButtonExample(client, message.from);
                    break;
                    
                case '!list':
                    await sendListExample(client, message.from);
                    break;
                    
                case '!contact':
                    await sendContactExample(client, message.from);
                    break;
                    
                case '!location':
                    await sendLocationExample(client, message.from);
                    break;
                    
                case '!poll':
                    await sendPollExample(client, message.from);
                    break;
                    
                case '!status':
                    await sendAdvancedStatus(client, message.from);
                    break;
                    
                case '!qr':
                    await sendQRInfo(client, message.from);
                    break;
                    
                default:
                    if (command.startsWith('!echo ')) {
                        const text = message.body.substring(6);
                        await client.sendMessage(message.from, `Echo: ${text}`);
                    }
            }
            
        } catch (error) {
            console.error('❌ Error handling message:', error.message);
            await client.sendMessage(message.from, '❌ Sorry, an error occurred while processing your message.');
        }
    });
    
    // Handle button responses
    client.on('button_response', async (message) => {
        console.log(`🔘 Button pressed: ${message.selectedButtonId}`);
        
        try {
            switch (message.selectedButtonId) {
                case 'btn_info':
                    await client.sendMessage(message.from, '📋 This is ChatPulse 2.0 - Advanced WhatsApp Web API Library');
                    break;
                case 'btn_help':
                    await sendMainMenu(client, message.from);
                    break;
                case 'btn_status':
                    await sendAdvancedStatus(client, message.from);
                    break;
                default:
                    await client.sendMessage(message.from, `✅ Button "${message.selectedButtonId}" was pressed!`);
            }
        } catch (error) {
            console.error('❌ Error handling button response:', error.message);
        }
    });
    
    // Handle list responses
    client.on('list_response', async (message) => {
        console.log(`📋 List item selected: ${message.selectedRowId}`);
        
        try {
            await client.sendMessage(message.from, `✅ You selected: ${message.selectedRowId}`);
        } catch (error) {
            console.error('❌ Error handling list response:', error.message);
        }
    });
    
    // Handle poll updates
    client.on('poll_update', (message) => {
        console.log('📊 Poll update received:', message);
    });
    
    // Handle presence updates
    client.on('presence_update', (presence) => {
        console.log(`👤 Presence update: ${presence.from} is ${presence.state}`);
    });
    
    // Initialize the client
    try {
        await client.initialize();
        console.log('🎉 Advanced ChatPulse initialized successfully!');
    } catch (error) {
        console.error('❌ Failed to initialize ChatPulse:', error.message);
        process.exit(1);
    }
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down gracefully...');
        try {
            await client.disconnect();
            console.log('✅ Disconnected successfully');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error.message);
            process.exit(1);
        }
    });
}

// Helper functions for advanced features
async function sendMainMenu(client, chatId) {
    const menuText = `
🤖 *ChatPulse Advanced Bot*

Available commands:
• !menu - Show this menu
• !buttons - Button message example
• !list - List message example
• !contact - Contact sharing example
• !location - Location sharing example
• !poll - Poll creation example
• !status - Advanced status info
• !qr - QR code information
• !echo <text> - Echo your message

Type any command to try it out! 🚀
    `;
    
    await client.sendMessage(chatId, menuText);
}

async function sendButtonExample(client, chatId) {
    await client.sendButtonMessage(
        chatId,
        '🔘 Choose an option:',
        [
            { id: 'btn_info', text: '📋 Bot Info' },
            { id: 'btn_help', text: '❓ Help' },
            { id: 'btn_status', text: '📊 Status' }
        ],
        { footer: 'ChatPulse Advanced Bot' }
    );
}

async function sendListExample(client, chatId) {
    await client.sendListMessage(
        chatId,
        '📋 Select from menu:',
        'Choose Option',
        [
            {
                title: '🤖 Bot Functions',
                rows: [
                    { id: 'bot_info', title: 'Bot Information', description: 'Get bot details' },
                    { id: 'bot_status', title: 'Bot Status', description: 'Check bot health' }
                ]
            },
            {
                title: '🎮 Fun Features',
                rows: [
                    { id: 'fun_joke', title: 'Random Joke', description: 'Get a funny joke' },
                    { id: 'fun_fact', title: 'Fun Fact', description: 'Learn something new' }
                ]
            }
        ]
    );
}

async function sendContactExample(client, chatId) {
    await client.sendContact(chatId, {
        name: 'ChatPulse Support',
        number: '+1234567890',
        organization: 'DarkSide Developer Team',
        email: 'support@chatpulse.dev'
    });
}

async function sendLocationExample(client, chatId) {
    await client.sendLocation(
        chatId,
        40.7128,
        -74.0060,
        '📍 New York City - The Big Apple!'
    );
}

async function sendPollExample(client, chatId) {
    await client.sendPoll(
        chatId,
        '🗳️ What\'s your favorite programming language?',
        ['JavaScript', 'Python', 'Java', 'C++', 'Go'],
        { multipleAnswers: false }
    );
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

⏱️ *Performance*
• Uptime: ${Math.floor(status.uptime / 1000)}s
• Reconnect Attempts: ${status.reconnectAttempts}
• Last Heartbeat: ${status.lastHeartbeat ? new Date(status.lastHeartbeat).toLocaleTimeString() : 'N/A'}

🤖 *Bot Info*
• Version: ChatPulse 2.0
• Session: ${client.options.sessionName}
• Auth Strategy: ${client.options.authStrategy}

Powered by ChatPulse 🚀
    `;
    
    await client.sendMessage(chatId, statusText);
}

async function sendQRInfo(client, chatId) {
    try {
        const qrInfo = await client.getQRCode('terminal');
        const infoText = `
📱 *QR Code Information*

🆔 QR Data: ${qrInfo.substring(0, 20)}...
⏰ Generated: ${new Date().toLocaleTimeString()}
🔄 Auto-refresh: Enabled
📱 Scan with WhatsApp mobile app

Use !qr command anytime to get QR info 📱
        `;
        
        await client.sendMessage(chatId, infoText);
    } catch (error) {
        await client.sendMessage(chatId, '❌ No QR code available or already authenticated');
    }
}

// Run the example
if (require.main === module) {
    advancedExample().catch(console.error);
}

module.exports = advancedExample;