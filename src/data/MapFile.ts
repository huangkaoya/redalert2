import * as mapObjects from "@/data/MapObjects";
import { IniFile } from "@/data/IniFile";
import { TheaterType } from "@/engine/TheaterType";
import * as stringUtil from "@/util/string";
import { Format5 } from "@/data/encoding/Format5";
import { RgbBitmap } from "@/data/Bitmap";
import { TagsReader } from "@/data/map/tag/TagsReader";
import { TriggerReader } from "@/data/map/trigger/TriggerReader";
import { DataStream } from "@/data/DataStream";
import { MapLighting } from "@/data/map/MapLighting";
import { CellTagsReader } from "@/data/map/tag/CellTagsReader";
import { Variable } from "@/data/map/Variable";
import { SpecialFlags } from "@/data/map/SpecialFlags";

type MapTile = {
  dx: number;
  dy: number;
  rx: number;
  ry: number;
  z: number;
  tileNum: number;
  subTile: number;
};

type Waypoint = {
  number: number;
  rx: number;
  ry: number;
};

export class MapFile extends IniFile {
  static artSectionPrefix = "ART";

  declare fullSize: { x: number; y: number; width: number; height: number };
  declare localSize: { x: number; y: number; width: number; height: number };
  declare theaterType: TheaterType;
  declare iniFormat: number;
  declare tiles: MapTile[];
  declare maxTileNum: number;
  declare waypoints: Waypoint[];
  declare structures: mapObjects.Structure[];
  declare vehicles: mapObjects.Vehicle[];
  declare infantries: mapObjects.Infantry[];
  declare aircrafts: mapObjects.Aircraft[];
  declare terrains: mapObjects.Terrain[];
  declare overlays: mapObjects.Overlay[];
  declare maxOverlayId: number;
  declare smudges: mapObjects.Smudge[];
  declare lighting: MapLighting;
  declare ionLighting: MapLighting;
  declare tags: any;
  declare triggers: any;
  declare unknownEventTypes: any;
  declare unknownActionTypes: any;
  declare cellTags: any;
  declare variables: Map<number, Variable>;
  declare startingLocations: { x: number; y: number }[];
  declare specialFlags: SpecialFlags;
  declare artOverrides?: IniFile;

  fromString(iniString: string) {
    super.fromString(iniString);
    const mapSection = this.getSection("Map");
    if (!mapSection) {
      throw new Error("[Map] section not found");
    }

    const size = mapSection.getNumberArray("Size");
    this.fullSize = {
      x: size[0],
      y: size[1],
      width: size[2],
      height: size[3],
    };

    const localSize = mapSection.getNumberArray("LocalSize");
    this.localSize = {
      x: localSize[0],
      y: localSize[1],
      width: localSize[2],
      height: localSize[3],
    };

    this.theaterType = mapSection.getEnum(
      "Theater",
      TheaterType,
      TheaterType.None,
      true,
    );
    if (this.theaterType === TheaterType.None) {
      throw new Error(
        `Unsupported theater type "${mapSection.getString("Theater")}"`,
      );
    }

    const basicSection = this.getSection("Basic");
    this.iniFormat = basicSection?.getNumber("NewINIFormat") ?? 0;

    this.readTiles();
    this.readWaypoints(this.getOrCreateSection("Waypoints"));
    this.readStructures(this.getOrCreateSection("Structures"));
    this.readVehicles();
    this.readInfantries();
    this.readAircrafts();
    this.readTerrains(this.getOrCreateSection("Terrain"));
    this.readOverlays();
    this.readSmudges();
    this.readLighting();
    this.readTagsAndTriggers();
    this.readCellTags(this.iniFormat);
    this.readVariableNames();
    this.startingLocations = this.readStartingLocations(this.waypoints);
    this.specialFlags = new SpecialFlags().read(
      this.getOrCreateSection("SpecialFlags"),
    );
    return this;
  }

  fromJson(i: any) {
    if (i[MapFile.artSectionPrefix]) {
      let { [MapFile.artSectionPrefix]: e, ...t } = i;
      (this.artOverrides = new IniFile(e)), (i = t);
    }
    return super.fromJson(i);
  }

  readStartingLocations(waypoints: Waypoint[]) {
    const startingLocations: { x: number; y: number }[] = [];
    for (const waypoint of waypoints
      .filter((entry) => entry.number < 8)
      .sort((left, right) => left.number - right.number)) {
      startingLocations.push({ x: waypoint.rx, y: waypoint.ry });
    }
    return startingLocations;
  }

  readLighting() {
    var e = this.getOrCreateSection("Lighting");
    (this.lighting = new MapLighting().read(e)),
      (this.ionLighting = new MapLighting().read(e, "Ion")),
      (this.ionLighting.forceTint = true);
  }

  readTagsAndTriggers() {
    const tagsSection = this.getOrCreateSection("Tags");
    this.tags = new TagsReader().read(tagsSection);
    const triggersSection = this.getOrCreateSection("Triggers");
    const eventsSection = this.getOrCreateSection("Events");
    const actionsSection = this.getOrCreateSection("Actions");
    const {
      triggers,
      unknownEventTypes,
      unknownActionTypes,
    } = new TriggerReader().read(triggersSection, eventsSection, actionsSection, this.tags);
    this.triggers = triggers;
    this.unknownEventTypes = unknownEventTypes;
    this.unknownActionTypes = unknownActionTypes;
  }

  readCellTags(e: number) {
    this.cellTags = new CellTagsReader().read(
      this.getOrCreateSection("CellTags"),
      e,
    );
  }

  readVariableNames() {
    const section = this.getOrCreateSection("VariableNames");
    const variables = new Map<number, Variable>();
    for (const [key, rawValue] of section.entries) {
      const index = Number(key);
      if (Number.isNaN(index)) {
        console.warn(
          `Map [VariableNames] contains non-numeric index "${key}". Skipping.`,
        );
        continue;
      }

      const value = this.normalizeIniEntryValue(rawValue);
      const [name = "", isGlobal = "0"] = value.split(",");
      variables.set(index, new Variable(name, Boolean(Number(isGlobal))));
    }
    this.variables = variables;
  }

  readTiles() {
    let e = this.getSection("IsoMapPack5");
    if (!e) throw new Error("[IsoMapPack5] section not found");
    var t = stringUtil.base64StringToUint8Array(e.getConcatenatedValues()),
      i = (2 * this.fullSize.width - 1) * this.fullSize.height,
      decodedData = new Uint8Array(11 * i + 4);
    Format5.decodeInto(t, decodedData);
    let s = new DataStream(decodedData.buffer),
      a = 2 * this.fullSize.width - 1;
    var n,
      o,
      l,
      c,
      height = this.fullSize.height,
      h = (e: number, t: number) => t * a + e;
    this.tiles = new Array(a * height);
    for (let T = (this.maxTileNum = 0); T < i; T++) {
      const rx = s.readUint16();
      const ry = s.readUint16();
      const tileNum = Math.max(0, s.readInt16());
      this.maxTileNum = Math.max(this.maxTileNum, tileNum);
      s.readInt16();
      const subTile = s.readUint8();
      const z = s.readUint8();
      s.readUint8();
      const dx = rx - ry + this.fullSize.width - 1;
      const dy = rx + ry - this.fullSize.width - 1;
      if (
        0 <= dx &&
        dx < 2 * this.fullSize.width &&
        0 <= dy &&
        dy < 2 * this.fullSize.height
      ) {
        const tile: MapTile = {
          dx,
          dy,
          rx,
          ry,
          z,
          tileNum,
          subTile,
        };
        this.tiles[h(dx, Math.floor(dy / 2))] = tile;
      }
    }
    for (let v = 0; v < this.fullSize.height; v++)
      for (let e = 0; e <= 2 * this.fullSize.width - 2; e++)
        this.tiles[h(e, v)] ||
          ((n = e),
          (c =
            (o = 2 * v + (e % 2)) -
            (l = (n + o) / 2 + 1) +
            this.fullSize.width +
            1),
          (this.tiles[h(e, v)] = {
            dx: n,
            dy: o,
            rx: l,
            ry: c,
            z: 0,
            tileNum: 0,
            subTile: 0,
          }));
  }

  readWaypoints(e: any) {
    this.waypoints = [];
    for (const [key, rawValue] of e.entries) {
      const number = parseInt(key, 10);
      const value = parseInt(this.normalizeIniEntryValue(rawValue), 10);
      if (Number.isNaN(number) || Number.isNaN(value)) {
        continue;
      }
      const ry = Math.floor(value / 1000);
      const rx = value - 1000 * ry;
      this.waypoints.push({ number, rx, ry });
    }
  }

  readStructures(e: any) {
    this.structures = [];
    for (const [, rawValue] of e.entries) {
      const values = this.normalizeIniEntryValue(rawValue).split(",");
      if (values.length > 15) {
        const structure = new mapObjects.Structure();
        structure.owner = values[0];
        structure.name = values[1];
        structure.health = Number(values[2]);
        structure.rx = Number(values[3]);
        structure.ry = Number(values[4]);
        structure.tag = this.readTagId(values[6]);
        structure.poweredOn = Boolean(Number(values[9]));
        this.structures.push(structure);
      }
    }
  }

  readTagId(e: string) {
    return "none" !== e.toLowerCase() ? e : undefined;
  }

  readVehicles() {
    this.vehicles = [];
    const section = this.getSection("Units");
    if (!section) {
      return;
    }

    for (const rawValue of section.entries.values()) {
      const values = this.normalizeIniEntryValue(rawValue).split(",");
      if (values.length <= 11) {
        console.warn(`Invalid Vehicle entry: "${this.normalizeIniEntryValue(rawValue)}"`);
        continue;
      }

      const vehicle = new mapObjects.Vehicle();
      vehicle.owner = values[0];
      vehicle.name = values[1];
      vehicle.health = Number(values[2]);
      vehicle.rx = Number(values[3]);
      vehicle.ry = Number(values[4]);
      vehicle.direction = Number(values[5]);
      vehicle.tag = this.readTagId(values[7]);
      vehicle.veterancy = Number(values[8]);
      vehicle.onBridge = values[10] === "1";
      this.vehicles.push(vehicle);
    }
  }

  readInfantries() {
    this.infantries = [];
    const section = this.getSection("Infantry");
    if (!section) {
      return;
    }

    for (const rawValue of section.entries.values()) {
      const values = this.normalizeIniEntryValue(rawValue).split(",");
      if (values.length <= 8) {
        console.warn(`Invalid Infantry entry: "${this.normalizeIniEntryValue(rawValue)}"`);
        continue;
      }

      const infantry = new mapObjects.Infantry();
      infantry.owner = values[0];
      infantry.name = values[1];
      infantry.health = Number(values[2]);
      infantry.rx = Number(values[3]);
      infantry.ry = Number(values[4]);
      infantry.subCell = Number(values[5]);
      infantry.direction = Number(values[7]);
      infantry.tag = this.readTagId(values[8]);
      infantry.veterancy = Number(values[9]);
      infantry.onBridge = values[11] === "1";
      this.infantries.push(infantry);
    }
  }

  readAircrafts() {
    this.aircrafts = [];
    const section = this.getSection("Aircraft");
    if (!section) {
      return;
    }

    for (const rawValue of section.entries.values()) {
      const values = this.normalizeIniEntryValue(rawValue).split(",");
      const aircraft = new mapObjects.Aircraft();
      aircraft.owner = values[0];
      aircraft.name = values[1];
      aircraft.health = Number(values[2]);
      aircraft.rx = Number(values[3]);
      aircraft.ry = Number(values[4]);
      aircraft.direction = Number(values[5]);
      aircraft.tag = this.readTagId(values[7]);
      aircraft.veterancy = Number(values[8]);
      aircraft.onBridge = values[values.length - 4] === "1";
      this.aircrafts.push(aircraft);
    }
  }

  readTerrains(e: any) {
    this.terrains = [];
    for (const [key, rawValue] of e.entries) {
      const tileIndex = Number(key);
      if (!Number.isNaN(tileIndex)) {
        const terrain = new mapObjects.Terrain();
        terrain.name = this.normalizeIniEntryValue(rawValue);
        terrain.rx = tileIndex % 1000;
        terrain.ry = Math.floor(tileIndex / 1000);
        this.terrains.push(terrain);
      }
    }
  }

  readOverlays() {
    (this.overlays = []), (this.maxOverlayId = 0);
    let t = this.getSection("OverlayPack");
    if (t) {
      var i = stringUtil.base64StringToUint8Array(t.getConcatenatedValues()),
        overlayData = new Uint8Array(1 << 18);
      Format5.decodeInto(i, overlayData, 80);
      let e = this.getSection("OverlayDataPack");
      if (e) {
        var i = stringUtil.base64StringToUint8Array(e.getConcatenatedValues()),
          s = new Uint8Array(1 << 18);
        Format5.decodeInto(i, s, 80);
        for (let t = 0; t < this.fullSize.height; t++)
          for (let e = 2 * this.fullSize.width - 2; 0 <= e; e--) {
            var a = e,
              n = 2 * t + (e % 2),
              o = (a + n) / 2 + 1,
              l = n - o + this.fullSize.width + 1,
              a = o + 512 * l,
              n = overlayData[a];
            if (255 !== n) {
              a = s[a];
              let e = new mapObjects.Overlay();
              (e.id = n),
                (e.value = a),
                (e.rx = o),
                (e.ry = l),
                this.overlays.push(e),
                (this.maxOverlayId = Math.max(this.maxOverlayId, n));
            }
          }
      } else
        console.warn(
          "[OverlayDataPack] section not found. Skipping.",
        );
    } else console.warn("[Overlay] section not found. Skipping.");
  }

  readSmudges() {
    this.smudges = [];
    const section = this.getSection("Smudge");
    if (!section) {
      return;
    }

    for (const rawValue of section.entries.values()) {
      const values = this.normalizeIniEntryValue(rawValue).split(",");
      if (values.length <= 2) {
        console.warn(`Invalid Smudge entry: "${this.normalizeIniEntryValue(rawValue)}"`);
        continue;
      }

      const smudge = new mapObjects.Smudge();
      smudge.name = values[0];
      smudge.rx = Number(values[1]);
      smudge.ry = Number(values[2]);
      this.smudges.push(smudge);
    }
  }

  decodePreviewImage() {
    let e = this.getSection("Preview"),
      t = this.getSection("PreviewPack");
    if (e && t) {
      var [, , i, r] = e.getArray("Size").map((e) => Number(e)),
        s = stringUtil.base64StringToUint8Array(t.getConcatenatedValues()),
        bitmap = new RgbBitmap(i, r);
      return Format5.decodeInto(s, bitmap.data), bitmap;
    }
  }

  private normalizeIniEntryValue(value: string | string[]): string {
    return Array.isArray(value) ? value.join(",") : value;
  }
}
  
