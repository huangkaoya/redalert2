export interface DirectoryImportPlan {
    immediateMixes: string[];
    deferredMixes: string[];
    deferTaunts: boolean;
}

export function createDirectoryImportPlan(essentialMixes: string[], tauntsDirName: string): DirectoryImportPlan {
    const immediateMixes: string[] = [];
    const deferredMixes: string[] = [];
    for (const mixName of essentialMixes) {
        if (mixName.toLowerCase() === "theme.mix") {
            deferredMixes.push(mixName);
            continue;
        }
        immediateMixes.push(mixName);
    }
    return {
        immediateMixes,
        deferredMixes,
        deferTaunts: !!tauntsDirName,
    };
}
