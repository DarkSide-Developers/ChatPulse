/**
 * ChatPulse TypeScript Definitions
 */

declare module 'chatpulse' {
  import { EventEmitter } from 'events';

  export interface ChatPulseOptions {
    sessionName?: string;
    authStrategy?: 'qr' | 'pairing' | 'phone_number' | 'email';
    autoReconnect?: boolean;
    maxReconnectAttempts?: number;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    qrCodeOptions?: {
      terminal?: boolean;
      save?: boolean;
      format?: 'png' | 'svg';
      size?: 'small' | 'medium' | 'large';
    };
  }

  export interface Message {
    id: string;
    from: string;
    body: string;
    timestamp: number;
    isFromMe: boolean;
    type: string;
    hasMedia: boolean;
    mentionedJidList: string[];
    quotedMsg?: Message;
  }

  export interface ConnectionStatus {
    connected: boolean;
    authenticated: boolean;
    ready: boolean;
    state: string;
    reconnectAttempts: number;
  }

  export interface Button {
    id: string;
    text: string;
    type?: string;
  }

  export interface ListSection {
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }

  export interface Contact {
    name: string;
    number: string;
    organization?: string;
    email?: string;
  }

  export class ChatPulse extends EventEmitter {
    constructor(options?: ChatPulseOptions);
    
    initialize(): Promise<void>;
    disconnect(): Promise<void>;
    
    sendMessage(chatId: string, message: string, options?: any): Promise<any>;
    sendButtonMessage(chatId: string, text: string, buttons: Button[], options?: any): Promise<any>;
    sendListMessage(chatId: string, text: string, buttonText: string, sections: ListSection[], options?: any): Promise<any>;
    sendContact(chatId: string, contact: Contact, options?: any): Promise<any>;
    sendLocation(chatId: string, latitude: number, longitude: number, description?: string, options?: any): Promise<any>;
    sendPoll(chatId: string, question: string, options: string[], settings?: any): Promise<any>;
    
    getConnectionStatus(): ConnectionStatus;
    getQRCode(format?: string): Promise<string>;
    
    get isReady(): boolean;
    get isConnected(): boolean;
    get isAuthenticated(): boolean;
    
    // Events
    on(event: 'ready', listener: () => void): this;
    on(event: 'qr_generated', listener: (qrInfo: any) => void): this;
    on(event: 'authenticated', listener: (authData?: any) => void): this;
    on(event: 'message', listener: (message: Message) => void): this;
    on(event: 'button_response', listener: (response: any) => void): this;
    on(event: 'list_response', listener: (response: any) => void): this;
    on(event: 'connected', listener: () => void): this;
    on(event: 'disconnected', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export const MessageTypes: {
    TEXT: 'text';
    IMAGE: 'image';
    VIDEO: 'video';
    AUDIO: 'audio';
    DOCUMENT: 'document';
    STICKER: 'sticker';
    LOCATION: 'location';
    CONTACT: 'contact';
    POLL: 'poll';
    BUTTON: 'button';
    LIST: 'list';
  };

  export const ChatTypes: {
    INDIVIDUAL: 'individual';
    GROUP: 'group';
    BROADCAST: 'broadcast';
  };

  export const AuthStrategies: {
    QR: 'qr';
    PAIRING: 'pairing';
    PHONE_NUMBER: 'phone_number';
    EMAIL: 'email';
  };
}