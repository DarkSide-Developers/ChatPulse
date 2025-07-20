/**
 * ChatPulse - Pairing Example
 * Demonstrate phone number pairing authentication
 */

const { ChatPulse } = require('chatpulse');

async function pairingExample() {
    console.log('🚀 ChatPulse Pairing Example\n');
    
    // Create ChatPulse client with pairing strategy
    const client = new ChatPulse({
        sessionName: 'pairing-session',
        authStrategy: 'pairing',
        logLevel: 'warn',  // Reduce log noise
        autoReconnect: true
    });
    
    // Event: When client is ready
    client.on('ready', () => {
        console.log('✅ ChatPulse is ready with pairing authentication!');
        console.log('📱 Send messages to test the bot\n');
    });
    
    // Event: When pairing code is generated
    client.on('pairing_code', (pairingInfo) => {
        // The pairing handler already displays the code nicely
    });
    
    // Event: When authenticated
    client.on('authenticated', (authData) => {
        console.log('🔐 Pairing authentication successful!');
        if (authData.phoneNumber) {
            console.log(`📱 Phone: +${authData.phoneNumber}\n`);
        }
    });
    
    // Event: Handle incoming messages
    client.on('message', async (message) => {
        try {
            console.log(`📨 ${message.from}: ${message.body}`);
            
            // Ignore messages from self
            if (message.isFromMe) return;
            
            // Simple command responses
            if (message.body === '!ping') {
                await client.sendMessage(message.from, 'Pong! 🏓 (Authenticated via pairing)');
            }
            
            else if (message.body === '!pairing') {
                const pairings = client.getActivePairings();
                const statusText = `
📞 *Pairing Status*

🔗 Active Pairings: ${pairings.length}
🔐 Authentication: Phone Number Pairing
✅ Status: Connected and Ready

Powered by ChatPulse 2.0 🚀`;
                await client.sendMessage(message.from, statusText);
            }
            
            else if (message.body === '!help') {
                const helpText = `
🤖 *ChatPulse Pairing Bot*

• !ping - Test bot response
• !pairing - Show pairing status
• !help - Show this help

🔐 Authenticated via phone number pairing
Powered by ChatPulse 2.0 🚀`;
                await client.sendMessage(message.from, helpText);
            }
            
        } catch (error) {
            console.error('❌ Error handling message:', error.message);
        }
    });
    
    // Event: Handle errors
    client.on('error', (error) => {
        console.error('❌ ChatPulse Error:', error.message);
    });
    
    // Manual pairing method (alternative to auto-pairing)
    async function manualPairing() {
        try {
            console.log('📞 Starting manual pairing process...');
            
            // Request pairing code for a phone number
            const phoneNumber = '1234567890'; // Replace with actual phone number
            const pairingCode = await client.requestPairingCode(phoneNumber);
            
            console.log(`🔑 Pairing Code: ${pairingCode}`);
            console.log('📱 Enter this code in WhatsApp mobile app');
            
            // In a real scenario, you would wait for user to enter the code
            // and then verify it. For demo purposes, we'll simulate this.
            
        } catch (error) {
            console.error('❌ Manual pairing failed:', error.message);
        }
    }
    
    // Initialize the client
    try {
        await client.initialize();
        
        // Uncomment to test manual pairing
        // await manualPairing();
        
    } catch (error) {
        console.error('❌ Failed to initialize:', error.message);
        process.exit(1);
    }
    
    // Graceful shutdown
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

// Run the example
if (require.main === module) {
    pairingExample().catch(console.error);
}

module.exports = pairingExample;