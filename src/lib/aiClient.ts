/**
 * 多厂商 AI 调用：OpenAI / Anthropic / Google / DeepSeek。
 * 使用 .env.local 中的 NEXT_PUBLIC_*_API_KEY，解卦时可选择模型。
 */
import { parseModelId, type AIProvider } from './aiModels';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

function getOpenAIKey(): string | undefined {
  return (import.meta.env as Record<string, unknown>).NEXT_PUBLIC_OPENAI_API_KEY as string | undefined;
}
function getAnthropicKey(): string | undefined {
  return (import.meta.env as Record<string, unknown>).NEXT_PUBLIC_ANTHROPIC_API_KEY as string | undefined;
}
function getGoogleKey(): string | undefined {
  return (import.meta.env as Record<string, unknown>).NEXT_PUBLIC_GOOGLE_API_KEY as string | undefined;
}
function getDeepSeekKey(): string | undefined {
  return (import.meta.env as Record<string, unknown>).NEXT_PUBLIC_DEEPSEEK_API_KEY as string | undefined;
}

function getApiKey(provider: AIProvider): string | undefined {
  switch (provider) {
    case 'openai': return getOpenAIKey();
    case 'anthropic': return getAnthropicKey();
    case 'google': return getGoogleKey();
    case 'deepseek': return getDeepSeekKey();
    default: return undefined;
  }
}

/** 是否有任意一家厂商的 API Key（兼容旧调用方） */
export function hasAIProvider(): boolean {
  return !!(getOpenAIKey()?.trim() || getAnthropicKey()?.trim() || getGoogleKey()?.trim() || getDeepSeekKey()?.trim());
}

/** 指定 modelId 时是否可用（该厂商已配置 key） */
export function isModelAvailable(modelId: string): boolean {
  const parsed = parseModelId(modelId);
  if (!parsed) return false;
  return !!getApiKey(parsed.provider)?.trim();
}

/**
 * 调用 LLM，返回助手回复正文。
 * modelId 格式：openai:gpt-4o | anthropic:claude-3-5-sonnet-20241022 | google:gemini-1.5-pro
 */
export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  modelId?: string
): Promise<string | null> {
  const parsed = modelId ? parseModelId(modelId) : null;
  const provider: AIProvider = parsed?.provider ?? 'openai';
  const model = parsed?.model ?? 'gpt-4o-mini';
  const apiKey = getApiKey(provider);
  if (!apiKey?.trim()) return null;

  try {
    if (provider === 'openai') {
      const res = await fetch(OPENAI_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('OpenAI API error', res.status, err);
        throw new Error(res.status === 401 ? 'API Key 无效' : `API 错误: ${res.status}`);
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content.trim() : null;
    }

    if (provider === 'anthropic') {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Anthropic API error', res.status, err);
        throw new Error(res.status === 401 ? 'API Key 无效' : `API 错误: ${res.status}`);
      }
      const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = data.content?.find((c) => c.type === 'text')?.text;
      return typeof text === 'string' ? text.trim() : null;
    }

    if (provider === 'google') {
      const url = `${GOOGLE_API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 8192 },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Google API error', res.status, err);
        throw new Error(res.status === 401 ? 'API Key 无效' : `API 错误: ${res.status}`);
      }
      const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === 'string' ? text.trim() : null;
    }

    if (provider === 'deepseek') {
      const res = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 8192,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('DeepSeek API error', res.status, err);
        throw new Error(res.status === 401 ? 'API Key 无效' : `API 错误: ${res.status}`);
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content.trim() : null;
    }
  } catch (e) {
    console.error('callLLM error', e);
    throw e;
  }
  return null;
}

/**
 * 流式调用 LLM，每收到一段内容就调用 onDelta(当前已累积的全文)。
 * modelId 同 callLLM。
 */
export async function streamLLM(
  systemPrompt: string,
  userMessage: string,
  onDelta: (fullText: string) => void,
  modelId?: string
): Promise<string> {
  const parsed = modelId ? parseModelId(modelId) : null;
  const provider: AIProvider = parsed?.provider ?? 'openai';
  const model = parsed?.model ?? 'gpt-4o-mini';
  const apiKey = getApiKey(provider);
  if (!apiKey?.trim()) throw new Error('未配置对应厂商的 API Key');

  if (provider === 'openai') {
    const res = await fetch(OPENAI_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) {
      await res.text();
      throw new Error(res.status === 401 ? 'API Key 无效' : `API 错误: ${res.status}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const json = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = json.choices?.[0]?.delta?.content;
            if (typeof content === 'string') {
              fullText += content;
              onDelta(fullText);
            }
          } catch {
            // ignore
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return fullText;
  }

  if (provider === 'anthropic') {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) {
      await res.text();
      throw new Error(res.status === 401 ? 'API Key 无效' : `API 错误: ${res.status}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const raw = line.slice(6);
            if (raw === '[DONE]') continue;
            const json = JSON.parse(raw) as { type?: string; delta?: { type?: string; text?: string } };
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta' && typeof json.delta.text === 'string') {
              fullText += json.delta.text;
              onDelta(fullText);
            }
          } catch {
            // ignore
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return fullText;
  }

  if (provider === 'google') {
    const url = `${GOOGLE_API_BASE}/${model}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 8192 },
      }),
    });
    if (!res.ok) {
      await res.text();
      throw new Error(res.status === 401 ? 'API Key 无效' : `API 错误: ${res.status}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const raw = line.slice(6).trim();
            if (!raw) continue;
            const json = JSON.parse(raw) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof text === 'string') {
              fullText += text;
              onDelta(fullText);
            }
          } catch {
            // ignore
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return fullText;
  }

  if (provider === 'deepseek') {
    const res = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      await res.text();
      throw new Error(res.status === 401 ? 'API Key 无效' : `API 错误: ${res.status}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const json = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = json.choices?.[0]?.delta?.content;
            if (typeof content === 'string') {
              fullText += content;
              onDelta(fullText);
            }
          } catch {
            // ignore
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return fullText;
  }

  throw new Error('不支持的模型: ' + modelId);
}
