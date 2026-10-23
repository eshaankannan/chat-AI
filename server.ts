import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In AI Studio / Cloud Run, Nginx reverse proxy listens on 8080 and forwards to 3000.
// We must always listen on port 3000 or the designated app port, never 8080.
function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed !== 8080) return parsed;
  }
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  if (envPort === 8080) return 3000;
  return isNaN(envPort) ? 3000 : envPort;
}
const PORT = resolvePort();

// Body parsers with larger limit for base64 image uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Shared Gemini client setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health & Model Info
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    model: 'gemini-3.8-flash',
    ttsModel: 'gemini-3.8-flash-lite-tts',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Streaming Chat API
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  const { messages, systemInstruction, temperature, thinkingLevel, language } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Valid messages array is required' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured in server environment. Please ensure it is present in .env.',
    });
    return;
  }

  // Format messages for @google/genai SDK
  const contents = messages.map((msg: any) => {
    const parts: any[] = [];

    // Support image attachments
    if (msg.images && Array.isArray(msg.images)) {
      for (const img of msg.images) {
        if (img.data && img.mimeType) {
          // Strip prefix if included
          const cleanBase64 = img.data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: cleanBase64,
            },
          });
        }
      }
    }

    parts.push({ text: msg.text || (parts.length === 0 ? 'Hello' : '') });

    return {
      role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const config: any = {};
  const langDirective = language && language !== 'auto'
    ? `Target Language: You must respond primarily in ${language}. Ensure flawless native grammar, spelling, and authentic vocabulary.`
    : `Universal Language Auto-Detection: Automatically detect the language of the user's message (e.g. English, Tamil, Hindi, Spanish, French, German, Japanese, Chinese, Arabic, Telugu, Malayalam, Bengali, Portuguese, Russian, Italian, etc.) and respond fluently in that exact same language! You are natively fluent in EVERY language in the world.`;

  const corePersonaGuideline = `Identity & Dynamic Multilingual Persona:
You are Chat AI, an exceptionally intelligent, perceptive, and trend-aware AI partner with native-level fluency in EVERY language in the world.

UNIVERSAL MULTILINGUAL MASTERY:
- ${langDirective}
- Maintain natural native idioms, accurate spelling, cultural resonance, and authentic conversational cadence in whatever language the user speaks, writes, or requests.
- Never restrict yourself to English if the user communicates or asks to communicate in another language.

HOW TO COMMUNICATE ("BE LIKE A REAL HUMAN EXPERT"):
1. DO NOT ONLY GIVE CODE:
   - Understand the user's intent. If they ask about trends, opinions, advice, ideas, or casual conversation, answer with rich conversational insight, wit, and real-world perspective.
   - NEVER force code blocks or technical snippets unless the user actually asks for code, implementation, or a functional prototype.
   - Do NOT use rigid, mechanical templates. Instead, write in fluid, natural, well-crafted prose with intuitive paragraphs.

2. RIDE THE TREND ("Go for the trend"):
   - Be deeply tapped into what is trending right now across tech, design, AI, social media (Twitter/X, Reddit, Hacker News, YouTube), startup culture, and digital aesthetics.
   - Share authentic community pulse: what top builders are hyping, what experienced developers are ranting about, and what the real cultural consensus is.
   - Give bold, honest opinions: call out what is overhyped, celebrate what is genuinely revolutionary, and offer pragmatic trade-offs.

3. WRITE & SPEAK LIKE YOU:
   - Speak with personality, warmth, confidence, and edge. Avoid robotic corporate fluff or generic "As an AI" disclaimers.
   - Treat the user as a respected collaborator. Be punchy, engaging, thought-provoking, and deeply skilled.
   - When code IS requested, make it clean, modern, idiomatic, and production-ready without unnecessary bloat.`;

  if (systemInstruction && typeof systemInstruction === 'string' && systemInstruction.trim()) {
    config.systemInstruction = `${systemInstruction.trim()}\n\n${corePersonaGuideline}`;
  } else {
    config.systemInstruction = corePersonaGuideline;
  }

  if (typeof temperature === 'number') {
    config.temperature = Math.max(0, Math.min(2, temperature));
  }

  if (thinkingLevel) {
    if (thinkingLevel === 'LOW') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    } else if (thinkingLevel === 'MEDIUM') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.MEDIUM };
    } else if (thinkingLevel === 'HIGH') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];

  for (const modelName of candidateModels) {
    let hasWrittenChunk = false;
    try {
      // Clone config and only attach thinkingConfig for Gemini 3 series
      const modelConfig = { ...config };
      if (!modelName.startsWith('gemini-3') && modelConfig.thinkingConfig) {
        delete modelConfig.thinkingConfig;
      }

      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: modelConfig,
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          hasWrittenChunk = true;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
          (res as any).flush?.();
        }
      }

      res.write(`data: [DONE]\n\n`);
      (res as any).flush?.();
      res.end();
      return;
    } catch (err: any) {
      console.warn(`Attempt with ${modelName} encountered error:`, err?.message || err);
      // If chunks were already written to client, do not restart with another model
      if (hasWrittenChunk || modelName === candidateModels[candidateModels.length - 1]) {
        const errorMessage = err?.message || 'Error communicating with Gemini model';
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
      }
    }
  }
});

// Audio TTS Endpoint
app.post('/api/tts', async (req: Request, res: Response) => {
  const { text, voice } = req.body;

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text is required for TTS' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  try {
    // Truncate to reasonable TTS size
    const cleanText = text.replace(/[*_#`~>\[\]]/g, '').slice(0, 600);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Natural, warm, engaging AI assistant voice',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } else {
      res.status(500).json({ error: 'No audio returned from model' });
    }
  } catch (err: any) {
    console.error('Gemini TTS Error:', err);
    res.status(500).json({ error: err.message || 'TTS generation failed' });
  }
});

// Audio Speech-to-Text Transcription via Gemini AI
app.post('/api/transcribe', async (req: Request, res: Response) => {
  const { audioBase64, mimeType } = req.body;

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    res.status(400).json({ error: 'Audio data is required' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9+.-]+;base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe this user voice audio recording accurately into text. Support and auto-detect ANY language spoken in the world (English, Tamil, Hindi, Spanish, French, Japanese, Arabic, German, Russian, Portuguese, Telugu, Bengali, etc.). Return only the exact words spoken in the correct script and language. If there is only background silence, static, or no speech detected, return an empty string.',
          },
        ],
      },
    });

    const transcript = response.text?.trim() || '';
    res.json({ transcript });
  } catch (err: any) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

// Real-Time Voice Chat Conversational Endpoint
app.post('/api/voice/chat', async (req: Request, res: Response) => {
  const { messages, voice, personaInstruction, language } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  const voiceLangDirective = language && language !== 'auto'
    ? `Speak primarily in ${language}. Ensure native pronunciation, natural cadence, and vocabulary.`
    : `Automatically detect whichever language the user speaks (English, Tamil, Hindi, Spanish, French, Japanese, Arabic, German, Russian, etc.) and speak back to them in that EXACT same language! You are natively fluent in every world language.`;

  const voiceSystemInstruction = `You are Chat AI, an articulate, multilingual AI partner in a live voice conversation.
UNIVERSAL MULTILINGUAL VOICE:
- ${voiceLangDirective}
- Maintain native pronunciation-friendly phrasing, correct grammar, and authentic conversational cadence in any language.
- Speak naturally, warmly, and conversationally like an authentic, intelligent human collaborator.
- If the user asks about trends, ideas, opinions, or casual topics, talk to them naturally. Do NOT force code.
- Keep spoken answers punchy, vivid, and conversational (typically 2 to 4 spoken sentences, under 60 words) so voice chat feels like talking to a brilliant friend.
- NEVER use markdown symbols like asterisks (*, **), hashtags (#), bullet points, or code blocks, because your text will be read aloud by speech synthesis.
${personaInstruction ? `Persona style: ${personaInstruction}` : ''}`;

  const contents = messages.map((m: any) => ({
    role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text || ' ' }],
  }));

  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
  ];

  let replyText = '';

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: voiceSystemInstruction,
          temperature: 0.7,
        },
      });
      replyText = response.text?.trim() || '';
      if (replyText) break;
    } catch (err: any) {
      console.warn(`Voice chat generation failed on ${modelName}:`, err?.message || err);
    }
  }

  if (!replyText) {
    res.status(500).json({ error: 'Failed to generate voice response' });
    return;
  }

  // Generate TTS Audio with fallback
  try {
    const cleanSpeechText = replyText.replace(/[*_#`~>\[\]]/g, '').slice(0, 500);
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanSpeechText,
              speechMetadata: {
                style: 'Natural, warm, engaging conversational assistant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({
      text: replyText,
      audioBase64: audioBase64 || null,
      mimeType: 'audio/wav',
    });
  } catch (ttsErr: any) {
    console.warn('Voice chat TTS generation fallback to text only:', ttsErr?.message);
    res.json({
      text: replyText,
      audioBase64: null,
    });
  }
});

// Title generation for conversation
app.post('/api/chat/title', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    res.json({ title: 'New Conversation' });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a short 3 to 5 word conversation title summarizing this initial user query: "${prompt.slice(0, 200)}". Do not include quotes, periods, or bullet points. Just the clean title.`,
      config: {
        temperature: 0.3,
      },
    });
    const title = response.text?.trim()?.replace(/["\n\r]/g, '') || 'New Conversation';
    res.json({ title });
  } catch {
    res.json({ title: prompt.slice(0, 30) });
  }
});

// Initialize server with Vite middleware in dev or static files in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} is temporarily in use. Waiting to retry...`);
      setTimeout(() => {
        try { server.close(); } catch {}
        app.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
