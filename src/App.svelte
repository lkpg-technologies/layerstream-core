<script lang="ts">
    import { onMount } from "svelte";
    import Page from "./lib/Page.svelte";
    import { pages, loadConfig, config } from "./lib/stores/config";
    import { writable } from "svelte/store";
    import Network from "./lib/utils/network";


    function getCurrentPage(pages: any[], now = Date.now()) {

        if (pages[0] && pages[0]?.duration <= 0) {
            return 0;
        }

        const timeline = pages.map((page) => ({
            ...page,
            durationMs: page.duration * 1000,
        }));
        const cycleLength = timeline.reduce(
            (sum, page) => sum + page.durationMs,
            0,
        );
        const position = now % cycleLength;

        let cursor = 0;
        for (let i = 0; i < timeline.length; i++) {
            cursor += timeline[i].durationMs;
            if (position < cursor) {
                return i;
            }
        }
    }


    let currentIndex = getCurrentPage($pages);

    function tick() {
        const newIndex = getCurrentPage($pages);

        if (newIndex !== currentIndex) {
            currentIndex = newIndex;
        }

        const now = new Date();
        const next = 1000 - now.getMilliseconds();

        setTimeout(tick, next);
    }
    
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

    let currentBundleHash = "";

    onMount(() => {
        tick();
        pollForNewHash();
        loadConfig();
    });

    const netOnline = writable(false);
    
    config.subscribe(async (conf) => {
        if (conf && conf.networkRequired) {
            Network.ping((res: boolean) => {
                netOnline.set(res)
            });
        }
    })

    const dots = writable("");
    const dotsInterval = setInterval(() => {
        if ($dots.length < 3) {
            dots.set($dots + '.')
        } else {
            dots.set("")
        }
    }, 1000)

    netOnline.subscribe(online => {
        if (online) {
            clearInterval(dotsInterval);
        }
    })
</script>


{#each $pages as page, i}
    {#if ($config.networkRequired && $netOnline) || !$config.networkRequired}
        <div class="page {i === currentIndex ? 'active' : ''}">
            <Page page={ page }></Page>
        </div>
    {:else}
        <div class="page active no-network-page">
            <h1>Waiting for network{ $dots }</h1>
        </div>
    {/if}
{/each}

<style>
    .page {
        display: none;
    }

    .page.active {
        display: block;
    }

    .page.active.no-network-page {
        background-color: #333;
        color: white;
        font-family: Arial, Helvetica, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
