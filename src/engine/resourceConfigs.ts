import { TheaterType } from "./TheaterType";
export enum ResourceType {
    IsoSnow = 0,
    IsoTemp = 1,
    IsoUrb = 2,
    BuildGen = 3,
    TheaterSnow = 4,
    TheaterTemp = 5,
    TheaterUrb = 6,
    TheaterSnow2 = 7,
    TheaterTemp2 = 8,
    TheaterUrb2 = 9,
    Ui = 10,
    UiAlly = 11,
    UiSov = 12,
    Anims = 13,
    Vxl = 14,
    Cameo = 15,
    Ini = 16,
    Strings = 17,
    EvaAlly = 18,
    EvaSov = 19,
    Sounds = 20,
    HalloweenMix = 21,
    XmasMix = 22
}
export type ResourceId = string;
export interface ResourceConfig {
    id: ResourceId;
    src: string;
    type: 'binary' | 'text' | 'json';
    sizeHint?: number;
}
export const resourceConfigs = new Map<ResourceType, ResourceConfig>()
    .set(ResourceType.IsoSnow, {
    id: "isoSnow",
    src: "isosnow.mix",
    type: "binary",
    sizeHint: 28758698,
})
    .set(ResourceType.IsoTemp, {
    id: "isoTemp",
    src: "isotemp.mix",
    type: "binary",
    sizeHint: 29171410,
})
    .set(ResourceType.IsoUrb, {
    id: "isoUrb",
    src: "isourb.mix",
    type: "binary",
    sizeHint: 31811402,
})
    .set(ResourceType.BuildGen, {
    id: "buildGen",
    src: "build-gen.mix",
    type: "binary",
    sizeHint: 27801690,
})
    .set(ResourceType.TheaterSnow, {
    id: "theater.snow",
    src: "snow.mix",
    type: "binary",
    sizeHint: 18421274,
})
    .set(ResourceType.TheaterTemp, {
    id: "theater.temp",
    src: "temperat.mix",
    type: "binary",
    sizeHint: 2728266,
})
    .set(ResourceType.TheaterUrb, {
    id: "theater.urb",
    src: "urban.mix",
    type: "binary",
    sizeHint: 2726218,
})
    .set(ResourceType.TheaterSnow2, {
    id: "theater.snow2",
    src: "sno.mix",
    type: "binary",
    sizeHint: 10898,
})
    .set(ResourceType.TheaterTemp2, {
    id: "theater.temp2",
    src: "tem.mix",
    type: "binary",
    sizeHint: 10850,
})
    .set(ResourceType.TheaterUrb2, {
    id: "theater.urb2",
    src: "urb.mix",
    type: "binary",
    sizeHint: 10850,
})
    .set(ResourceType.UiAlly, {
    id: "uially",
    src: "sidec01.mix",
    type: "binary",
    sizeHint: 2099412,
})
    .set(ResourceType.UiSov, {
    id: "uisov",
    src: "sidec02.mix",
    type: "binary",
    sizeHint: 2102564,
})
    .set(ResourceType.Anims, {
    id: "anims",
    src: "anims.mix",
    type: "binary",
    sizeHint: 15867898,
})
    .set(ResourceType.Vxl, {
    id: "vxl",
    src: "vxl.mix",
    type: "binary",
    sizeHint: 5271701,
})
    .set(ResourceType.Cameo, {
    id: "cameo",
    src: "cameo.mix",
    type: "binary",
    sizeHint: 608120,
})
    .set(ResourceType.Ini, {
    id: "ini",
    src: "ini.mix",
    type: "binary",
    sizeHint: 1000842,
})
    .set(ResourceType.Ui, {
    id: "ui",
    src: "ui.mix",
    type: "binary",
    sizeHint: 4424093,
})
    .set(ResourceType.Strings, {
    id: "strings",
    src: "strings.mix",
    type: "binary",
    sizeHint: 485818,
})
    .set(ResourceType.EvaAlly, {
    id: "evaally",
    src: "eva-ally.mix",
    type: "binary",
    sizeHint: 1835436,
})
    .set(ResourceType.EvaSov, {
    id: "evasov",
    src: "eva-sov.mix",
    type: "binary",
    sizeHint: 2021760,
})
    .set(ResourceType.Sounds, {
    id: "sounds",
    src: "sounds.mix",
    type: "binary",
    sizeHint: 17684750,
})
    .set(ResourceType.HalloweenMix, {
    id: "halloweenmix",
    src: "expandspawn09.mix",
    type: "binary",
    sizeHint: 20312,
})
    .set(ResourceType.XmasMix, {
    id: "xmasmix",
    src: "expandspawn10.mix",
    type: "binary",
    sizeHint: 10318,
});
export const resourcesForPrefetch: ResourceType[] = [
    ResourceType.BuildGen,
    ResourceType.Sounds,
    ResourceType.Anims,
    ResourceType.Vxl,
    ResourceType.IsoUrb,
    ResourceType.TheaterUrb,
    ResourceType.TheaterUrb2,
    ResourceType.IsoTemp,
    ResourceType.TheaterTemp,
    ResourceType.TheaterTemp2,
    ResourceType.IsoSnow,
    ResourceType.TheaterSnow,
    ResourceType.TheaterSnow2,
];
export const theaterSpecificResources = new Map<TheaterType, ResourceType[]>()
    .set(TheaterType.Snow, [
    ResourceType.TheaterSnow,
    ResourceType.TheaterSnow2,
    ResourceType.IsoSnow,
])
    .set(TheaterType.Temperate, [
    ResourceType.TheaterTemp,
    ResourceType.TheaterTemp2,
    ResourceType.IsoTemp,
])
    .set(TheaterType.Urban, [
    ResourceType.TheaterUrb,
    ResourceType.TheaterUrb2,
    ResourceType.IsoUrb,
]);
