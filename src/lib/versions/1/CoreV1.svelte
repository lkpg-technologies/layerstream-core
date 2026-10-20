<script lang="ts">
    import { onMount } from "svelte";
    import PageV1 from "./PageV1.svelte";
    import type { ConfigV1 } from "./types";
    import { getActiveScreenId, msUntilNextSecond } from "../../schedule";
    import { displayStatus, reportError } from "../../stability";

    const { config }: { config: ConfigV1 } = $props();

    let currentScreen = $state<string>();
    const screen = $derived(currentScreen ? config.screens[currentScreen] : undefined);

    function updateCurrentScreen(): void {
        const slots = config.screenOrder.map(id => ({ id, durationSeconds: config.screens[id].durationSeconds }));
        const id = getActiveScreenId(slots);
        if (id !== undefined && id !== currentScreen) {
            currentScreen = id;
            displayStatus.currentScreen = id;
        }
    }

    onMount(() => {
        let timer: ReturnType<typeof setTimeout>;
        function tick() {
            try {
                updateCurrentScreen();
            } catch (error) {
                reportError("scheduler", error);
            } finally {
                // Always reschedule, an error must never stop the rotation
                timer = setTimeout(tick, msUntilNextSecond());
            }
        }
        tick();
        return () => clearTimeout(timer);
    });
</script>


{#if screen}
    <!-- Keyed so a screen that failed to render gets a fresh boundary when the rotation moves on -->
    {#key currentScreen}
        <svelte:boundary onerror={(error) => reportError(`screen ${currentScreen}`, error)}>
            <PageV1 {screen}/>
        </svelte:boundary>
    {/key}
{:else}
    No active bundle
{/if}
