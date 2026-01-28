/**
 * DeviceGuard - Device Capability Detection
 * 
 * Detects mobile/touch devices and blocks trading UI.
 * HoloTrade requires webcam and desktop for reliable gesture detection.
 */

export interface DeviceCapabilities {
    isMobile: boolean;
    isTouchOnly: boolean;
    hasPointerDevice: boolean;
    screenTooSmall: boolean;
    userAgent: string;
}

/**
 * Detect device capabilities
 */
export function detectDevice(): DeviceCapabilities {
    if (typeof window === 'undefined') {
        return {
            isMobile: false,
            isTouchOnly: false,
            hasPointerDevice: true,
            screenTooSmall: false,
            userAgent: ''
        };
    }

    const ua = navigator.userAgent.toLowerCase();

    // Mobile user agent patterns
    const mobilePatterns = [
        /android/i,
        /webos/i,
        /iphone/i,
        /ipad/i,
        /ipod/i,
        /blackberry/i,
        /windows phone/i,
        /mobile/i
    ];

    const isMobile = mobilePatterns.some(pattern => pattern.test(ua));

    // Check for fine pointer (mouse) vs coarse pointer (touch)
    const hasPointerDevice = window.matchMedia('(pointer: fine)').matches;
    const isTouchOnly = window.matchMedia('(pointer: coarse)').matches && !hasPointerDevice;

    // Screen size check (minimum 1024px width for usable UI)
    const screenTooSmall = window.innerWidth < 1024;

    return {
        isMobile,
        isTouchOnly,
        hasPointerDevice,
        screenTooSmall,
        userAgent: ua
    };
}

/**
 * Check if device is suitable for HoloTrade
 */
export function isDeviceSupported(): { supported: boolean; reason?: string } {
    const caps = detectDevice();

    if (caps.isMobile) {
        return {
            supported: false,
            reason: 'HoloTrade requires a desktop computer with webcam. Mobile devices are not supported.'
        };
    }

    if (caps.isTouchOnly) {
        return {
            supported: false,
            reason: 'HoloTrade requires a mouse or trackpad for precise interactions. Touch-only devices are not supported.'
        };
    }

    if (caps.screenTooSmall) {
        return {
            supported: false,
            reason: 'HoloTrade requires a screen width of at least 1024 pixels. Please use a larger display.'
        };
    }

    return { supported: true };
}

/**
 * Quick check helper
 */
export function isMobileDevice(): boolean {
    return detectDevice().isMobile;
}
