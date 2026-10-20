/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MACHINE_CLIENT_API: string
  readonly VITE_SYMLINK_NAME?: string
  readonly VITE_POLL_TIMEOUT_SECONDS?: string
  readonly VITE_CORE_VERSION?: string
  readonly VITE_NETWORK_CHECK_URL?: string
  // "HH:MM" local time, or "off". Defaults to 03:00
  readonly VITE_DAILY_RELOAD_TIME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
