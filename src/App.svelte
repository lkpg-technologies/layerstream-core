<script lang="ts">
    import { onMount } from "svelte";
    import { loadConfig, config } from "./lib/stores/config";
    import { watchBundleHash } from "./lib/bundleWatcher";
    import { startHeartbeat } from "./lib/heartbeat";
    import { scheduleDailyReload } from "./lib/dailyReload";
    import { installGlobalErrorHandlers, reportError, scheduleRecoveryReload } from "./lib/stability";
    import CoreV1 from "./lib/versions/1/CoreV1.svelte";

    onMount(() => {
        const cleanups = [
            installGlobalErrorHandlers(),
            startHeartbeat(),
            loadConfig(),
            watchBundleHash(),
            scheduleDailyReload(),
        ];
        return () => cleanups.forEach(cleanup => cleanup());
    });

    function onRenderError(error: unknown) {
        reportError("render", error);
        scheduleRecoveryReload("render error");
    }
</script>

<svelte:boundary onerror={onRenderError}>
    {#if !$config}
        <div class="status-screen">Loading…</div>
    {:else if $config.version === 1}
        <!-- Core V1 -->
        <CoreV1 config={$config} />
    {:else}
        <h1 class="status-screen">Version {$config.version} not supported</h1>
    {/if}

    {#snippet failed()}
        <div class="status-screen">Display error, restarting…</div>
    {/snippet}
</svelte:boundary>
