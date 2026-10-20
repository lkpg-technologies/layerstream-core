/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MACHINE_CLIENT_API: string
  readonly VITE_SYMLINK_NAME?: string
  readonly VITE_POLL_TIMEOUT_SECONDS?: string
  readonly VITE_CORE_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
