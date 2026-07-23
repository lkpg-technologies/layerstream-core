<script lang="ts">
    import { writable } from "svelte/store";
    import { config } from "../../stores/config";
    import PageV1 from "./PageV1.svelte";

    const screens = $derived($config.screens)
    const screenOrder = $derived($config.screenOrder)
    const currentScreen = writable<String>("");

    function updateCurrentPage(): void {
        const totalCycleDuration = screenOrder.reduce((sum: Number, id: String) => sum + screens[id].durationSeconds, 0);

        let lastSlot = 0;
        const timeSlots = screenOrder.map((id: String) => {
            const slot = lastSlot += screens[id].durationSeconds;
            return {id, slot}
        });
        const now = Date.now();

        // If "cycle" (time for screen 0 to be shown twice) is 15 seconds
        // currentCycleTime loops from 0 to 14, if cycle is 20
        // currentCycleTime loops from 0 to 19, and so on...
        const currentCycleTime = Math.round((now % (totalCycleDuration * 1000)) / 1000);

        for (let timeSlot of timeSlots) {
            if (timeSlot.slot > currentCycleTime) {
                currentScreen.set(timeSlot.id)
                break;
            }            
        }
    }

    function tick() {
        updateCurrentPage();
        const now = new Date();
        const next = 1000 - now.getMilliseconds();

        setTimeout(tick, next);
    }
    tick();

</script>


{#if $currentScreen}
    <PageV1 screen={screens[$currentScreen]}/>
{:else}
    No active bundle
{/if}
