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
    <button class="prime" on:click={() => dispatch('placeBlock')}>Place Block</button>
    {#if $experimentModeSettings.minecraft.localisation}
        <button class="secondary" on:click={() => dispatch('relocalize')}>
            <img src="/media/refresh.svg" alt="refresh icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('grass')}>
            <img src="/media/icons/grass_x48.PNG" alt="refresh icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('log')}>
            <img src="/media/icons/log_x48.PNG" alt="refresh icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('dirt')}>
            <img src="/media/icons/dirt_x48.PNG" alt="refresh icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('stone')}>
            <img src="/media/icons/stone_x48.PNG" alt="refresh icon" />
        </button>
        <button class="secondary" on:click={() => dispatch('cobblestone')}>
            <img src="/media/icons/cobblestone_x48.PNG" alt="refresh icon" />
        </button>
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
