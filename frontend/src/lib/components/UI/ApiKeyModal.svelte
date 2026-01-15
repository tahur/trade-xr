<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { createEventDispatcher, onMount } from "svelte";
    import { kite } from "$lib/services/kite";

    export let isOpen = false;

    const dispatch = createEventDispatcher();

    let apiKey = "";
    let apiSecret = "";
    let isLoading = false;
    let errorMessage = "";

    onMount(() => {
        // Load from local storage if available
        apiKey = localStorage.getItem("kite_api_key") || "";
        apiSecret = localStorage.getItem("kite_api_secret") || "";
    });

    async function handleSave() {
        if (!apiKey || !apiSecret) {
            errorMessage = "Both fields are required.";
            return;
        }

        isLoading = true;
        errorMessage = "";

        try {
            // 1. Save locally
            localStorage.setItem("kite_api_key", apiKey);
            localStorage.setItem("kite_api_secret", apiSecret);

            // 2. Configure Backend
            const response = await fetch("http://127.0.0.1:8000/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: apiKey,
                    api_secret: apiSecret,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to configure backend.");
            }

            // 3. Initiate Login
            // Redirect to Kite Login
            window.location.href = `https://kite.trade/connect/login?v=3&api_key=${apiKey}`;

            dispatch("close");
        } catch (e: any) {
            console.error(e);
            errorMessage = e.message || "Configuration failed.";
        } finally {
            isLoading = false;
        }
    }

    function handleClose() {
        dispatch("close");
    }
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-auto"
        transition:fade={{ duration: 200 }}
    >
        <!-- Backdrop -->
        <div
            role="button"
            tabindex="-1"
            aria-label="Close modal"
            class="absolute inset-0 bg-black/80 backdrop-blur-sm"
            on:click={handleClose}
            on:keydown={(e) => e.key === "Escape" && handleClose()}
        ></div>

        <!-- Modal -->
        <div
            class="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 overflow-hidden"
            transition:scale={{ start: 0.95, duration: 200 }}
        >
            <!-- Glow -->
            <div
                class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600"
            ></div>

            <h2 class="text-xl font-bold text-white mb-1">
                Configure Kite API
            </h2>
            <p class="text-sm text-slate-400 mb-6">
                Enter your Zerodha Kite Connect credentials.
            </p>

            <div class="space-y-4">
                <div>
                    <label
                        for="apikey"
                        class="block text-xs font-mono text-slate-500 mb-1 uppercase tracking-wider"
                        >API Key</label
                    >
                    <input
                        id="apikey"
                        type="text"
                        bind:value={apiKey}
                        class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="Expected 32 chars"
                    />
                </div>

                <div>
                    <label
                        for="secret"
                        class="block text-xs font-mono text-slate-500 mb-1 uppercase tracking-wider"
                        >API Secret</label
                    >
                    <input
                        id="secret"
                        type="password"
                        bind:value={apiSecret}
                        class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                        placeholder="••••••••••••••••"
                    />
                </div>
            </div>

            {#if errorMessage}
                <div
                    class="mt-4 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-xs"
                >
                    {errorMessage}
                </div>
            {/if}

            <div class="mt-8 flex justify-end gap-3">
                <button
                    class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    on:click={handleClose}
                >
                    Cancel
                </button>
                <button
                    class="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                    on:click={handleSave}
                >
                    {isLoading ? "Saving..." : "Save & Connect"}
                </button>
            </div>
        </div>
    </div>
{/if}
