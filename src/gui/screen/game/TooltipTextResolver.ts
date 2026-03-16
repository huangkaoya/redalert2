function resolveUiNameText(uiName: string | undefined, strings: any): string | undefined {
    let resolved: string | undefined;
    if (uiName !== undefined && uiName !== '') {
        if (uiName.includes('{')) {
            resolved = uiName.replace(/\{([^}]+)\}/g, (_match, key) => strings.get(key));
        }
        else if (strings.has(uiName) || uiName.match(/^NOSTR:/i)) {
            resolved = strings.get(uiName);
        }
    }
    return resolved;
}
function resolveHoverTooltipText(hover: any, strings: any, debugMode = false): string | undefined {
    let tooltip: string | undefined;
    if (hover?.entity) {
        const uiName = hover.entity.getUiName?.();
        tooltip = resolveUiNameText(uiName, strings);
        if (debugMode && tooltip !== undefined) {
            tooltip += ` (ID: ${hover.entity.gameObject.id})`;
        }
    }
    else if (hover?.uiObject) {
        tooltip = hover.uiObject.userData.tooltip;
    }
    return tooltip;
}
function resolveSidebarItemTooltipText(item: any, sidebarModel: any, strings: any): string | undefined {
    if (!item?.target?.rules) {
        return undefined;
    }
    const name = strings.get(item.target.rules.uiName);
    if (item.target.rules.cost === undefined) {
        return name;
    }
    let cost = item.target.rules.cost;
    if (typeof sidebarModel?.computePurchaseCost === 'function') {
        cost = sidebarModel.computePurchaseCost(item.target.rules);
    }
    return `${name}\n$${cost}`;
}
export { resolveUiNameText, resolveHoverTooltipText, resolveSidebarItemTooltipText };
