<script lang="ts">
    import {
        isTracking,
        cameraLabel,
        isCameraEnabled,
    } from "$lib/stores/tracking";
    import { fade, scale } from "svelte/transition";
</script>

{#if ($isCameraEnabled && $isTracking) || !$isCameraEnabled}
    <div
        class="flex items-center gap-2.5 px-3 py-2 rounded-xl backdrop-blur-xl
            bg-gradient-to-r from-black/30 to-black/20 border border-white/10"
        transition:scale={{ duration: 200, start: 0.9 }}
    >
        <!-- Toggle Button -->
        <button
            class="flex items-center justify-center w-6 h-6 rounded-lg transition-all
                {$isCameraEnabled
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 hover:bg-rose-500/30'}"
            on:click={() => ($isCameraEnabled = !$isCameraEnabled)}
            title={$isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
        >
            {#if $isCameraEnabled}
                <!-- Camera On Icon -->
                <svg
                    class="w-3.5 h-3.5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                </svg>
            {:else}
                <!-- Camera Off Icon -->
                <svg
                    class="w-3.5 h-3.5 text-rose-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
                    />
                </svg>
            {/if}
        </button>

        {#if $isCameraEnabled}
            <!-- Blinking Status Dot -->
            <div class="relative flex h-2 w-2">
                <span
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"
                ></span>
                <span
                    class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
                ></span>
            </div>

            <!-- Status Text -->
            <div class="flex items-center gap-1.5">
                <span
                    class="text-[10px] font-bold text-emerald-400 tracking-wider uppercase"
                >
                    LIVE
                </span>
                {#if $cameraLabel}
                    <span
                        class="text-[9px] text-white/40 font-medium truncate max-w-[100px]"
                    >
                        {$cameraLabel}
                    </span>
                {/if}
            </div>
        {:else}
            <!-- Static Red Dot -->
            <div class="h-2 w-2 rounded-full bg-rose-500"></div>
            <span
                class="text-[10px] font-bold text-rose-400 tracking-wider uppercase"
            >
                OFF
            </span>
        {/if}
    </div>
{/if}
