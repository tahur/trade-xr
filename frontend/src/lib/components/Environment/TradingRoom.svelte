<!--
    TradingRoom.svelte
    
    Creates a wireframe "box" environment around the chart
    for better depth perception and the "window into 3D" effect.
-->
<script lang="ts">
    import { T } from "@threlte/core";

    // Room dimensions
    export let width = 80;
    export let height = 60;
    export let depth = 100;
    export let floorY = 0;

    // Colors
    export let gridColor = 0xff8c00; // Orange
    export let frameColor = 0x00a2ff; // Blue

    // Grid density - fewer divisions for cleaner look
    const divisions = 10;

    // Calculated positions
    $: halfW = width / 2;
    $: halfD = depth / 2;
    $: centerY = floorY + height / 2;
</script>

<T.Group>
    <!-- ═══════════════════════════════════════════════════════════
         FLOOR GRID
         ═══════════════════════════════════════════════════════════ -->
    <T.GridHelper
        args={[width, divisions, gridColor, gridColor]}
        position.y={floorY - 5}
    />

    <!-- ═══════════════════════════════════════════════════════════
         BACK WALL GRID
         ═══════════════════════════════════════════════════════════ -->
    <T.GridHelper
        args={[width, divisions, gridColor, gridColor]}
        position.z={-halfD}
        position.y={centerY - 5}
        rotation.x={Math.PI / 2}
    />

    <!-- ═══════════════════════════════════════════════════════════
         LEFT WALL GRID
         ═══════════════════════════════════════════════════════════ -->
    <T.GridHelper
        args={[depth, divisions, gridColor, gridColor]}
        position.x={-halfW}
        position.y={centerY - 5}
        rotation.z={Math.PI / 2}
    />

    <!-- ═══════════════════════════════════════════════════════════
         RIGHT WALL GRID (for symmetry)
         ═══════════════════════════════════════════════════════════ -->
    <T.GridHelper
        args={[depth, divisions, gridColor, gridColor]}
        position.x={halfW}
        position.y={centerY - 5}
        rotation.z={Math.PI / 2}
    />

    <!-- ═══════════════════════════════════════════════════════════
         CEILING GRID
         ═══════════════════════════════════════════════════════════ -->
    <T.GridHelper
        args={[width, divisions, gridColor, gridColor]}
        position.y={floorY + height - 5}
    />

    <!-- ═══════════════════════════════════════════════════════════
         GLOWING FRAME EDGES (vertical corners)
         ═══════════════════════════════════════════════════════════ -->
    <!-- Front-left vertical -->
    <T.Mesh position={[-halfW, centerY - 5, halfD]}>
        <T.BoxGeometry args={[0.3, height, 0.3]} />
        <T.MeshBasicMaterial color={frameColor} transparent opacity={0.7} />
    </T.Mesh>

    <!-- Front-right vertical -->
    <T.Mesh position={[halfW, centerY - 5, halfD]}>
        <T.BoxGeometry args={[0.3, height, 0.3]} />
        <T.MeshBasicMaterial color={frameColor} transparent opacity={0.7} />
    </T.Mesh>

    <!-- Back-left vertical -->
    <T.Mesh position={[-halfW, centerY - 5, -halfD]}>
        <T.BoxGeometry args={[0.3, height, 0.3]} />
        <T.MeshBasicMaterial color={frameColor} transparent opacity={0.4} />
    </T.Mesh>

    <!-- Back-right vertical -->
    <T.Mesh position={[halfW, centerY - 5, -halfD]}>
        <T.BoxGeometry args={[0.3, height, 0.3]} />
        <T.MeshBasicMaterial color={frameColor} transparent opacity={0.4} />
    </T.Mesh>

    <!-- ═══════════════════════════════════════════════════════════
         HORIZONTAL FRAME EDGES (top and bottom)
         ═══════════════════════════════════════════════════════════ -->
    <!-- Bottom front -->
    <T.Mesh position={[0, floorY - 5, halfD]}>
        <T.BoxGeometry args={[width, 0.3, 0.3]} />
        <T.MeshBasicMaterial color={frameColor} transparent opacity={0.7} />
    </T.Mesh>

    <!-- Top front -->
    <T.Mesh position={[0, floorY + height - 5, halfD]}>
        <T.BoxGeometry args={[width, 0.3, 0.3]} />
        <T.MeshBasicMaterial color={frameColor} transparent opacity={0.7} />
    </T.Mesh>

    <!-- Left front-to-back -->
    <T.Mesh position={[-halfW, floorY - 5, 0]}>
        <T.BoxGeometry args={[0.3, 0.3, depth]} />
        <T.MeshBasicMaterial color={frameColor} transparent opacity={0.5} />
    </T.Mesh>

    <!-- Right front-to-back -->
    <T.Mesh position={[halfW, floorY - 5, 0]}>
        <T.BoxGeometry args={[0.3, 0.3, depth]} />
        <T.MeshBasicMaterial color={frameColor} transparent opacity={0.5} />
    </T.Mesh>
</T.Group>
