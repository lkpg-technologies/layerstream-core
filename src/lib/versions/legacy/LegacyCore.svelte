<script lang="ts">
    import { onMount } from "svelte";
    import LegacyPage from "./Page.svelte";
    import { writable } from "svelte/store";
    import { isOnline } from "../../stores/network";
    import type { LegacyConfig } from "./types/Config";
    import { getLegacyPageIndex, msUntilNextSecond } from "../../schedule";
    import { displayStatus, reportError } from "../../stability";

    const { config }: { config: LegacyConfig } = $props();

    function getCurrentPage() {
        return getLegacyPageIndex(config.pages.map(page => page.duration));
    }

    let currentIndex = $state(getCurrentPage());

    // Legacy semantics: wait for a confirmed connection once, then show content for good
    let hasBeenOnline = $state(false);
    const dots = writable("");

    onMount(() => {
        let timer: ReturnType<typeof setTimeout>;
        function tick() {
            try {
                const newIndex = getCurrentPage();
                if (newIndex !== currentIndex) {
                    currentIndex = newIndex;
                }
                displayStatus.currentScreen = currentIndex === undefined ? null : `page ${currentIndex}`;
            } catch (error) {
                reportError("scheduler", error);
            } finally {
                // Always reschedule, an error must never stop the rotation
                timer = setTimeout(tick, msUntilNextSecond());
            }
        }
        tick();

        const dotsInterval = setInterval(() => {
            dots.update(d => d.length < 3 ? d + '.' : "");
        }, 1000);

        const unsubscribeNet = isOnline.subscribe(online => {
            if (online === true && !hasBeenOnline) {
                hasBeenOnline = true;
                clearInterval(dotsInterval);
            }
        });

        return () => {
            clearTimeout(timer);
            clearInterval(dotsInterval);
            unsubscribeNet();
        };
    });
</script>

{#if config.networkRequired && !hasBeenOnline}
    <div class="page active no-network-page">
        <h1>Waiting for network{ $dots }</h1>
    </div>
{:else}
    {#each config.pages as page, i}
        <div class="page {i === currentIndex ? 'active' : ''}">
            <svelte:boundary onerror={(error) => reportError(`page ${i}`, error)}>
                <LegacyPage page={ page } active={i === currentIndex}></LegacyPage>
            </svelte:boundary>
        </div>
    {/each}
{/if}

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
