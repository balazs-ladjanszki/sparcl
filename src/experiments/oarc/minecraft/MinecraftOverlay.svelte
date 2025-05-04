<!--
  (c) 2024 Open AR Cloud
  This code is licensed under MIT license (see LICENSE for details)
-->

<!--
    Content of the experiment overlay.
-->

<script>
    import { createEventDispatcher } from 'svelte';
    import { experimentModeSettings } from '@src/stateStore';

    // Used to dispatch events to parent
    const dispatch = createEventDispatcher();

</script>

{#if $experimentModeSettings?.minecraft.showstats}
    <p>Minecraft demo</p>
    <!--<button class="prime" on:click={() => dispatch('placeBlock')}>Place Block</button>-->
    {#if $experimentModeSettings.minecraft.localisation}
        <button class="secondary" on:click={() => dispatch('relocalize')}>
            <img src="/media/refresh.svg" alt="refresh icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('grass')}>
            <img src=/media/grass_48x.svg alt="grass icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('log')}>
            <img src="/media/log_48x.svg" alt="log icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('dirt')}>
            <img src="/media/dirt_48x.svg" alt="dirt icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('stone')}>
            <img src="/media/stone_48x.svg" alt="stone icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('cobblestone')}>
            <img src="/media/cobblestone_48x.svg" alt="cobblestone icon" />
        </button>
        <!--<button class="prime" on:click={() => dispatch('dimensions')}>Change dimensions</button>-->
    {/if}
{/if}

<style>
    button {
        height: var(--button-height);
    }
    .prime {
        width: 200px;
    }
    .secondary {
        width: 50px;
    }
    .secondary img {
        width: 20px;
    }
</style>
