<script lang="ts">
    import { onMount } from "svelte";
    import PageV1 from "./PageV1.svelte";
    import type { ConfigV1 } from "./types";
    import { getActiveScreenId, getUpcomingScreenId, msUntilNextSecond } from "../../schedule";
    import { logError } from "../../utils";

    // The upcoming screen is mounted invisibly this long before it is shown,
    // so its iframes have loaded by the time it appears
    //
    // Keeping this for now, TODO: Check so that video still starts on page-change and not 5 seconds before (when video is added) - Ludvig
    const PRELOAD_MS = 5_000;

    const { config }: { config: ConfigV1 } = $props();

    let currentScreen = $state<string>();
    let nextScreen = $state<string>();
    const mountedScreens = $derived(
        [currentScreen, nextScreen].filter((id, i, ids): id is string => id !== undefined && ids.indexOf(id) === i)
    );

    function updateCurrentScreen(): void {
        const screens = config.screenOrder.map(id => config.screens[id]);
        const now = Date.now();
        const id = getActiveScreenId(screens, now);
        if (id !== undefined && id !== currentScreen) {
            currentScreen = id;
        }
        nextScreen = getUpcomingScreenId(screens, PRELOAD_MS, now);
    }

    onMount(() => {
        let timer: ReturnType<typeof setTimeout>;
        function tick() {
            try {
                updateCurrentScreen();
            } catch (error) {
                logError("scheduler", error);
            } finally {
                // Always reschedule, an error must never stop the rotation
                timer = setTimeout(tick, msUntilNextSecond());
            }
        }
        tick();
        return () => clearTimeout(timer);
    });
</script>


{#if currentScreen}
    <!-- Keyed by screen id, so the preloaded screen is shown without remounting it,
         and each screen gets a fresh boundary when it is mounted again -->
    {#each mountedScreens as id (id)}
        <div class="screen-slot" class:preloading={id !== currentScreen}>
            <svelte:boundary onerror={(error) => logError(`screen ${id}`, error)}>
                <PageV1 screen={config.screens[id]}/>
            </svelte:boundary>
        </div>
    {/each}
{:else}
    No active bundle
{/if}

<style>
    .screen-slot {
        position: absolute;
        inset: 0;
    }

    /* visibility (not display: none) so iframes still load and lay out */
    .screen-slot.preloading {
        visibility: hidden;
        pointer-events: none;
    }
</style>
