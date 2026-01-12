<script lang="ts">
    import { T } from "@threlte/core";
    import { spring } from "svelte/motion";
    import * as THREE from "three";
    import { gestureState, tradingHandPreference } from "$lib/stores/gesture";
    import { twoHandPinch } from "$lib/stores/tracking";

    // Props
    export let minPrice: number;
    export let maxPrice: number;
    export let chartWidth: number = 60; // Width of the target line
    export let onPriceSelected: (price: number) => void = () => {};

    // State
    let isActive = false;
    let isLocked = false;
    let lockedPrice: number | null = null;

    // Smoothed target price with spring physics
    const targetPrice = spring(minPrice, {
        stiffness: 0.15,
        damping: 0.7,
    });

    // Smoothed line opacity
    const lineOpacity = spring(0, { stiffness: 0.2, damping: 0.8 });

    // Map hand Y (0=top, 1=bottom) to price (high=top, low=bottom)
    function handYToPrice(handY: number): number {
        // Clamp to valid range
        const clampedY = Math.max(0.1, Math.min(0.9, handY));
        // Invert: top of screen (0) = high price, bottom (1) = low price
        const normalized = 1 - clampedY;
        return minPrice + (maxPrice - minPrice) * normalized;
    }

    // React to gesture state
    $: {
        const isValidHand =
            $gestureState.isHandDetected &&
            $gestureState.numHandsDetected === 1 &&
            $gestureState.primaryHandSide === $tradingHandPreference &&
            !$twoHandPinch.isActive;

        // Must have index finger extended (pointing) - not fist, not thumbs up
        const isPointing =
            $gestureState.detectedGesture === "Pointing_Up" ||
            $gestureState.detectedGesture === "None" ||
            $gestureState.detectedGesture === "Open_Palm";

        if (isValidHand && isPointing && !isLocked) {
            isActive = true;
            lineOpacity.set(0.8);

            // Update target price based on hand Y position
            const price = handYToPrice($gestureState.handPosition.y);
            targetPrice.set(price);
        } else if (!isLocked) {
            isActive = false;
            lineOpacity.set(0);
        }

        // Pinch to lock the price
        if (
            isActive &&
            $gestureState.isPinching &&
            $gestureState.detectedGesture !== "Closed_Fist"
        ) {
            if (!isLocked) {
                isLocked = true;
                lockedPrice = $targetPrice;
                lineOpacity.set(1);
                onPriceSelected(lockedPrice);
            }
        }

        // Release pinch to unlock (after a delay)
        if (isLocked && !$gestureState.isPinching) {
            // Keep locked for now - will need external reset
        }
    }

    // Reset function for external use
    export function reset() {
        isLocked = false;
        lockedPrice = null;
        lineOpacity.set(0);
    }

    // Computed values
    $: displayPrice = isLocked ? lockedPrice : $targetPrice;
    $: lineY = displayPrice ?? minPrice;
    $: priceLabel = (displayPrice ?? 0).toFixed(2);
    $: isAboveCenter = (displayPrice ?? 0) > (minPrice + maxPrice) / 2;
</script>

<!-- Horizontal Target Line -->
{#if $lineOpacity > 0.01}
    <T.Group position={[0, lineY, 0]}>
        <!-- Main line -->
        <T.Mesh>
            <T.BoxGeometry args={[chartWidth, 0.3, 0.3]} />
            <T.MeshBasicMaterial
                color={isLocked ? "#22c55e" : "#facc15"}
                transparent
                opacity={$lineOpacity}
            />
        </T.Mesh>

        <!-- Glow effect -->
        <T.Mesh>
            <T.BoxGeometry args={[chartWidth, 0.8, 0.8]} />
            <T.MeshBasicMaterial
                color={isLocked ? "#22c55e" : "#facc15"}
                transparent
                opacity={$lineOpacity * 0.3}
            />
        </T.Mesh>

        <!-- Price label billboard (right side) -->
        <T.Group position={[chartWidth / 2 + 5, 0, 0]}>
            <!-- Background box -->
            <T.Mesh>
                <T.BoxGeometry args={[12, 4, 0.5]} />
                <T.MeshBasicMaterial
                    color={isLocked ? "#166534" : "#854d0e"}
                    transparent
                    opacity={$lineOpacity * 0.9}
                />
            </T.Mesh>
        </T.Group>

        <!-- Left cap -->
        <T.Mesh position={[-chartWidth / 2, 0, 0]}>
            <T.SphereGeometry args={[0.5, 8, 8]} />
            <T.MeshBasicMaterial
                color={isLocked ? "#22c55e" : "#facc15"}
                transparent
                opacity={$lineOpacity}
            />
        </T.Mesh>

        <!-- Right cap -->
        <T.Mesh position={[chartWidth / 2, 0, 0]}>
            <T.SphereGeometry args={[0.5, 8, 8]} />
            <T.MeshBasicMaterial
                color={isLocked ? "#22c55e" : "#facc15"}
                transparent
                opacity={$lineOpacity}
            />
        </T.Mesh>
    </T.Group>
{/if}
