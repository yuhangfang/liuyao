/**
 * 解卦可用 AI 模型配置：每家厂商选用当前最先进的模型。
 * 需在 .env.local 配置对应 NEXT_PUBLIC_*_API_KEY 方可使用。
 */
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'deepseek';

export interface AIModelOption {
  id: string;
  provider: AIProvider;
  name: string;
  description?: string;
}

/** 可选模型列表：各厂旗舰 + 性价比型号（按当前公开 API 最优型号） */
export const AI_MODEL_OPTIONS: AIModelOption[] = [
  { id: 'openai:gpt-4o', provider: 'openai', name: 'GPT-4o', description: 'OpenAI 旗舰' },
  { id: 'openai:gpt-4o-mini', provider: 'openai', name: 'GPT-4o mini', description: 'OpenAI 轻量' },
  { id: 'anthropic:claude-opus-4-6', provider: 'anthropic', name: 'Claude Opus 4.6', description: 'Anthropic 最强' },
  { id: 'anthropic:claude-sonnet-4-6', provider: 'anthropic', name: 'Claude Sonnet 4.6', description: 'Anthropic 均衡' },
  { id: 'google:gemini-2.5-pro', provider: 'google', name: 'Gemini 2.5 Pro', description: 'Google 推理旗舰' },
  { id: 'google:gemini-2.5-flash', provider: 'google', name: 'Gemini 2.5 Flash', description: 'Google 高效' },
  { id: 'deepseek:deepseek-reasoner', provider: 'deepseek', name: 'DeepSeek Reasoner', description: 'DeepSeek 推理' },
  { id: 'deepseek:deepseek-chat', provider: 'deepseek', name: 'DeepSeek Chat', description: 'DeepSeek 对话' },
];

const ENV_KEYS: Record<AIProvider, string> = {
  openai: 'NEXT_PUBLIC_OPENAI_API_KEY',
  anthropic: 'NEXT_PUBLIC_ANTHROPIC_API_KEY',
  google: 'NEXT_PUBLIC_GOOGLE_API_KEY',
  deepseek: 'NEXT_PUBLIC_DEEPSEEK_API_KEY',
};

function getEnvKey(provider: AIProvider): string | undefined {
  const key = ENV_KEYS[provider];
  return (import.meta.env as Record<string, unknown>)[key] as string | undefined;
}

/** 解析 modelId，如 "openai:gpt-4o" -> { provider: 'openai', model: 'gpt-4o' } */
export function parseModelId(modelId: string): { provider: AIProvider; model: string } | null {
  const i = modelId.indexOf(':');
  if (i <= 0 || i === modelId.length - 1) return null;
  const provider = modelId.slice(0, i) as AIProvider;
  const model = modelId.slice(i + 1);
  if (!['openai', 'anthropic', 'google', 'deepseek'].includes(provider) || !model) return null;
  return { provider, model };
}

/** 当前已配置 API Key 的模型（用于下拉只显示可用的） */
export function getAvailableModelOptions(): AIModelOption[] {
  return AI_MODEL_OPTIONS.filter((opt) => {
    const key = getEnvKey(opt.provider);
    return !!key?.trim();
  });
}

/** 是否有任意一家厂商的 API Key */
export function hasAnyAIProvider(): boolean {
  return AI_MODEL_OPTIONS.some((opt) => getEnvKey(opt.provider)?.trim());
}

/** 默认推荐模型：第一个有 key 的厂商的旗舰 */
export function getDefaultModelId(): string {
  const available = getAvailableModelOptions();
  const preferred = available.find((o) => o.id === 'openai:gpt-4o')
    ?? available.find((o) => o.id === 'anthropic:claude-opus-4-6')
    ?? available.find((o) => o.id === 'google:gemini-2.5-pro')
    ?? available.find((o) => o.id === 'deepseek:deepseek-reasoner');
  return preferred?.id ?? available[0]?.id ?? AI_MODEL_OPTIONS[0].id;
}
