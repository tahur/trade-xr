<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { scale } from "svelte/transition";

    const dispatch = createEventDispatcher<{
        setup: void;
        connect: void;
    }>();

    // Connection state: NOT_CONFIGURED | CONFIGURED | CONNECTED
    export let state: "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" =
        "NOT_CONFIGURED";
    export let loading: boolean = false;

    // Derived states
    $: buttonText =
        state === "NOT_CONFIGURED"
            ? "Setup"
            : state === "CONFIGURED"
              ? "Connect"
              : "Connected";
    $: buttonColor =
        state === "NOT_CONFIGURED"
            ? "from-orange-500/20 to-amber-500/20 border-orange-400/40 text-orange-300"
            : state === "CONFIGURED"
              ? "from-blue-500/20 to-cyan-500/20 border-blue-400/40 text-blue-300"
              : "from-emerald-500/20 to-green-500/20 border-emerald-400/40 text-emerald-300";

    $: pulseClass = state === "CONFIGURED" ? "animate-pulse" : "";

    function handleClick() {
        if (loading) return;
        if (state === "NOT_CONFIGURED") {
            dispatch("setup");
        } else if (state === "CONFIGURED") {
            dispatch("connect");
        }
        // Connected state - no action (could open account info)
    }
</script>

<button
    class="kite-button bg-gradient-to-r {buttonColor} {pulseClass}"
    class:connected={state === "CONNECTED"}
    class:clickable={state !== "CONNECTED"}
    on:click={handleClick}
    disabled={loading}
    transition:scale={{ duration: 150, start: 0.95 }}
>
    <!-- Kite Logo (when connected) -->
    {#if state === "CONNECTED"}
        <img src="/kite-logo.png" alt="Kite" class="w-4 h-4 object-contain" />
    {:else if state === "NOT_CONFIGURED"}
        <!-- Key icon for setup -->
        <svg
            class="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
            />
        </svg>
    {:else}
        <!-- Lightning bolt for connect -->
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
                fill-rule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                clip-rule="evenodd"
            />
        </svg>
    {/if}

    <!-- Button text -->
    <span class="text-xs font-bold uppercase tracking-wide">
        {#if loading}
            ...
        {:else}
            {buttonText}
        {/if}
    </span>

    <!-- Checkmark for connected -->
    {#if state === "CONNECTED"}
        <span class="text-emerald-400">✓</span>
    {/if}
</button>

<style>
    .kite-button {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.625rem;
        border-radius: 0.5rem;
        border: 1px solid;
        transition: all 0.2s ease;
        cursor: default;
    }

    .kite-button.clickable {
        cursor: pointer;
    }

    .kite-button.clickable:hover {
        filter: brightness(1.2);
        transform: scale(1.02);
    }

    .kite-button.clickable:active {
        transform: scale(0.98);
    }

    .kite-button.connected {
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
    }

    .kite-button:disabled {
        opacity: 0.6;
        cursor: wait;
    }
</style>
