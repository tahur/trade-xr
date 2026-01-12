# Glassmorphic Card Design with Lighting Physics

## Visual Style
- **Glassmorphism**: High transparency, heavy backdrop blur, subtle white border.
- **Background**: `rgba(20, 25, 40, 0.6)` with `backdrop-filter: blur(20px)`.
- **Border**: 1px solid `rgba(255, 255, 255, 0.15)`.
- **Shadow**: Deep, soft shadow for elevation.

## Lighting Shift Physics
The card should interact with the user's head position (Face Tracking) to create a holographic depth effect.

### Behavior
- **Light Source**: A radial gradient overlay representing a reflection/shine.
- **Head Movement Mapping**:
    - **Move Head Right**: The "shine" on the card should shift, simulating that the user is looking at the glossy surface from a different angle.
    - **Move Head Up/Down**: The vertical position of the shine adjusts.
- **Corner Highlighting**: The border opacity or color intensity should shift towards the corner closest to the user's view vector.

### Technical Implementation
- Use CSS Variables `--head-x` and `--head-y` mapped from the tracking store.
- **Gradient**: `radial-gradient(circle at var(--light-x) var(--light-y), rgba(255,255,255,0.15), transparent 80%)`
- **Logic**:
    - `light-x = 50% + (headPosition.x * factor)`
    - `light-y = 50% + (headPosition.y * factor)`
