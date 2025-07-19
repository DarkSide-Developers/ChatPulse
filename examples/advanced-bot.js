/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * GitHub: https://github.com/DarkSide-Developers
 * Repository: https://github.com/DarkSide-Developers/ChatPulse
 * © 2025 DarkSide Developer Team. All rights reserved.
 */

const { ChatPulse } = require('../src');
require('dotenv').config();

/**
 * Advanced ChatPulse Bot Example with all features
 */

// Initialize ChatPulse with advanced options
const client = new ChatPulse({
    sessionName: 'advanced-bot',
    autoReconnect: true,
    authStrategy: 'qr', // or 'pairing'
    pairingNumber: process.env.PAIRING_NUMBER || null,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    // Advanced features
    enableMultiDevice: true,
    enableE2E: true,
    enableGroupEvents: true,
    enablePresenceUpdates: true,
    enableCallHandling: true,
    enableStatusUpdates: true,
    enableBusinessFeatures: true,
    enableAdvancedMedia: true,
    enableBulkMessaging: true,
    enableScheduledMessages: true,
    enableAutoReply: true,
    enableChatBackup: true,
    enableAnalytics: true,
    rateLimitPerMinute: 60
});

// Event handlers
client.on('ready', async () => {
    console.log('🚀 Advanced ChatPulse Bot is ready!');
    console.log('📱 All advanced features are now available');
    
    // Get device info
    const deviceInfo = await client.getDeviceInfo();
    console.log('📱 Device Info:', deviceInfo);
});

client.on('connected', () => {
    console.log('✅ Connected to WhatsApp Web');
});

client.on('disconnected', () => {
    console.log('❌ Disconnected from WhatsApp Web');
});

client.on('qr_generated', (qrInfo) => {
    console.log('📱 QR Code generated! Scan it with your WhatsApp mobile app');
    if (qrInfo.formats.png) {
        console.log(`📄 QR Code saved to: ${qrInfo.formats.png}`);
    }
});

client.on('pairing_code', (code) => {
    console.log(`🔗 Pairing Code: ${code}`);
    console.log('Enter this code in your WhatsApp mobile app');
});

// Advanced message handling
client.on('message', async (message) => {
    // Ignore messages from self
    if (message.isFromMe) return;
    
    console.log(`📨 Message from ${message.from}: ${message.body || message.type}`);
    
    const command = message.body?.toLowerCase();
    
    try {
        // Button message example
        if (command === '!buttons') {
            await client.sendButtonMessage(message.from, 
                '🎛️ *Choose an option:*', 
                [
                    { id: 'btn1', text: '📊 Get Info' },
                    { id: 'btn2', text: '📱 Device Status' },
                    { id: 'btn3', text: '🎮 Games' }
                ],
                { footer: 'ChatPulse Advanced Bot' }
            );
        }
        
        // List message example
        else if (command === '!menu') {
            await client.sendListMessage(message.from,
                '📋 *Bot Menu*\nChoose from the options below:',
                'Select Option',
                [
                    {
                        title: '🤖 Bot Commands',
                        rows: [
                            { id: 'help', title: 'Help', description: 'Show all commands' },
                            { id: 'info', title: 'Bot Info', description: 'Get bot information' },
                            { id: 'status', title: 'Status', description: 'Check bot status' }
                        ]
                    },
                    {
                        title: '🎮 Entertainment',
                        rows: [
                            { id: 'joke', title: 'Random Joke', description: 'Get a funny joke' },
                            { id: 'quote', title: 'Inspirational Quote', description: 'Get motivation' },
                            { id: 'fact', title: 'Fun Fact', description: 'Learn something new' }
                        ]
                    },
                    {
                        title: '🛠️ Utilities',
                        rows: [
                            { id: 'weather', title: 'Weather', description: 'Get weather info' },
                            { id: 'time', title: 'Time', description: 'Current time' },
                            { id: 'calc', title: 'Calculator', description: 'Simple calculations' }
                        ]
                    }
                ],
                { footer: 'Powered by ChatPulse' }
            );
        }
        
        // Poll example
        else if (command === '!poll') {
            await client.sendPoll(message.from,
                '🗳️ What\'s your favorite programming language?',
                ['JavaScript', 'Python', 'Java', 'C++', 'Go'],
                { multipleAnswers: false }
            );
        }
        
        // Contact sharing example
        else if (command === '!contact') {
            await client.sendContact(message.from, {
                name: 'ChatPulse Support',
                number: '+1234567890',
                organization: 'DarkSide Developer Team',
                email: 'support@chatpulse.dev'
            });
        }
        
        // Location sharing example
        else if (command === '!location') {
            await client.sendLocation(message.from, 
                40.7128, -74.0060, 
                '📍 New York City, USA'
            );
        }
        
        // Sticker example
        else if (command === '!sticker') {
            // You would need an actual image file
            await client.sendMessage(message.from, 
                '🎨 Sticker feature available! Send an image with "!makesticker" to convert it.'
            );
        }
        
        // Advanced text formatting
        else if (command === '!format') {
            await client.sendMessage(message.from,
                `📝 *Text Formatting Examples:*

*Bold Text*
_Italic Text_
~Strikethrough Text~
\`\`\`Monospace Text\`\`\`

🔗 Links: https://github.com/DarkSide-Developers/ChatPulse
📧 Email: test@example.com
📞 Phone: +1234567890`,
                { parseMode: 'markdown' }
            );
        }
        
        // Chat info
        else if (command === '!chatinfo') {
            const chatInfo = await client.getChatInfo(message.from);
            const response = `
📊 *Chat Information*
👤 Name: ${chatInfo.name || 'Unknown'}
🆔 ID: ${chatInfo.id}
👥 Is Group: ${chatInfo.isGroup ? 'Yes' : 'No'}
📬 Unread Count: ${chatInfo.unreadCount}
📌 Pinned: ${chatInfo.pinned ? 'Yes' : 'No'}
🗃️ Archived: ${chatInfo.archived ? 'Yes' : 'No'}
🔇 Muted: ${chatInfo.muted ? 'Yes' : 'No'}
${chatInfo.isGroup ? `👥 Participants: ${chatInfo.participants}` : ''}
            `.trim();
            
            await client.sendMessage(message.from, response);
        }
        
        // React to message
        else if (command === '!react') {
            await client.reactToMessage(message.id, '❤️');
        }
        
        // Forward message (if replying to a message)
        else if (command === '!forward' && message.hasQuotedMsg) {
            await client.forwardMessage(message.from, message.quotedMsg);
        }
        
        // Archive chat
        else if (command === '!archive') {
            await client.archiveChat(message.from, true);
            await client.sendMessage(message.from, '🗃️ Chat archived!');
        }
        
        // Pin chat
        else if (command === '!pin') {
            await client.pinChat(message.from, true);
            await client.sendMessage(message.from, '📌 Chat pinned!');
        }
        
        // Set typing indicator
        else if (command === '!typing') {
            await client.setChatPresence(message.from, 'typing');
            setTimeout(async () => {
                await client.sendMessage(message.from, '⌨️ I was typing!');
                await client.setChatPresence(message.from, 'available');
            }, 3000);
        }
        
        // Help command
        else if (command === '!help') {
            const helpText = `
🤖 *ChatPulse Advanced Bot Commands*

📝 *Message Commands:*
• \`!buttons\` - Show button message
• \`!menu\` - Show interactive menu
• \`!poll\` - Create a poll
• \`!format\` - Text formatting examples
• \`echo <text>\` - Echo your message

📊 *Information Commands:*
• \`!chatinfo\` - Get chat information
• \`!info\` - Get bot information
• \`!help\` - Show this help

🎮 *Interactive Commands:*
• \`!contact\` - Share contact
• \`!location\` - Share location
• \`!sticker\` - Sticker info
• \`!react\` - React to this message

🛠️ *Utility Commands:*
• \`!forward\` - Forward quoted message
• \`!archive\` - Archive this chat
• \`!pin\` - Pin this chat
• \`!typing\` - Show typing indicator

💡 *Tips:*
• Use buttons and menus for better interaction
• All commands are case-insensitive
• Bot supports markdown formatting
            `.trim();
            
            await client.sendMessage(message.from, helpText);
        }
        
        // Echo functionality with advanced features
        else if (command.startsWith('echo ')) {
            const echoText = message.body.substring(5);
            await client.sendMessage(message.from, `🔄 Echo: ${echoText}`, {
                quotedMessageId: message.id,
                mentions: message.mentionedJidList
            });
        }
        
        // Default response for unknown commands
        else if (command.startsWith('!')) {
            await client.sendMessage(message.from, 
                '❓ Unknown command. Type `!help` to see available commands.'
            );
        }
        
    } catch (error) {
        console.error('Error handling message:', error);
        await client.sendMessage(message.from, 
            '❌ Sorry, an error occurred while processing your request.'
        );
    }
});

// Handle button responses
client.on('button_response', async (message) => {
    console.log(`🔘 Button pressed: ${message.selectedButtonId}`);
    
    switch (message.selectedButtonId) {
        case 'btn1':
            const chatInfo = await client.getChatInfo(message.from);
            await client.sendMessage(message.from, `📊 Chat: ${chatInfo.name}`);
            break;
        case 'btn2':
            const deviceInfo = await client.getDeviceInfo();
            await client.sendMessage(message.from, `📱 Battery: ${deviceInfo.battery}%`);
            break;
        case 'btn3':
            await client.sendMessage(message.from, '🎮 Games coming soon!');
            break;
    }
});

// Handle list responses
client.on('list_response', async (message) => {
    console.log(`📋 List item selected: ${message.selectedRowId}`);
    
    switch (message.selectedRowId) {
        case 'help':
            await client.sendMessage(message.from, '📚 Help: Type !help for commands');
            break;
        case 'info':
            await client.sendMessage(message.from, '🤖 ChatPulse Advanced Bot v1.0');
            break;
        case 'joke':
            await client.sendMessage(message.from, '😄 Why do programmers prefer dark mode? Because light attracts bugs!');
            break;
        case 'weather':
            await client.sendMessage(message.from, '🌤️ Weather: Sunny, 25°C (Example)');
            break;
        default:
            await client.sendMessage(message.from, `✅ You selected: ${message.selectedRowId}`);
    }
});

// Handle poll updates
client.on('poll_update', async (message) => {
    console.log(`🗳️ Poll update:`, message);
});

// Handle presence updates
client.on('presence_update', (presence) => {
    console.log(`👁️ Presence update:`, presence);
});

// Handle calls
client.on('call', (call) => {
    console.log(`📞 Incoming call:`, call);
});

// Handle group updates
client.on('group_update', (update) => {
    console.log(`👥 Group update:`, update);
});

client.on('error', (error) => {
    console.error('❌ ChatPulse Error:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Advanced ChatPulse Bot...');
    await client.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down Advanced ChatPulse Bot...');
    await client.disconnect();
    process.exit(0);
});

// Initialize the bot
console.log('🔄 Initializing Advanced ChatPulse Bot...');
client.initialize().catch(error => {
    console.error('❌ Failed to initialize ChatPulse:', error);
    process.exit(1);
});