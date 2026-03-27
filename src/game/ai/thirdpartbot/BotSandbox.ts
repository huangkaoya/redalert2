import { ThirdPartyBotInterface, ThirdPartyBotMeta } from './ThirdPartyBotInterface';
import { BotRegistry } from './BotRegistry';

/**
 * Allowed file extensions for bot scripts inside the zip.
 */
const ALLOWED_EXTENSIONS = ['.ts', '.json', '.txt', '.md', '.yml'];

/**
 * Maximum file size for a single bot script file (512 KB).
 */
const MAX_FILE_SIZE = 512 * 1024;

/**
 * Maximum total size for all files in a bot zip (10 MB).
 */
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;

/**
 * Maximum number of files in a bot zip.
 */
const MAX_FILE_COUNT = 200;

/**
 * Forbidden patterns in bot code that could indicate malicious behavior.
 */
const FORBIDDEN_PATTERNS = [
    /\beval\s*\(/,
    /\bFunction\s*\(/,
    /\bnew\s+Function\b/,
    /\bimportScripts\s*\(/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/,
    /\bdocument\s*\.\s*(cookie|write|createElement)/,
    /\bwindow\s*\.\s*(open|location|navigator)/,
    /\b__proto__\b/,
    /\bconstructor\s*\[\s*['"]constructor['"]\s*\]/,
    /\bProcess\b/,
    /\brequire\s*\(/,
    /\bimport\s*\(/,
    /\bchild_process\b/,
    /\bfs\s*\.\s*(read|write|unlink|mkdir|rmdir)/,
];

/**
 * Validates and loads uploaded bot zip files with security restrictions.
 */
export class BotSandbox {
    /**
     * Strips TypeScript-specific syntax from source code so it can be run as
     * plain JavaScript via new Function().  This is intentionally lightweight —
     * it handles the patterns that appear in the example bot and most hand-written
     * bots without pulling in a full TS compiler.
     *
     * Handled:
     *   - interface / type alias declarations (via line-by-line brace-balanced scanner)
     *   - `const enum` → plain `const` object literal so references still resolve
     *   - Inline type annotations: `: Type`, `as Type`
     *   - `readonly` and access modifiers
     *   - `import type` / `export type` statements
     *   - Non-null assertions (`!`)
     */
    static stripTypes(source: string): string {
        // 1. Remove interface and object-form type blocks using brace-depth scanner
        //    (handles any nesting depth, unlike regex)
        source = BotSandbox.removeTypescriptBlocks(source);

        // 2. Convert `const enum Foo { A = 0, B = 1 }` to `const Foo = { A: 0, B: 1 };`
        //    so references like Foo.A still resolve at runtime.
        source = source.replace(/\bconst\s+enum\s+(\w+)\s*\{([^}]*)\}/g, (_m, name: string, body: string) => {
            let autoVal = 0;
            const members = body.split(',')
                .map((m: string) => m.trim().replace(/\/\/[^\n]*/g, '').trim())
                .filter(Boolean)
                .map((m: string) => {
                    const eq = m.indexOf('=');
                    if (eq !== -1) {
                        const key = m.slice(0, eq).trim();
                        const val = parseInt(m.slice(eq + 1).trim(), 10);
                        autoVal = val + 1;
                        return `${key}: ${val}`;
                    }
                    return `${m.trim()}: ${autoVal++}`;
                });
            return `const ${name} = { ${members.join(', ')} };`;
        });

        // 3. Remove `import type ...` / `export type ...` lines
        source = source.replace(/^\s*(?:import|export)\s+type\s+[^\n]+\n?/gm, '');
        // Remove regular import statements (no module system in sandbox)
        source = source.replace(/^\s*import\s+[^\n]+from\s+['"][^'"]+['"]\s*;?\s*\n?/gm, '');
        // Remove `declare` statements (type-only, emit no code)
        source = source.replace(/^\s*declare\s+[^\n]+\n?/gm, '');

        // 4. `foo as any` / `foo as Bar` casts
        source = source.replace(/\bas\s+\w[\w<>, [\]|&]*/g, '');

        // 5. Generic type parameters on function declarations: `function foo<T>(`
        source = source.replace(/(\bfunction\s+\w+)\s*<[^>]*>/g, '$1');

        // 6. Return type annotations: `): ReturnType {` or `): ReturnType;`
        source = source.replace(/\)\s*:\s*[\w<>[\]|&., ]+(?=\s*[{;])/g, ')');

        // 7. Strip type annotations from function/method parameter lists only.
        //    Each parameter is split by comma and handled individually so that
        //    object-literal key:value pairs are never corrupted.
        source = BotSandbox.stripFunctionParamTypes(source);

        // 8. Variable type annotations: `const x: Type =`
        source = source.replace(/((?:const|let|var)\s+\w+)\s*:\s*[\w<>[\]|&., ]+\s*(?==)/g, '$1 ');

        // 9. Access modifiers and readonly
        source = source.replace(/\b(?:public|private|protected|readonly)\s+/g, '');

        // 10. Non-null assertions: `foo!.bar` → `foo.bar`, `foo!` → `foo`
        source = source.replace(/(\w)!/g, '$1');

        // 11. Leftover bare generic casts: `<SomeType>value`
        source = source.replace(/<\w[\w<>, [\]]*>\s*(?=[\w(])/g, '');

        return source;
    }

    /**
     * Removes TypeScript `interface Foo { ... }` and `type Foo = { ... }` blocks
     * using a line-by-line brace-depth scanner so any nesting depth is handled.
     */
    private static removeTypescriptBlocks(source: string): string {
        const lines = source.split('\n');
        const result: string[] = [];
        let depth = 0;
        let inBlock = false;

        for (const line of lines) {
            if (!inBlock) {
                if (/^\s*(?:export\s+)?(?:interface|type)\s+\w+/.test(line) && line.includes('{')) {
                    inBlock = true;
                    depth = 0;
                    for (const c of line) {
                        if (c === '{') depth++;
                        else if (c === '}') depth--;
                    }
                    if (depth <= 0) inBlock = false;
                    continue;
                }
                result.push(line);
            } else {
                for (const c of line) {
                    if (c === '{') depth++;
                    else if (c === '}') depth--;
                }
                if (depth <= 0) inBlock = false;
            }
        }

        return result.join('\n');
    }

    /**
     * Strips type annotations from function / method parameter lists only.
     * Each parameter is split by comma and handled individually so that
     * object-literal `key: value` pairs are never corrupted.
     */
    private static stripFunctionParamTypes(source: string): string {
        // Strip `: TypeAnnotation` from a single parameter token.
        // Handles optional `?` marker and rest `...` spread.
        const stripParam = (p: string): string =>
            p.replace(/^(\s*(?:\.{3})?\w+)\s*\??\s*:\s*[^,)]+/, '$1');

        const stripParams = (paramStr: string): string => {
            if (!paramStr.includes(':')) return paramStr;
            return paramStr.split(',').map(stripParam).join(',');
        };

        // function declarations / expressions: `function name(params)`
        source = source.replace(
            /(\bfunction\s*\w*\s*)\(([^)]*)\)/g,
            (_m: string, pre: string, params: string) => pre + '(' + stripParams(params) + ')',
        );

        // Arrow function params: (params) =>
        source = source.replace(
            /\(([^)]*)\)\s*(?==\s*>)/g,
            (_m: string, params: string) => '(' + stripParams(params) + ') ',
        );

        return source;
    }

    /**
     * Validates a bot script source code for forbidden patterns.
     * @returns Array of security violation messages, empty if safe.
     */
    static validateSource(source: string): string[] {
        const violations: string[] = [];
        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(source)) {
                violations.push(`Forbidden pattern detected: ${pattern.source}`);
            }
        }
        return violations;
    }

    /**
     * Validates a file entry from a zip archive.
     */
    static validateFileEntry(fileName: string, fileSize: number): string[] {
        const violations: string[] = [];

        // Check path traversal
        if (fileName.includes('..') || fileName.startsWith('/') || fileName.startsWith('\\')) {
            violations.push(`Path traversal detected in file name: ${fileName}`);
        }

        // Check extension
        const ext = '.' + fileName.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext) && !fileName.endsWith('/')) {
            violations.push(`Disallowed file extension: ${ext} (file: ${fileName})`);
        }

        // Check file size
        if (fileSize > MAX_FILE_SIZE) {
            violations.push(`File too large: ${fileName} (${fileSize} bytes, max ${MAX_FILE_SIZE})`);
        }

        return violations;
    }

    /**
     * Validates the total content of a bot zip.
     */
    static validateZipContent(files: { name: string; size: number }[]): string[] {
        const violations: string[] = [];

        if (files.length > MAX_FILE_COUNT) {
            violations.push(`Too many files: ${files.length} (max ${MAX_FILE_COUNT})`);
        }

        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > MAX_TOTAL_SIZE) {
            violations.push(`Total size too large: ${totalSize} bytes (max ${MAX_TOTAL_SIZE})`);
        }

        for (const file of files) {
            violations.push(...this.validateFileEntry(file.name, file.size));
        }

        return violations;
    }

    /**
     * Loads and registers a bot from its main script source code.
     * The script must export a bot object conforming to ThirdPartyBotInterface.
     */
    static loadBotFromSource(
        mainScript: string,
        sourceFileName: string,
    ): ThirdPartyBotMeta | null {
        // Validate source
        const violations = this.validateSource(mainScript);
        if (violations.length > 0) {
            console.error('[BotSandbox] Security violations:', violations);
            return null;
        }

        try {
            // Create a restricted scope for the bot
            const exports: any = {};
            const module = { exports };
            const restrictedGlobals = {
                console: {
                    log: (...args: any[]) => console.log(`[Bot:${sourceFileName}]`, ...args),
                    warn: (...args: any[]) => console.warn(`[Bot:${sourceFileName}]`, ...args),
                    error: (...args: any[]) => console.error(`[Bot:${sourceFileName}]`, ...args),
                    info: (...args: any[]) => console.info(`[Bot:${sourceFileName}]`, ...args),
                },
                Math,
                Date,
                JSON,
                Array,
                Object,
                String,
                Number,
                Boolean,
                Map,
                Set,
                Promise,
                parseInt,
                parseFloat,
                isNaN,
                isFinite,
                undefined,
                NaN,
                Infinity,
            };

            // Execute bot script in restricted scope
            const wrappedScript = `
                "use strict";
                return (function(module, exports, ${Object.keys(restrictedGlobals).join(', ')}) {
                    ${mainScript}
                    return module.exports;
                });
            `;

            const factory = new Function(wrappedScript)();
            const botExport = factory(
                module,
                exports,
                ...Object.values(restrictedGlobals),
            );

            // Validate bot export
            if (!botExport || !botExport.id || !botExport.createBot) {
                console.error('[BotSandbox] Invalid bot export: must have "id" and "createBot"');
                return null;
            }

            const meta: ThirdPartyBotMeta = {
                id: String(botExport.id),
                displayName: String(botExport.displayName || botExport.id),
                version: String(botExport.version || '1.0.0'),
                author: String(botExport.author || 'Unknown'),
                description: botExport.description ? String(botExport.description) : undefined,
                factory: (name: string, country: string): ThirdPartyBotInterface => {
                    const bot = botExport.createBot(name, country);
                    return {
                        id: meta.id,
                        displayName: meta.displayName,
                        version: meta.version,
                        author: meta.author,
                        description: meta.description,
                        onGameStart: (gameApi: any) => bot.onGameStart?.(gameApi),
                        onGameTick: (gameApi: any) => bot.onGameTick?.(gameApi),
                        onGameEvent: (event: any, data: any) => bot.onGameEvent?.(event, data),
                        dispose: () => bot.dispose?.(),
                    };
                },
                builtIn: false,
                sourceFile: sourceFileName,
            };

            // Register the bot
            BotRegistry.getInstance().register(meta);
            return meta;
        } catch (e) {
            console.error('[BotSandbox] Failed to load bot:', e);
            return null;
        }
    }
}
