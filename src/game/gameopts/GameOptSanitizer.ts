import { clamp } from "@/util/math";

const MAX_CREDITS = 50000;

export class GameOptSanitizer {
    static sanitize(gameOpts: any, rules: any): void {
        const mpDialogSettings = rules.mpDialogSettings;
        const minMoney = mpDialogSettings.minMoney ?? 0;
        const maxMoney = Math.max(mpDialogSettings.maxMoney ?? MAX_CREDITS, MAX_CREDITS);
        const minUnitCount = mpDialogSettings.minUnitCount ?? 0;
        const maxUnitCount = mpDialogSettings.maxUnitCount ?? 10;
        gameOpts.credits = Math.floor(clamp(gameOpts.credits, minMoney, maxMoney));
        gameOpts.gameSpeed = Math.floor(clamp(gameOpts.gameSpeed, 0, 6));
        gameOpts.unitCount = Math.floor(clamp(gameOpts.unitCount, minUnitCount, maxUnitCount));
    }
}
