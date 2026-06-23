<script lang="ts">
    import ContentTile from "./ContentTile.svelte";
    import type { Content } from "./types/Content";
    import type { PageType } from "./types/PageType";

    const props = $props();
    const page: PageType = props.page;
</script>
<div class="page"
    style="background-color: {page.bgColor};"
>
    {#if page.type == "grid"}
        <div class="grid" style={`
            grid-template:
                ${page.layout.template.map((x: any[]) => `"${x.join(' ')}"`).join('\n')}
            ;
            grid-template-columns: repeat(${page.layout.template[0].length}, 1fr);
            grid-template-rows: repeat(${page.layout.template.length}, 1fr);
            gap: 10px;
            
        `}>
            {#each (page.layout.content as Content[]) as content}
                <ContentTile content={content}/>
            {/each}
        </div>
    {:else if page.type == "fullscreen"}
        <div class="fullscreen">
            <!-- Add a type for "kiosk" mode (skipping cors and iframe blocks) -->
            <ContentTile content={(page.layout.content[0] || page.layout.content )}/>
        </div>
    {/if}
</div>


<style>
    .grid {
        display: grid;
    }

</style>