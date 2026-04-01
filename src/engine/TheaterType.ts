export interface TheaterSettings {
    isoPaletteName: string;
    overlayPaletteName: string;
    unitPaletteName: string;
    libPaletteName: string;
    extension: string;
    type: TheaterType;
    [key: string]: any;
}

export enum TheaterType {
    None = 0,
    Temperate = 1,
    Urban = 2,
    Snow = 4,
    Lunar = 8,
    Desert = 16,
    NewUrban = 32,
    All = 63
}
