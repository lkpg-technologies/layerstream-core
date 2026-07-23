<script lang="ts">
    import { onMount } from "svelte";
    import { loadConfig, config } from "./lib/stores/config";
    import LegacyCore from "./lib/versions/legacy/LegacyCore.svelte";
    import CoreV1 from "./lib/versions/1/CoreV1.svelte";

    let currentBundleHash = "";
    function pollForNewHash() {
        fetch(`${import.meta.env.VITE_MACHINE_CLIENT_API}/v1/bundles/current/hash`).then(res => {
            res
                .json()
                .then(obj => {
                    if (currentBundleHash && (currentBundleHash !== obj.bundle_hash)) {
                        currentBundleHash = obj.bundle_hash;
                        
                        // "Hard" refresh
                        window.location.href = window.location.pathname + "?v=" + Date.now();
                    } else if (currentBundleHash !== obj.bundle_hash) {
                        currentBundleHash = obj.bundle_hash;
                    }
                });
        });
        
        setTimeout(pollForNewHash, (import.meta.env.VITE_POLL_TIMEOUT_SECONDS ?? 5) * 1000)
    }

    onMount(() => {
        loadConfig();
        pollForNewHash();
    });

    function getVersion(config: any) {
        console.info(`Version: ${config?.version || "Legacy"}`)
        return config?.version
    }

</script>

{#if getVersion($config) == 1}
    <!-- Core V1 -->
    <CoreV1 />
{:else}
    <!-- Legacy Core -->
    <LegacyCore />
{/if}