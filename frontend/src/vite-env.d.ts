/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Backend address without /api, e.g. https://ocula-mu.vercel.app. Unset = same origin.
  readonly VITE_API_URL?: string;
  // 'true' turns the MSW mocks on in dev.
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
