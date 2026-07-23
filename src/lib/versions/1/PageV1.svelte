<script lang="ts">
    import { isOnline  } from "../../stores/network.svelte";

    const { screen } = $props();
</script>
<div id="screen">
    {#each screen.widgetOrder as widgetId}
        {#if screen.widgets[widgetId].type === "color"}
            <div
                style="
                    position: absolute;
                    width: {screen.widgets[widgetId].properties.size.w}%;
                    height: {screen.widgets[widgetId].properties.size.h}%;
                    left: {screen.widgets[widgetId].properties.position.x}%;
                    top: {screen.widgets[widgetId].properties.position.y}%;
                    background: {screen.widgets[widgetId].settings.color.value};
                "
            ></div>
        {:else if screen.widgets[widgetId].type === "webpage"}
            {#if !screen.widgets[widgetId].settings.network?.value || $isOnline}
                <iframe
                    src={screen.widgets[widgetId].settings.webpage.value}
                    frameborder="0"
                    title={screen.widgets[widgetId].settings.webpage.value}
                    style="
                        position: absolute;
                        width: {screen.widgets[widgetId].properties.size.w}%;
                        height: {screen.widgets[widgetId].properties.size.h}%;
                        left: {screen.widgets[widgetId].properties.position.x}%;
                        top: {screen.widgets[widgetId].properties.position.y}%;
                    "
                ></iframe>
            {:else}
                <div
                    style="
                        position: absolute;
                        width: {screen.widgets[widgetId].properties.size.w}%;
                        height: {screen.widgets[widgetId].properties.size.h}%;
                        left: {screen.widgets[widgetId].properties.position.x}%;
                        top: {screen.widgets[widgetId].properties.position.y}%;
                        background: #333333;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        border: solid black 2px;
                    "
                >
                    <h1
                        style="color: white; font-family: monospace; text-align: center;"
                    >No network connection.
                    </h1>
                </div>
            {/if}
        {/if}
    {/each}
</div>


<style>
    * {
        box-sizing: border-box;
    }
    #screen {
        position: absolute;
        height: 100%;
        width: 100%;
        top: 0;
        left: 0;
    }
</style>