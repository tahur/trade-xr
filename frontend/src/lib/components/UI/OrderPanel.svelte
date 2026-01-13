<script lang="ts">
    import { tradingStore } from "$lib/stores/trading";

    export let currentPrice: number;

    let quantity = 1;
    let price = 27;
    let side: "BUY" | "SELL" = "BUY";

    // Update limit price default when market price changes (if not modified)
    $: if (price === 0) price = currentPrice;

    // Validation
    $: isValid = quantity > 0 && price > 0;

    function handleOrder() {
        if (!isValid) return;
        tradingStore.placeOrder(side, quantity, price);
    }
</script>

<div
    class="w-80 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-6 shadow-2xl text-white"
>
    <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-bold">Place Order</h2>
        <div class="flex bg-slate-800 rounded-lg p-1">
            <button
                class={`px-4 py-1 rounded-md text-sm font-semibold transition-all ${side === "BUY" ? "bg-green-500 text-black" : "text-slate-400 hover:text-white"}`}
                on:click={() => (side = "BUY")}
            >
                BUY
            </button>
            <button
                class={`px-4 py-1 rounded-md text-sm font-semibold transition-all ${side === "SELL" ? "bg-red-500 text-black" : "text-slate-400 hover:text-white"}`}
                on:click={() => (side = "SELL")}
            >
                SELL
            </button>
        </div>
    </div>

    <div class="space-y-4">
        <!-- Symbol Info -->
        <div class="flex justify-between text-sm">
            <span class="text-slate-400">Instrument</span>
            <span class="font-mono">SILVERCASE</span>
        </div>

        <!-- Quantity -->
        <div>
            <label
                for="quantity"
                class="block text-xs uppercase text-slate-500 tracking-wider mb-1"
                >Quantity</label
            >
            <input
                id="quantity"
                type="number"
                min="1"
                bind:value={quantity}
                class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-right font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all invalid:border-red-500"
            />
        </div>

        <!-- Limit Price -->
        <div>
            <label
                for="price"
                class="block text-xs uppercase text-slate-500 tracking-wider mb-1"
                >Price</label
            >
            <input
                id="price"
                type="number"
                step="0.05"
                min="0.05"
                bind:value={price}
                class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-right font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all invalid:border-red-500"
            />
        </div>
        <!-- Margin/Balance? -->
        <div
            class="flex justify-between text-xs pt-2 border-t border-slate-700"
        >
            <span class="text-slate-400">Est. Total</span>
            <span class="font-mono text-slate-200"
                >₹{(quantity * price).toFixed(2)}</span
            >
        </div>

        <!-- Submit Button -->
        <button
            disabled={!isValid}
            on:click={handleOrder}
            class={`w-full py-3 rounded-lg font-bold text-black mt-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${side === "BUY" ? "bg-green-500 hover:bg-green-400" : "bg-red-500 hover:bg-red-400"}`}
        >
            {side} @ {price.toFixed(2)}
        </button>
    </div>
</div>
