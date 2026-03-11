import { ChatMessage } from '../types';

const BAILIAN_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';
const DEFAULT_MODEL = 'qwen-max';

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  totalTokens?: number;
  timestamp: number;
}

export class BailianChatError extends Error {
  constructor(message: string, public readonly code?: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'BailianChatError';
  }
}

export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
  const apiKey = process.env.EXPO_PUBLIC_BAILIAN_API_KEY;
  if (!apiKey) throw new BailianChatError('缺少 EXPO_PUBLIC_BAILIAN_API_KEY', 'MISSING_API_KEY');

  const requestMessages = options.systemPrompt && !messages.some((m) => m.role === 'system')
    ? [{ role: 'system', content: options.systemPrompt } as ChatMessage, ...messages]
    : messages;

  const body = {
    model: options.model || DEFAULT_MODEL,
    input: { messages: requestMessages },
    parameters: {
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      result_format: 'message',
    },
  };

  let response: Response;
  try {
    response = await fetch(`${BAILIAN_BASE_URL}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    throw new BailianChatError(e?.message || '网络错误', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    const t = await response.text();
    throw new BailianChatError(t || `HTTP ${response.status}`, 'API_ERROR', response.status);
  }

  const data: any = await response.json();
  const output = data?.output;
  const content = output?.choices?.[0]?.message?.content || output?.choices?.[0]?.text || output?.text || '';
  return {
    content: String(content).trim(),
    model: output?.model || body.model,
    totalTokens: data?.usage?.total_tokens,
    timestamp: Date.now(),
  };
}
