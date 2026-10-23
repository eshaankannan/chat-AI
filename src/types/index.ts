export interface MessageImage {
  data: string; // base64 string
  mimeType: string;
  name?: string;
  previewUrl?: string;
}

export interface Artifact {
  id: string;
  type: 'html' | 'svg' | 'code' | 'markdown' | 'json';
  title: string;
  language: string;
  content: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  images?: MessageImage[];
  artifacts?: Artifact[];
  isStreaming?: boolean;
  error?: boolean;
  latencyMs?: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  personaId: string;
}

export interface Persona {
  id: string;
  name: string;
  tagline: string;
  description: string;
  systemInstruction: string;
  suggestedPrompts: string[];
  accentColor: string;
  iconName: string;
}

export interface ModelSettings {
  temperature: number;
  thinkingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  customSystemPrompt: string;
  voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  autoSpeak: boolean;
  language: string; // 'auto', 'en', 'ta', 'hi', 'es', etc.
}
