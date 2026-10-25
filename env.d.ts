/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sync server for multi-device games (ADR 0006); without it the app runs on one computer only. */
  readonly VITE_SYNC_URL?: string
}
