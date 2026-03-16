import { TileSets } from '../game/theater/TileSets';
import { PaletteType } from './type/PaletteType';
import type { TheaterType, TheaterSettings } from './TheaterType';
import type { Palette } from '../data/Palette';
import type { LazyResourceCollection } from './LazyResourceCollection';
import type { TmpFile } from '../data/TmpFile';
import type { IniFile } from '../data/IniFile';
import type { FileSystem } from '../data/vfs/FileSystem';
export class Theater {
    public type: TheaterType;
    public settings: TheaterSettings;
    private palettes: LazyResourceCollection<Palette>;
    public isoPalette: Palette;
    public ovlPalette: Palette;
    public unitPalette: Palette;
    public animPalette: Palette;
    public libPalette: Palette;
    public tileSets: TileSets;
    static factory(type: TheaterType, theaterIni: IniFile, settings: TheaterSettings, tileDataCollection: any, palettesCollection: LazyResourceCollection<Palette>): Theater {
        const isoPalette = palettesCollection.get(settings.isoPaletteName);
        if (!isoPalette) {
            throw new Error(`Missing palette "${settings.isoPaletteName}"`);
        }
        const overlayPalette = palettesCollection.get(settings.overlayPaletteName);
        if (!overlayPalette) {
            throw new Error(`Missing palette "${settings.overlayPaletteName}"`);
        }
        const unitPalette = palettesCollection.get(settings.unitPaletteName);
        if (!unitPalette) {
            throw new Error(`Missing palette "${settings.unitPaletteName}"`);
        }
        const animPalette = palettesCollection.get("anim.pal");
        if (!animPalette) {
            throw new Error("Missing anim palette");
        }
        const libPalette = palettesCollection.get(settings.libPaletteName);
        if (!libPalette) {
            throw new Error("Missing lib palette " + settings.libPaletteName);
        }
        const tileSetsInstance = new TileSets(theaterIni);
        tileSetsInstance.loadTileData(tileDataCollection as FileSystem, settings.extension);
        return new Theater(type, settings, palettesCollection, isoPalette, overlayPalette, unitPalette, animPalette, libPalette, tileSetsInstance);
    }
    constructor(type: TheaterType, settings: TheaterSettings, palettes: LazyResourceCollection<Palette>, isoPalette: Palette, ovlPalette: Palette, unitPalette: Palette, animPalette: Palette, libPalette: Palette, tileSets: TileSets) {
        this.type = type;
        this.settings = settings;
        this.palettes = palettes;
        this.isoPalette = isoPalette;
        this.ovlPalette = ovlPalette;
        this.unitPalette = unitPalette;
        this.animPalette = animPalette;
        this.libPalette = libPalette;
        this.tileSets = tileSets;
    }
    getPalette(type: PaletteType, customPaletteName?: string): Palette {
        switch (type) {
            case PaletteType.Anim:
                return this.animPalette;
            case PaletteType.Overlay:
                return this.ovlPalette;
            case PaletteType.Unit:
                return this.unitPalette;
            case PaletteType.Custom:
                if (customPaletteName === "lib")
                    return this.libPalette;
                if (!customPaletteName)
                    throw new Error('Custom palette name required for PaletteType.Custom');
                const customPalette = this.palettes.get(customPaletteName + ".pal");
                if (!customPalette) {
                    throw new Error(`Custom palette "${customPaletteName}" not found`);
                }
                return customPalette;
            default:
                return this.isoPalette;
        }
    }
}
