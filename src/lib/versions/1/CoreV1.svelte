<script lang="ts">
    import { onMount } from "svelte";
    import PageV1 from "./PageV1.svelte";
    import type { ConfigV1 } from "./types";
    import { getScreenTiming, getUpcomingScreenId, msUntilNextSecond } from "../../util/schedule";
    import { logError } from "../../util/utils";

    // The upcoming screen is mounted invisibly this long before it is shown,
    // so its media and iframes can load before it appears. Videos wait until active.
    const PRELOAD_MS = 5_000;

    const { config }: { config: ConfigV1 } = $props();

    let currentScreen = $state<string>();
    let nextScreen = $state<string>();
    const mountedScreens = $derived(
        [currentScreen, nextScreen].filter((id, i, ids): id is string => id !== undefined && ids.indexOf(id) === i)
    );

    // An event-driven playlist cannot use fixed wall-clock slots.
    const sequential = $derived(config.screenOrder.some(id => config.screens[id].playbackMode === "video-end"));
    let position = -1;
    let startedAt = 0;
    let wallClockSlot: number | undefined;
    let wallClockCycle: number | undefined;
    let playbackKey = $state(0);
    const finishedVideos = new Map<string, boolean>();

    function advance(now: number): void {
        position = (position + 1) % config.screenOrder.length;
        currentScreen = config.screenOrder[position];
        startedAt = now;
        finishedVideos.clear();
        playbackKey++;
    }

    function videoFinished(screenId: string, widgetId: string, played: boolean): void {
        if (!sequential || screenId !== currentScreen) return;
        // Keep a successful first playthrough even if a later loop fails.
        finishedVideos.set(widgetId, finishedVideos.get(widgetId) === true || played);
        updateCurrentScreen();
    }

    function updateCurrentScreen(): void {
        const screens = config.screenOrder.map(id => config.screens[id]);
        const now = Date.now();
        if (sequential && screens.length) {
            if (position < 0) advance(now);
            const screen = screens[position];
            const videos = screen.widgetOrder.filter(id => screen.widgets[id].type === "video");
            const waitsForVideo = screen.playbackMode === "video-end" && videos.length > 0;
            const elapsed = now - startedAt;
            const allFinished = videos.every(id => finishedVideos.has(id));
            const anyPlayed = videos.some(id => finishedVideos.get(id));
            if (waitsForVideo
                ? allFinished && (anyPlayed || elapsed >= screen.durationSeconds * 1000)
                : elapsed >= screen.durationSeconds * 1000) {
                advance(now);
            }
            const active = screens[position];
            nextScreen = active.playbackMode === "video-end" ||
                active.durationSeconds * 1000 - (now - startedAt) <= PRELOAD_MS
                ? screens[(position + 1) % screens.length].id : undefined;
            return;
        }
        const timing = getScreenTiming(screens, now);
        if (timing) {
            // A new slot must restart playback even if the same screen stays mounted.
            if (timing.index !== wallClockSlot || timing.cycle !== wallClockCycle) {
                playbackKey++;
            }
            wallClockSlot = timing.index;
            wallClockCycle = timing.cycle;
            currentScreen = screens[timing.index].id;
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
                <PageV1 screen={config.screens[id]} active={id === currentScreen}
                    playbackKey={id === currentScreen ? playbackKey : -1}
                    onvideofinish={(widgetId, played) => videoFinished(id, widgetId, played)}/>
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
