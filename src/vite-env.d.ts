/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** Injected by vite.config.ts `define`. */
declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
