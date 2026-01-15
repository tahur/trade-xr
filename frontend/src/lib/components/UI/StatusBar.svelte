<script lang="ts">
    import { fade } from "svelte/transition";
    import { createEventDispatcher } from "svelte";
    import KiteButton from "./KiteButton.svelte";

    const dispatch = createEventDispatcher<{
        setup: void;
        connect: void;
    }>();

    export let isLive: boolean = false;
    export let kiteState: "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" =
        "NOT_CONFIGURED";
    export let loading: boolean = false;
</script>

<div class="status-bar" transition:fade={{ duration: 200 }}>
    <!-- Camera Status -->
    <div class="status-item">
        <div class="status-icon" class:active={isLive}>
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                    d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"
                />
            </svg>
        </div>
        <span class="status-text">{isLive ? "LIVE" : "OFF"}</span>
    </div>

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
