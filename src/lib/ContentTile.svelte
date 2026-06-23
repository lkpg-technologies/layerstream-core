<script lang="ts">
    import type { Content } from "./types/Content";
    import { resolvePath } from "./utils";

    const props: { content: Content} = $props();
</script>

<div class="content-tile" style='grid-area: {props.content.id};'>
    {#if props.content.type == "url"}

        <iframe src="{resolvePath(props.content.src)}" frameborder="0" title="url"></iframe>

    {:else if props.content.type == "image"}

        <img src="{resolvePath(props.content.src)}" alt=""> 
        
    {:else if props.content.type == "video"}
        <video autoplay loop muted>
            <source src="{resolvePath(props.content.src)}">
            <track kind="captions">
        </video>
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

    .content-tile > * {
        all: unset;
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
        display: block;
        /* object-fit: fill; */
    }
</style>