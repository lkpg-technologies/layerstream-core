<script lang="ts">
    import { onMount } from "svelte";
    import LegacyPage from "./Page.svelte";
    import { loadConfig, config } from "../../stores/config";
    import { writable } from "svelte/store";
    import Network from "./utils/network";

    function getCurrentPage(pages: any[], now = Date.now()) {

        if (pages === undefined) {
            return;
        }

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

    let currentIndex = getCurrentPage($config?.pages);

    function tick() {
        const newIndex = getCurrentPage($config?.pages);

        if (newIndex !== currentIndex) {
            currentIndex = newIndex;
        }

        const now = new Date();
        const next = 1000 - now.getMilliseconds();

        setTimeout(tick, next);
    }
    tick();

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

{#each $config?.pages as page, i}
    {#if ($config.networkRequired && $netOnline) || !$config.networkRequired}
        <div class="page {i === currentIndex ? 'active' : ''}">
            <LegacyPage page={ page }></LegacyPage>
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
