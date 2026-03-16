import { Palette } from '../data/Palette';
import { VxlFile } from '../data/VxlFile';
import { Renderer } from '../engine/gfx/Renderer';
import { WorldScene } from '../engine/renderable/WorldScene';
import { VxlNonBatchedBuilder } from '../engine/renderable/builder/VxlNonBatchedBuilder';
import { UiAnimationLoop } from '../engine/UiAnimationLoop';
import { PointerEvents } from '../gui/PointerEvents';
import { CompositeDisposable } from '../util/disposable/CompositeDisposable';
import { CameraZoomControls } from './CameraZoomControls';
import { BoxedVar } from '../util/BoxedVar';
import { VxlGeometryPool } from '../engine/renderable/builder/vxlGeometry/VxlGeometryPool';
import { VxlGeometryCache } from '../engine/gfx/geometry/VxlGeometryCache';
import { ShadowQuality } from '../engine/renderable/entity/unit/ShadowQuality';
import { CanvasMetrics } from '../gui/CanvasMetrics';
import { VirtualFileSystem } from '../data/vfs/VirtualFileSystem';
import { Renderable } from '../engine/gfx/RenderableContainer';
import * as THREE from 'three';
const VXL_FILES = [
    "1tnk.vxl", "1tnkbarl.vxl", "1tnktur.vxl", "2tnk.vxl", "2tnkbarl.vxl",
    "2tnktur.vxl", "3tnk.vxl", "3tnkbarl.vxl", "3tnktur.vxl", "4tnk.vxl",
    "4tnkbarl.vxl", "4tnktur.vxl", "aegis.vxl", "apache.vxl", "apc.vxl",
    "apcw.vxl", "art2.vxl", "art2barl.vxl", "art2tur.vxl", "arty.vxl",
    "artybarl.vxl", "asw.vxl", "axle.vxl", "bana.vxl", "beag.vxl",
    "bggy.vxl", "bike.vxl", "bus.vxl", "car.vxl", "cargocar.vxl",
    "carrier.vxl", "cdest.vxl", "cdestwo.vxl", "cmin.vxl", "cmon.vxl",
    "cona.vxl", "cop.vxl", "cplane.vxl", "cruise.vxl", "dest.vxl",
    "destwo.vxl", "dmisl.vxl", "dpod.vxl", "dred.vxl", "dredwo.vxl",
    "dshp.vxl", "euroc.vxl", "falc.vxl", "flak.vxl", "flaktur.vxl",
    "flata.vxl", "fortress.vxl", "ftnk.vxl", "fv.vxl", "fvtur.vxl",
    "fvtur1.vxl", "fvtur10.vxl", "fvtur11.vxl", "fvtur12.vxl", "fvtur13.vxl",
    "fvtur14.vxl", "fvtur2.vxl", "fvtur3.vxl", "fvtur4.vxl", "fvtur5.vxl",
    "fvtur6.vxl", "fvtur7.vxl", "fvtur8.vxl", "fvtur9.vxl", "gastank.vxl",
    "gtgcanbarl.vxl", "gtgcantur.vxl", "gtnk.vxl", "gtnkbarl.vxl", "gtnktur.vxl",
    "harv.vxl", "harvtur.vxl", "heli.vxl", "hind.vxl", "hmec.vxl",
    "hornet.vxl", "horv.vxl", "htk.vxl", "htkbarl.vxl", "htktur.vxl",
    "htnk.vxl", "htnkbarl.vxl", "htnktur.vxl", "hvr.vxl", "hvrtur.vxl",
    "hwtz.vxl", "hyd.vxl", "icbm.vxl", "jeep.vxl", "jeeptur.vxl",
    "laser.vxl", "lcrf.vxl", "limo.vxl", "lpst.vxl", "ltnk.vxl",
    "ltnkbarl.vxl", "ltnktur.vxl", "m113.vxl", "m113tur.vxl", "mcv.vxl",
    "misl.vxl", "mislchem.vxl", "mislmlti.vxl", "mislorca.vxl", "mislsam.vxl",
    "mlrs.vxl", "mlrstur.vxl", "mmchbarl.vxl", "mnly.vxl", "monocar.vxl",
    "monoeng.vxl", "mrj.vxl", "mrjtur.vxl", "mtnk.vxl", "mtnkbarl.vxl",
    "mtnktur.vxl", "mtrb.vxl", "mtrs.vxl", "mtrt.vxl", "orca.vxl",
    "orcab.vxl", "orcatran.vxl", "outp.vxl", "pdplane.vxl", "phal.vxl",
    "pick.vxl", "piece.vxl", "probe.vxl", "propa.vxl", "ptruck.vxl",
    "pulscan.vxl", "repair.vxl", "rtnk.vxl", "rtnkbarl.vxl", "rtnktur.vxl",
    "sam.vxl", "sapc.vxl", "scrin.vxl", "shad.vxl", "smcv.vxl",
    "sonic.vxl", "sonictur.vxl", "sref.vxl", "sreftur.vxl", "sreftur1.vxl",
    "sreftur2.vxl", "sreftur3.vxl", "stang.vxl", "stnk.vxl", "sub.vxl",
    "subt.vxl", "subtank.vxl", "suvb.vxl", "suvw.vxl", "taxi.vxl",
    "tire.vxl", "tnkd.vxl", "tractor.vxl", "tran.vxl", "trnsport.vxl",
    "trs.vxl", "truck2.vxl", "trucka.vxl", "truckb.vxl", "truk.vxl",
    "ttnk.vxl", "ttnktur.vxl", "tug.vxl", "utnk.vxl", "v3.vxl",
    "v3rocket.vxl", "v3wo.vxl", "vlad.vxl", "vladwo.vxl", "weed.vxl",
    "wini.vxl", "wrmn.vxl", "zbomb.vxl", "zep.vxl"
];
class VxlWrapper implements Renderable {
    private builder: VxlNonBatchedBuilder;
    private wrapper: THREE.Object3D;
    constructor(vxlFile: VxlFile, hvaFile: any | undefined, palette: Palette, vxlGeometryPool: VxlGeometryPool, camera: THREE.Camera) {
        this.builder = new VxlNonBatchedBuilder(vxlFile, hvaFile, palette, vxlGeometryPool, camera);
        this.wrapper = new THREE.Object3D();
    }
    get3DObject(): THREE.Object3D {
        return this.wrapper;
    }
    create3DObject(): void {
        console.log('[VxlWrapper] create3DObject called');
        this.builder.setExtraLight(new THREE.Vector3(1.7, 1.7, 1.7));
        const object = this.builder.build();
        console.log('[VxlWrapper] Builder returned object:', object);
        if (object) {
            console.log('[VxlWrapper] Object details:', {
                type: object.type,
                children: object.children.length,
                visible: object.visible,
                position: object.position,
                scale: object.scale,
                rotation: object.rotation
            });
            object.children.forEach((child, index) => {
                console.log(`[VxlWrapper] Child ${index}:`, {
                    type: child.type,
                    visible: child.visible,
                    hasChildren: child.children.length
                });
                if (child.children.length > 0) {
                    child.children.forEach((subChild, subIndex) => {
                        if (subChild instanceof THREE.Mesh) {
                            const mesh = subChild as THREE.Mesh;
                            console.log(`[VxlWrapper] SubChild ${subIndex} mesh:`, {
                                geometry: mesh.geometry,
                                vertexCount: mesh.geometry.attributes.position?.count || 0,
                                material: mesh.material,
                                materialType: Array.isArray(mesh.material) ? 'array' : mesh.material.type,
                                visible: mesh.visible
                            });
                        }
                    });
                }
            });
        }
        this.wrapper.add(object);
        console.log('[VxlWrapper] Object added to wrapper');
    }
    update(deltaTime: number): void {
        this.wrapper.rotation.y -= 0.01;
    }
    destroy(): void {
        this.builder.dispose();
    }
}
export class VxlTester {
    private static renderer?: Renderer;
    private static worldScene?: WorldScene;
    private static vfs?: VirtualFileSystem;
    private static vxlGeometryPool?: VxlGeometryPool;
    private static palette?: Palette;
    private static uiAnimationLoop?: UiAnimationLoop;
    private static currentVxl?: VxlWrapper;
    private static listEl?: HTMLDivElement;
    private static homeButton?: HTMLButtonElement;
    private static disposables = new CompositeDisposable();
    static async main(vfs: VirtualFileSystem, runtimeVars: any): Promise<void> {
        const renderer = this.renderer = new Renderer(800, 600);
        renderer.init(document.body);
        renderer.initStats(document.body);
        this.vfs = vfs;
        this.vxlGeometryPool = new VxlGeometryPool(new VxlGeometryCache(null, null));
        this.palette = new Palette(vfs.openFile("unittem.pal"));
        console.log('[VxlTester] Palette loaded, colors:', this.palette.colors.length);
        const worldScene = this.worldScene = WorldScene.factory({ x: 0, y: 0, width: 800, height: 600 }, new BoxedVar(true), new BoxedVar(ShadowQuality.High));
        this.disposables.add(worldScene);
        worldScene.scene.background = new THREE.Color(0xE0E0E0);
        worldScene.camera.far += 1000;
        worldScene.camera.updateProjectionMatrix();
        console.log('[VxlTester] World scene created');
        console.log('[VxlTester] Camera:', {
            position: worldScene.camera.position,
            rotation: worldScene.camera.rotation,
            near: worldScene.camera.near,
            far: worldScene.camera.far,
            type: worldScene.camera.type
        });
        worldScene.create3DObject();
        worldScene.scene.traverse((obj) => {
            if (obj instanceof THREE.Light) {
                console.log('[VxlTester] Light found:', {
                    type: obj.type,
                    intensity: (obj as any).intensity,
                    position: obj.position,
                    visible: obj.visible
                });
                if (obj instanceof THREE.AmbientLight) {
                    (obj as any).intensity = 1.0;
                }
                else if (obj instanceof THREE.DirectionalLight) {
                    (obj as any).intensity = 1.2;
                }
            }
        });
        const canvasMetrics = new CanvasMetrics(renderer.getCanvas(), window);
        canvasMetrics.init();
        this.disposables.add(canvasMetrics);
        const pointerEvents = new PointerEvents(renderer, { x: 0, y: 0 }, document, canvasMetrics);
        const cameraZoomControls = new CameraZoomControls(pointerEvents, worldScene.cameraZoom);
        this.disposables.add(cameraZoomControls, pointerEvents);
        cameraZoomControls.init();
        this.createFloor();
        this.buildBrowser();
        renderer.addScene(worldScene);
        const animationLoop = this.uiAnimationLoop = new UiAnimationLoop(renderer);
        animationLoop.start();
        console.log('[VxlTester] Animation loop started');
    }
    private static createFloor(): void {
        const geometry = new THREE.PlaneGeometry(10000, 10000);
        const material = new THREE.ShadowMaterial();
        material.opacity = 0.5;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = -100;
        mesh.receiveShadow = true;
        this.worldScene?.scene.add(mesh);
    }
    private static async selectVxl(filename: string): Promise<void> {
        if (this.currentVxl) {
            this.worldScene?.remove(this.currentVxl);
            this.currentVxl.destroy();
        }
        const file = this.vfs!.openFile(filename);
        const startTime = new Date().getTime();
        const vxlFile = new VxlFile(file);
        const endTime = new Date().getTime();
        console.log(`Parsing took ${endTime - startTime}ms`);
        console.log('[VxlTester] VXL file loaded:', filename);
        console.log('[VxlTester] Sections count:', vxlFile.sections.length);
        console.log('[VxlTester] Total voxel count:', vxlFile.voxelCount);
        for (let i = 0; i < vxlFile.sections.length; i++) {
            const section = vxlFile.sections[i];
            console.log(`[VxlTester] Section ${i}:`, {
                name: section.name,
                size: { x: section.sizeX, y: section.sizeY, z: section.sizeZ },
                minBounds: section.minBounds,
                maxBounds: section.maxBounds,
                spans: section.spans?.length || 0
            });
            const voxelData = section.getAllVoxels();
            console.log(`[VxlTester] Section ${i} voxels:`, voxelData.voxels.length);
        }
        console.log('[VxlTester] Palette:', this.palette);
        console.log('[VxlTester] VxlGeometryPool:', this.vxlGeometryPool);
        const vxl = this.currentVxl = new VxlWrapper(vxlFile, undefined, this.palette!, this.vxlGeometryPool!, this.worldScene!.camera);
        console.log('[VxlTester] Created VxlWrapper');
        this.worldScene?.add(vxl);
        console.log('[VxlTester] Added to scene');
        if (this.worldScene) {
            this.worldScene.processRenderQueue();
            console.log('[VxlTester] Processed render queue');
            const obj3d = vxl.get3DObject();
            console.log('[VxlTester] VxlWrapper 3D object:', obj3d);
            if (obj3d && obj3d.children.length > 0) {
                console.log('[VxlTester] 3D object children:', obj3d.children);
                obj3d.children.forEach((child, index) => {
                    if (child instanceof THREE.Mesh) {
                        console.log(`[VxlTester] Child ${index} mesh:`, {
                            geometry: child.geometry,
                            material: child.material,
                            visible: child.visible,
                            vertexCount: child.geometry.attributes.position?.count || 0
                        });
                    }
                });
            }
        }
    }
    private static buildBrowser(): void {
        const homeButton = document.createElement('button');
        homeButton.innerHTML = '点此返回主页';
        homeButton.style.cssText = `
      position: fixed;
      left: 50%;
      top: 10px;
      transform: translateX(-50%);
      padding: 10px 20px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      z-index: 1000;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
        homeButton.onmouseover = () => {
            homeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            homeButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            homeButton.style.transform = 'translateX(-50%) translateY(-2px)';
            homeButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        };
        homeButton.onmouseout = () => {
            homeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            homeButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            homeButton.style.transform = 'translateX(-50%) translateY(0)';
            homeButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        };
        homeButton.onclick = () => {
            window.location.hash = '/';
        };
        document.body.appendChild(homeButton);
        const listEl = this.listEl = document.createElement('div');
        listEl.style.position = 'absolute';
        listEl.style.right = '0';
        listEl.style.top = '0';
        listEl.style.height = '600px';
        listEl.style.width = '200px';
        listEl.style.overflowY = 'auto';
        listEl.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        listEl.style.padding = '10px';
        const title = document.createElement('h3');
        title.textContent = 'VXL Files';
        title.style.marginTop = '0';
        title.style.marginBottom = '10px';
        listEl.appendChild(title);
        VXL_FILES.forEach(filename => {
            const link = document.createElement('a');
            link.style.display = 'block';
            link.style.padding = '4px 0';
            link.style.color = '#333';
            link.style.textDecoration = 'none';
            link.textContent = filename;
            link.setAttribute('href', 'javascript:;');
            link.onmouseover = () => {
                link.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            };
            link.onmouseout = () => {
                link.style.backgroundColor = 'transparent';
            };
            link.addEventListener('click', () => {
                console.log('Selected vxl', filename);
                VxlTester.selectVxl(filename);
            });
            listEl.appendChild(link);
        });
        document.body.appendChild(listEl);
        this.homeButton = homeButton;
        setTimeout(() => {
            VxlTester.selectVxl('zep.vxl');
        }, 50);
    }
    static destroy(): void {
        console.log('[VxlTester] Destroying VxlTester');
        if (this.currentVxl) {
            this.worldScene?.remove(this.currentVxl);
            this.currentVxl.destroy();
            this.currentVxl = undefined;
        }
        if (this.uiAnimationLoop) {
            this.uiAnimationLoop.destroy();
            this.uiAnimationLoop = undefined;
        }
        if (this.listEl) {
            this.listEl.remove();
            this.listEl = undefined;
        }
        if (this.homeButton) {
            this.homeButton.remove();
            this.homeButton = undefined;
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = undefined;
        }
        this.disposables.dispose();
        this.worldScene = undefined;
        this.vfs = undefined;
        this.vxlGeometryPool = undefined;
        this.palette = undefined;
        console.log('[VxlTester] VxlTester destroyed successfully');
        try {
            const { PipOverlay } = require("@/engine/renderable/entity/PipOverlay");
            const { TextureUtils } = require("@/engine/gfx/TextureUtils");
            PipOverlay?.clearCaches?.();
            if (TextureUtils?.cache) {
                TextureUtils.cache.forEach((tex: any) => tex.dispose?.());
                TextureUtils.cache.clear();
            }
        }
        catch (err) {
            console.warn('[VxlTester] Failed to clear caches during destroy:', err);
        }
    }
}
