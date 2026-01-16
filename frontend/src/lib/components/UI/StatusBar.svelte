<script lang="ts">
    import { fade } from "svelte/transition";
    import { createEventDispatcher } from "svelte";
    import KiteButton from "./KiteButton.svelte";
    import { isCameraEnabled } from "$lib/stores/tracking";

    const dispatch = createEventDispatcher<{
        setup: void;
        connect: void;
    }>();

    export let isLive: boolean = false;
    export let kiteState: "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" =
        "NOT_CONFIGURED";
    export let loading: boolean = false;

    function toggleCamera() {
        isCameraEnabled.update((v) => !v);
    }
</script>

<div class="status-bar" transition:fade={{ duration: 200 }}>
    <!-- Camera Toggle Button -->
    <button
        class="status-item camera-toggle"
        class:active={$isCameraEnabled && isLive}
        on:click={toggleCamera}
        title="{$isCameraEnabled ? 'Turn Off' : 'Turn On'} Camera"
    >
        <div class="status-icon" class:active={$isCameraEnabled && isLive}>
            {#if $isCameraEnabled}
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"
                    />
                </svg>
            {:else}
                <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
                    />
                </svg>
            {/if}
        </div>
        <span class="status-text"
            >{$isCameraEnabled && isLive
                ? "LIVE"
                : $isCameraEnabled
                  ? "ON"
                  : "OFF"}</span
        >
    </button>

    <!-- Divider -->
    <div class="divider"></div>

    <!-- Kite Connection Button -->
    <KiteButton
        state={kiteState}
        {loading}
        on:setup={() => dispatch("setup")}
        on:connect={() => dispatch("connect")}
    />
</div>

<style>
    .status-bar {
        position: fixed;
        bottom: 1.5rem;
        left: 1.5rem;
        z-index: 80;

        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;

        /* Glassmorphic */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08) 0%,
            rgba(255, 255, 255, 0.05) 100%
        );
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);

        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .status-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    /* Camera toggle button styling */
    .camera-toggle {
        background: transparent;
        border: none;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
    }

    .camera-toggle:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .status-icon {
        width: 1rem;
        height: 1rem;
        color: rgba(255, 255, 255, 0.3);
        transition: color 0.2s;
    }

    .status-icon.active {
        color: #10b981; /* green-500 */
    }

    .status-text {
        font-size: 0.75rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .divider {
        width: 1px;
        height: 1rem;
        background: rgba(255, 255, 255, 0.1);
    }
</style>
