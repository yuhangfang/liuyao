/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_OPENAI_API_KEY?: string
  readonly NEXT_PUBLIC_ANTHROPIC_API_KEY?: string
  readonly NEXT_PUBLIC_GOOGLE_API_KEY?: string
  readonly NEXT_PUBLIC_DEEPSEEK_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
