/**
 * ChatPulse - Smart Bot Example
 * Intelligent WhatsApp bot with multiple features
 */

const { ChatPulse } = require('chatpulse');

class SmartBot {
    constructor() {
        this.client = new ChatPulse({
            sessionName: 'smart-bot',
            logLevel: 'info',
            autoReconnect: true
        });
        
        this.commands = new Map();
        this.userSessions = new Map();
        
        this.setupCommands();
        this.setupEvents();
    }
    
    setupCommands() {
        this.commands.set('start', this.handleStart.bind(this));
        this.commands.set('help', this.handleHelp.bind(this));
        this.commands.set('weather', this.handleWeather.bind(this));
        this.commands.set('joke', this.handleJoke.bind(this));
        this.commands.set('quote', this.handleQuote.bind(this));
        this.commands.set('calc', this.handleCalculator.bind(this));
        this.commands.set('reminder', this.handleReminder.bind(this));
        this.commands.set('info', this.handleInfo.bind(this));
    }
    
    setupEvents() {
        this.client.on('ready', () => {
            console.log('🤖 Smart Bot is ready!');
        });
        
        this.client.on('qr_generated', () => {
            console.log('📱 Scan QR code to connect Smart Bot');
        });
        
        this.client.on('message', this.handleMessage.bind(this));
        this.client.on('button_response', this.handleButtonResponse.bind(this));
    }
    
    async handleMessage(message) {
        try {
            if (message.isFromMe) return;
            
            const text = message.body.toLowerCase().trim();
            const userId = message.from;
            
            // Initialize user session
            if (!this.userSessions.has(userId)) {
                this.userSessions.set(userId, {
                    lastCommand: null,
                    context: {},
                    messageCount: 0
                });
            }
            
            const session = this.userSessions.get(userId);
            session.messageCount++;
            
            // Handle commands
            if (text.startsWith('!')) {
                const [command, ...args] = text.substring(1).split(' ');
                const handler = this.commands.get(command);
                
                if (handler) {
                    session.lastCommand = command;
                    await handler(message, args, session);
                } else {
                    await this.client.sendMessage(userId, '❓ Unknown command. Type !help for available commands.');
                }
            }
            // Handle greetings
            else if (['hi', 'hello', 'hey'].some(greeting => text.includes(greeting))) {
                await this.handleGreeting(message, session);
            }
            // Handle thanks
            else if (['thank', 'thanks', 'thx'].some(thanks => text.includes(thanks))) {
                await this.client.sendMessage(userId, '😊 You\'re welcome! Happy to help!');
            }
            // Default response for first-time users
            else if (session.messageCount === 1) {
                await this.handleFirstMessage(message);
            }
            
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
    
    async handleStart(message) {
        const welcomeText = `
🤖 *Welcome to Smart Bot!*

I'm your intelligent WhatsApp assistant powered by ChatPulse.

🚀 *Quick Start:*
• Type !help to see all commands
• Use !weather <city> for weather info
• Try !joke for a random joke
• Use !calc for calculations

Let's get started! 🎉`;

        const buttons = [
            { id: 'btn_help', text: '📖 Help' },
            { id: 'btn_features', text: '🚀 Features' },
            { id: 'btn_about', text: 'ℹ️ About' }
        ];
        
        await this.client.sendButtonMessage(
            message.from,
            welcomeText,
            buttons,
            { footer: 'Smart Bot v1.0' }
        );
    }
    
    async handleHelp(message) {
        const helpText = `
📖 *Smart Bot Commands*

🎯 *General:*
• !start - Welcome message
• !help - Show this help
• !info - Bot information

🌟 *Fun:*
• !joke - Random joke
• !quote - Inspirational quote

🔧 *Utilities:*
• !weather <city> - Weather info
• !calc <expression> - Calculator
• !reminder <time> <message> - Set reminder

💬 *Just say hi to start a conversation!*

Powered by ChatPulse 🚀`;
        
        await this.client.sendMessage(message.from, helpText);
    }
    
    async handleWeather(message, args) {
        const city = args.join(' ') || 'London';
        
        // Simulate weather data
        const weather = {
            city: city,
            temperature: Math.floor(Math.random() * 30) + 10,
            condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
            humidity: Math.floor(Math.random() * 40) + 40
        };
        
        const weatherText = `
🌤️ *Weather in ${weather.city}*

🌡️ Temperature: ${weather.temperature}°C
☁️ Condition: ${weather.condition}
💧 Humidity: ${weather.humidity}%

*Note: This is simulated data for demo purposes*`;
        
        await this.client.sendMessage(message.from, weatherText);
    }
    
    async handleJoke(message) {
        const jokes = [
            "Why don't scientists trust atoms? Because they make up everything! 😄",
            "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
            "Why don't eggs tell jokes? They'd crack each other up! 🥚",
            "What do you call a fake noodle? An impasta! 🍝",
            "Why did the math book look so sad? Because it had too many problems! 📚"
        ];
        
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await this.client.sendMessage(message.from, `😂 ${randomJoke}`);
    }
    
    async handleQuote(message) {
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Innovation distinguishes between a leader and a follower. - Steve Jobs",
            "Life is what happens to you while you're busy making other plans. - John Lennon",
            "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
            "It is during our darkest moments that we must focus to see the light. - Aristotle"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        await this.client.sendMessage(message.from, `💭 *Quote of the moment:*\n\n"${randomQuote}"`);
    }
    
    async handleCalculator(message, args) {
        const expression = args.join(' ');
        
        if (!expression) {
            await this.client.sendMessage(message.from, '🔢 Please provide a calculation. Example: !calc 2 + 2');
            return;
        }
        
        try {
            // Simple calculator (only basic operations for security)
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
            const result = eval(sanitized);
            
            await this.client.sendMessage(message.from, `🔢 *Calculator*\n\n${expression} = ${result}`);
        } catch (error) {
            await this.client.sendMessage(message.from, '❌ Invalid calculation. Please use basic math operations (+, -, *, /)');
        }
    }
    
    async handleReminder(message, args) {
        if (args.length < 2) {
            await this.client.sendMessage(message.from, '⏰ Usage: !reminder <minutes> <message>\nExample: !reminder 5 Call mom');
            return;
        }
        
        const minutes = parseInt(args[0]);
        const reminderText = args.slice(1).join(' ');
        
        if (isNaN(minutes) || minutes <= 0) {
            await this.client.sendMessage(message.from, '❌ Please provide a valid number of minutes.');
            return;
        }
        
        await this.client.sendMessage(message.from, `⏰ Reminder set for ${minutes} minute(s): "${reminderText}"`);
        
        // Set the reminder
        setTimeout(async () => {
            await this.client.sendMessage(message.from, `🔔 *Reminder*\n\n${reminderText}`);
        }, minutes * 60 * 1000);
    }
    
    async handleInfo(message) {
        const status = this.client.getConnectionStatus();
        const userCount = this.userSessions.size;
        
        const infoText = `
ℹ️ *Smart Bot Information*

🤖 *Bot Status:*
• Version: 1.0.0
• Status: ${status.ready ? 'Online ✅' : 'Offline ❌'}
• Users: ${userCount}

⚡ *Powered by:*
• ChatPulse 2.0
• Node.js
• WhatsApp Web API

🔗 *Features:*
• Smart conversations
• Weather updates
• Calculator
• Reminders
• Jokes & Quotes

Built with ❤️ by DarkSide Developers`;
        
        await this.client.sendMessage(message.from, infoText);
    }
    
    async handleGreeting(message, session) {
        const greetings = [
            "Hello! 👋 How can I help you today?",
            "Hi there! 😊 What can I do for you?",
            "Hey! 🌟 Ready to chat?",
            "Hello! 🤖 I'm here to assist you!"
        ];
        
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        await this.client.sendMessage(message.from, randomGreeting);
        
        if (session.messageCount === 1) {
            setTimeout(async () => {
                await this.client.sendMessage(message.from, "💡 Tip: Type !help to see what I can do!");
            }, 2000);
        }
    }
    
    async handleFirstMessage(message) {
        await this.client.sendMessage(
            message.from,
            "👋 Hi! I'm Smart Bot. Type !start to begin or !help for commands."
        );
    }
    
    async handleButtonResponse(response) {
        switch (response.selectedButtonId) {
            case 'btn_help':
                await this.handleHelp(response);
                break;
            case 'btn_features':
                await this.showFeatures(response.from);
                break;
            case 'btn_about':
                await this.handleInfo(response);
                break;
        }
    }
    
    async showFeatures(chatId) {
        const sections = [
            {
                title: '🎯 General Features',
                rows: [
                    { id: 'feat_help', title: 'Help System', description: 'Get help with commands' },
                    { id: 'feat_info', title: 'Bot Information', description: 'Learn about the bot' }
                ]
            },
            {
                title: '🌟 Fun Features',
                rows: [
                    { id: 'feat_jokes', title: 'Jokes', description: 'Get random jokes' },
                    { id: 'feat_quotes', title: 'Quotes', description: 'Inspirational quotes' }
                ]
            },
            {
                title: '🔧 Utility Features',
                rows: [
                    { id: 'feat_weather', title: 'Weather', description: 'Check weather information' },
                    { id: 'feat_calc', title: 'Calculator', description: 'Perform calculations' },
                    { id: 'feat_reminder', title: 'Reminders', description: 'Set time-based reminders' }
                ]
            }
        ];
        
        await this.client.sendListMessage(
            chatId,
            '🚀 *Smart Bot Features*\n\nExplore what I can do:',
            'Select Feature',
            sections
        );
    }
    
    async start() {
        try {
            console.log('🚀 Starting Smart Bot...');
            await this.client.initialize();
        } catch (error) {
            console.error('❌ Failed to start Smart Bot:', error);
            process.exit(1);
        }
    }
    
    async stop() {
        try {
            console.log('🛑 Stopping Smart Bot...');
            await this.client.disconnect();
        } catch (error) {
            console.error('❌ Error stopping bot:', error);
        }
    }
}

// Run the bot
async function runBot() {
    const bot = new SmartBot();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down Smart Bot...');
        await bot.stop();
        process.exit(0);
    });
    
    await bot.start();
}

if (require.main === module) {
    runBot().catch(console.error);
}

module.exports = SmartBot;