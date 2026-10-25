/** Sync server URL from the build (`VITE_SYNC_URL`); `null` = only the one-computer mode is offered. */
export const syncServerUrl: string | null = import.meta.env.VITE_SYNC_URL || null
