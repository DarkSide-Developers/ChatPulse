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
 * Help Plugin - Provides command help and information
 * Shows available commands and their usage
 */
class HelpPlugin {
    constructor(client) {
        this.client = client;
        this.name = 'help';
        this.version = '1.0.0';
        this.description = 'Provides help and command information';
        this.author = 'DarkWinzo';
        
        this.commands = [
            {
                name: 'help',
                description: 'Show available commands',
                usage: '!help [command]',
                aliases: ['h', 'commands'],
                handler: this.handleHelp
            },
            {
                name: 'about',
                description: 'Show bot information',
                usage: '!about',
                handler: this.handleAbout
            }
        ];
    }
    
    async handleHelp(context) {
        const { args, reply } = context;
        const commandName = args[0];
        
        if (commandName) {
            // Show specific command help
            await this.showCommandHelp(commandName, reply);
        } else {
            // Show all commands
            await this.showAllCommands(reply);
        }
    }
    
    async handleAbout(context) {
        const { reply } = context;
        
        const aboutText = `
🤖 *ChatPulse Bot*

📋 *Information:*
• Version: 1.0.0
• Developer: DarkWinzo
• Organization: DarkSide Developer Team
• Repository: github.com/DarkSide-Developers/ChatPulse

🔧 *Features:*
• Advanced WhatsApp Web API
• Plugin-based architecture
• Multi-session support
• Secure session management
• Rich message types
• Media processing

📞 *Support:*
• Email: isurulakshan9998@gmail.com
• GitHub: github.com/DarkSide-Developers/ChatPulse

© 2025 DarkSide Developer Team. All rights reserved.
        `.trim();
        
        await reply(aboutText);
    }
    
    async showAllCommands(reply) {
        const commands = this.client.pluginManager.getAvailableCommands();
        
        if (commands.length === 0) {
            await reply('❌ No commands available.');
            return;
        }
        
        // Group commands by plugin
        const commandsByPlugin = {};
        commands.forEach(cmd => {
            if (!commandsByPlugin[cmd.plugin]) {
                commandsByPlugin[cmd.plugin] = [];
            }
            commandsByPlugin[cmd.plugin].push(cmd);
        });
        
        let helpText = '🤖 *Available Commands*\n\n';
        
        for (const [plugin, pluginCommands] of Object.entries(commandsByPlugin)) {
            helpText += `📦 *${plugin.charAt(0).toUpperCase() + plugin.slice(1)} Plugin:*\n`;
            
            pluginCommands.forEach(cmd => {
                helpText += `• \`${cmd.usage}\` - ${cmd.description}\n`;
                if (cmd.aliases && cmd.aliases.length > 0) {
                    helpText += `  _Aliases: ${cmd.aliases.join(', ')}_\n`;
                }
            });
            
            helpText += '\n';
        }
        
        helpText += '💡 *Tip:* Use `!help <command>` for detailed information about a specific command.';
        
        await reply(helpText);
    }
    
    async showCommandHelp(commandName, reply) {
        const commands = this.client.pluginManager.getAvailableCommands();
        const command = commands.find(cmd => 
            cmd.name === commandName || 
            (cmd.aliases && cmd.aliases.includes(commandName))
        );
        
        if (!command) {
            await reply(`❌ Command '${commandName}' not found. Use \`!help\` to see all available commands.`);
            return;
        }
        
        let helpText = `📋 *Command: ${command.name}*\n\n`;
        helpText += `📝 *Description:* ${command.description}\n`;
        helpText += `💻 *Usage:* \`${command.usage}\`\n`;
        helpText += `🔌 *Plugin:* ${command.plugin}\n`;
        
        if (command.aliases && command.aliases.length > 0) {
            helpText += `🔗 *Aliases:* ${command.aliases.join(', ')}\n`;
        }
        
        await reply(helpText);
    }
    
    async initialize() {
        console.log('Help plugin initialized');
    }
}

module.exports = HelpPlugin;