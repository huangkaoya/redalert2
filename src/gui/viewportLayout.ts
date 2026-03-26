export interface ViewportResolution {
    width: number;
    height: number;
}
export interface PositionedViewport extends ViewportResolution {
    x: number;
    y: number;
}

export interface LayoutEnvironment {
    matchCoarse: boolean;
    matchFine?: boolean;
    anyFine?: boolean;
    maxTouchPoints: number;
}

export interface InitialViewportResolutionOptions {
    hasLoadedGeneralOptionsFromStorage: boolean;
    savedResolution?: ViewportResolution;
    defaultViewportSize: ViewportResolution;
    isMobileLayout: boolean;
}

export function detectMobileLayout(environment: LayoutEnvironment): boolean {
    if (environment.matchCoarse) {
        return true;
    }
    if ((environment.matchFine || environment.anyFine) && environment.maxTouchPoints > 0) {
        return false;
    }
    return environment.maxTouchPoints > 0;
}

export function getCurrentLayoutEnvironment(): LayoutEnvironment {
    return {
        matchCoarse: !!window.matchMedia?.('(pointer: coarse)')?.matches,
        matchFine: !!window.matchMedia?.('(pointer: fine)')?.matches,
        anyFine: !!window.matchMedia?.('(any-pointer: fine)')?.matches,
        maxTouchPoints: navigator.maxTouchPoints ?? 0,
    };
}

export function resolveInitialPreferredViewportSize(options: InitialViewportResolutionOptions): ViewportResolution | null {
    if (options.savedResolution) {
        return { ...options.savedResolution };
    }
    if (!options.hasLoadedGeneralOptionsFromStorage) {
        if (options.isMobileLayout) {
            return { ...options.defaultViewportSize };
        }
        return null;
    }
    return null;
}

export function computeScaledMenuViewport(viewport: ViewportResolution): PositionedViewport {
    const baseWidth = 800;
    const baseHeight = 600;
    return {
        x: Math.floor((viewport.width - baseWidth) / 2),
        y: Math.floor((viewport.height - baseHeight) / 2),
        width: baseWidth,
        height: baseHeight,
    };
}

export function computeWorldViewportBounds(viewport: PositionedViewport, hudDimensions: ViewportResolution): PositionedViewport {
    return {
        x: viewport.x,
        y: viewport.y,
        width: Math.max(1, viewport.width - hudDimensions.width),
        height: Math.max(1, viewport.height - hudDimensions.height),
    };
}
