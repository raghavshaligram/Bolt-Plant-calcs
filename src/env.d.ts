/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Brevo (Sendinblue) transactional/marketing API key. Server-only — never expose to the client. */
  readonly BREVO_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
