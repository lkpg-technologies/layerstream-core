<script lang="ts">
    import type { Content } from "./types/Content";
    import { resolvePath } from "../../utils";
    import RefreshingIframe from "../../RefreshingIframe.svelte";
    import VideoPlayer from "./VideoPlayer.svelte";

    const props: { content: Content, active?: boolean } = $props();

</script>

<div class="content-tile" style='grid-area: {props.content.id};'>
    {#if props.content.type == "url"}

        <RefreshingIframe src={resolvePath(props.content.src)} title="url" refreshSeconds={props.content.refreshSeconds} />

    {:else if props.content.type == "image"}

        <img src="{resolvePath(props.content.src)}" alt="">

    {:else if props.content.type == "video"}
        <VideoPlayer src={resolvePath(props.content.src)} active={props.active ?? true} />
    {:else if props.content.type == "color"}
        <div style="background-color: {props.content.src}"></div>
    {/if}
</div>

<style>
    .content-tile {
        /* border: solid red 2px; */
        background-color: white;
        object-fit: cover;
    }

    /* :global so it also reaches elements rendered by child components (iframe, video) */
    .content-tile > :global(*) {
        all: unset;
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
        display: block;
        /* object-fit: fill; */
    }
</style>
