# ChatPulse API Documentation

## Table of Contents

- [Getting Started](#getting-started)
- [Core Classes](#core-classes)
- [Message Handling](#message-handling)
- [Media Operations](#media-operations)
- [Group Management](#group-management)
- [Session Management](#session-management)
- [Error Handling](#error-handling)
- [Utilities](#utilities)

## Getting Started

### Installation

```bash
npm install chatpulse
```

### Basic Usage

```javascript
const { ChatPulse } = require('chatpulse');

const client = new ChatPulse({
    sessionName: 'my-bot',
    headless: true,
    autoReconnect: true
});

client.on('ready', () => {
    console.log('ChatPulse is ready!');
});

client.on('message', (message) => {
    console.log(`Received: ${message.body}`);
});

await client.initialize();
```

## Core Classes

### ChatPulse

Main client class for WhatsApp Web automation.

#### Constructor

```javascript
new ChatPulse(options)
```

**Parameters:**
- `options` (Object): Configuration options
  - `sessionName` (string): Unique session identifier (default: 'default')
  - `headless` (boolean): Run browser in headless mode (default: true)
  - `userDataDir` (string): Custom user data directory (default: './sessions')
  - `autoReconnect` (boolean): Enable automatic reconnection (default: true)
  - `reconnectInterval` (number): Reconnection interval in ms (default: 30000)
  - `language` (string): Interface language (default: 'en')

#### Methods

##### initialize()

Initialize and connect to WhatsApp Web.

```javascript
await client.initialize();
```

**Returns:** `Promise<boolean>` - Connection success status

##### initializeAdvanced(options)

Initialize with advanced connection methods.

```javascript
await client.initializeAdvanced({
    multiDevice: true,
    websocket: true,
    strategy: 'auto'
});
```

**Parameters:**
- `options` (Object): Advanced connection options
  - `multiDevice` (boolean): Enable multi-device support
  - `websocket` (boolean): Enable WebSocket real-time updates
  - `strategy` (string): Connection strategy ('auto', 'qr', 'pairing', 'multidevice')

**Returns:** `Promise<boolean>` - Connection success status

##### sendMessage(chatId, message, options)

Send a text message to a chat.

```javascript
await client.sendMessage('1234567890@c.us', 'Hello World!', {
    linkPreview: false,
    mentions: ['1234567890@c.us']
});
```

**Parameters:**
- `chatId` (string): Target chat ID
- `message` (string): Message content
- `options` (Object): Additional options
  - `linkPreview` (boolean): Enable link preview (default: true)
  - `quotedMessageId` (string): ID of message to quote
  - `mentions` (Array): Array of mentioned contact IDs
  - `ephemeral` (boolean): Send as disappearing message
  - `ephemeralDuration` (number): Duration in seconds

**Returns:** `Promise<Object>` - Message result

##### sendMedia(chatId, media, options)

Send media message.

```javascript
await client.sendMedia('1234567890@c.us', './image.jpg', {
    caption: 'Check this out!',
    asSticker: false
});
```

**Parameters:**
- `chatId` (string): Target chat ID
- `media` (string|Buffer): Media file path or buffer
- `options` (Object): Media options
  - `caption` (string): Media caption
  - `filename` (string): Custom filename
  - `asSticker` (boolean): Send as sticker (images only)
  - `asVoiceNote` (boolean): Send as voice note (audio only)

**Returns:** `Promise<Object>` - Message result

##### getChatInfo(chatId)

Get information about a chat.

```javascript
const chatInfo = await client.getChatInfo('1234567890@c.us');
```

**Parameters:**
- `chatId` (string): Chat identifier

**Returns:** `Promise<Object>` - Chat information

##### getChats()

Get all chats.

```javascript
const chats = await client.getChats();
```

**Returns:** `Promise<Array>` - List of chats

##### disconnect()

Disconnect and cleanup.

```javascript
await client.disconnect();
```

#### Events

##### ready

Emitted when ChatPulse is ready to use.

```javascript
client.on('ready', () => {
    console.log('ChatPulse is ready!');
});
```

##### connected

Emitted when connected to WhatsApp Web.

```javascript
client.on('connected', () => {
    console.log('Connected to WhatsApp Web');
});
```

##### disconnected

Emitted when disconnected from WhatsApp Web.

```javascript
client.on('disconnected', () => {
    console.log('Disconnected from WhatsApp Web');
});
```

##### message

Emitted when a new message is received.

```javascript
client.on('message', (message) => {
    console.log(`Message from ${message.from}: ${message.body}`);
});
```

##### qr_generated

Emitted when QR code is generated.

```javascript
client.on('qr_generated', (qrInfo) => {
    console.log('QR code generated:', qrInfo.formats.png);
});
```

##### error

Emitted when an error occurs.

```javascript
client.on('error', (error) => {
    console.error('Error:', error);
});
```

## Message Handling

### MessageHandler

Handles all message-related operations.

#### Methods

##### sendPoll(chatId, question, options, settings)

Send a poll message.

```javascript
await client.messageHandler.sendPoll(
    '1234567890@c.us',
    'What\'s your favorite color?',
    ['Red', 'Blue', 'Green'],
    { multipleAnswers: false }
);
```

##### sendLocation(chatId, latitude, longitude, options)

Send location message.

```javascript
await client.messageHandler.sendLocation(
    '1234567890@c.us',
    40.7128,
    -74.0060,
    { name: 'New York City' }
);
```

##### sendContact(chatId, contact, options)

Send contact message.

```javascript
await client.messageHandler.sendContact('1234567890@c.us', {
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com'
});
```

##### reactToMessage(messageId, emoji)

React to a message.

```javascript
await client.messageHandler.reactToMessage(messageId, '👍');
```

##### editMessage(messageId, newContent, options)

Edit a message.

```javascript
await client.messageHandler.editMessage(messageId, 'Updated text');
```

##### forwardMessage(messageId, chatIds, options)

Forward a message.

```javascript
await client.messageHandler.forwardMessage(messageId, ['chat1', 'chat2']);
```

##### deleteMessage(messageId, forEveryone)

Delete a message.

```javascript
await client.messageHandler.deleteMessage(messageId, true);
```

## Media Operations

### MediaHandler

Handles media operations.

#### Methods

##### sendSticker(chatId, image, options)

Send sticker from image.

```javascript
await client.mediaHandler.sendSticker('1234567890@c.us', './image.png');
```

##### sendVoiceNote(chatId, audio, options)

Send voice note.

```javascript
await client.mediaHandler.sendVoiceNote('1234567890@c.us', './audio.mp3');
```

##### downloadMedia(message, downloadPath)

Download media from message.

```javascript
const filePath = await client.mediaHandler.downloadMedia(message, './downloads/');
```

##### getMediaInfo(media)

Get media information.

```javascript
const info = await client.mediaHandler.getMediaInfo('./image.jpg');
```

## Group Management

### GroupHandler

Handles group operations.

#### Methods

##### createGroup(name, participants, options)

Create a new group.

```javascript
const group = await client.groupHandler.createGroup(
    'My Group',
    ['1234567890', '0987654321'],
    { description: 'Group description' }
);
```

##### addParticipants(groupId, participants)

Add participants to group.

```javascript
await client.groupHandler.addParticipants(groupId, ['1111111111']);
```

##### removeParticipants(groupId, participants)

Remove participants from group.

```javascript
await client.groupHandler.removeParticipants(groupId, ['1111111111']);
```

##### promoteParticipants(groupId, participants)

Promote participants to admin.

```javascript
await client.groupHandler.promoteParticipants(groupId, ['1234567890']);
```

##### getGroupInviteLink(groupId)

Get group invite link.

```javascript
const inviteLink = await client.groupHandler.getGroupInviteLink(groupId);
```

##### joinGroupByInvite(inviteLink)

Join group by invite link.

```javascript
await client.groupHandler.joinGroupByInvite(inviteLink);
```

## Session Management

### SessionManager

Manages WhatsApp Web sessions.

#### Methods

##### sessionExists()

Check if session exists.

```javascript
const exists = await client.sessionManager.sessionExists();
```

##### createSession()

Create new session.

```javascript
await client.sessionManager.createSession();
```

##### deleteSession()

Delete session.

```javascript
await client.sessionManager.deleteSession();
```

##### saveSessionData(key, data)

Save session data.

```javascript
await client.sessionManager.saveSessionData('key', data);
```

##### loadSessionData(key)

Load session data.

```javascript
const data = await client.sessionManager.loadSessionData('key');
```

## Error Handling

### ErrorHandler

Centralized error handling system.

#### Methods

##### handleError(error, context)

Handle error with recovery strategy.

```javascript
await client.errorHandler.handleError(error, { source: 'client' });
```

##### registerErrorCallback(errorType, callback)

Register error callback.

```javascript
client.errorHandler.registerErrorCallback('CONNECTION_ERROR', (errorInfo) => {
    console.log('Connection error occurred:', errorInfo);
});
```

##### getErrorStats()

Get error statistics.

```javascript
const stats = client.errorHandler.getErrorStats();
```

## Utilities

### ValidationUtils

Input validation utilities.

#### Methods

##### validatePhoneNumber(phoneNumber)

Validate phone number format.

```javascript
const result = ValidationUtils.validatePhoneNumber('1234567890');
```

##### validateChatId(chatId)

Validate chat ID format.

```javascript
const result = ValidationUtils.validateChatId('1234567890@c.us');
```

##### validateMessage(message, options)

Validate message content.

```javascript
const result = ValidationUtils.validateMessage('Hello World');
```

### MessageFormatter

Message formatting utilities.

#### Methods

##### bold(text)

Format text as bold.

```javascript
const formatted = MessageFormatter.bold('Bold text');
```

##### italic(text)

Format text as italic.

```javascript
const formatted = MessageFormatter.italic('Italic text');
```

##### list(items, numbered)

Create a list.

```javascript
const list = MessageFormatter.list(['Item 1', 'Item 2'], true);
```

##### table(headers, rows)

Create a table.

```javascript
const table = MessageFormatter.table(['Name', 'Age'], [['John', '25'], ['Jane', '30']]);
```

### TimeUtils

Time and date utilities.

#### Methods

##### format(date, format, locale)

Format date to string.

```javascript
const formatted = TimeUtils.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
```

##### add(date, amount, unit)

Add time to date.

```javascript
const future = TimeUtils.add(new Date(), 1, 'hour');
```

##### diff(date1, date2, unit)

Get difference between dates.

```javascript
const diff = TimeUtils.diff(date1, date2, 'minutes');
```

## Rate Limiting

### RateLimiter

Rate limiting for API operations.

#### Methods

##### checkLimit(operation, identifier)

Check if operation is allowed.

```javascript
const result = await rateLimiter.checkLimit('message', 'user123');
```

##### consume(operation, identifier)

Consume a rate limit token.

```javascript
const success = await rateLimiter.consume('message', 'user123');
```

##### waitForLimit(operation, identifier, maxWait)

Wait until operation is allowed.

```javascript
const success = await rateLimiter.waitForLimit('message', 'user123', 60000);
```

## Health Monitoring

### HealthMonitor

System health monitoring.

#### Methods

##### getHealthStatus()

Get current health status.

```javascript
const health = client.healthMonitor.getHealthStatus();
```

##### performHealthCheck(checkType)

Perform health check.

```javascript
const result = await client.healthMonitor.performHealthCheck('connection');
```

##### addHealthCheck(name, checkFunction, config)

Add custom health check.

```javascript
client.healthMonitor.addHealthCheck('custom', async () => {
    return { status: 'healthy', message: 'All good' };
});
```

---

For more detailed examples and advanced usage, see the [examples](../examples/) directory.