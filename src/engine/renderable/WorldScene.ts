import { pointEquals } from '../../util/geometry';
import { RenderableContainer } from '../gfx/RenderableContainer';
import { CameraPan } from './CameraPan';
import { CameraZoom } from './CameraZoom';
import { LightingType } from '../type/LightingType';
import { Coords } from '../../game/Coords';
import { EventDispatcher } from '../../util/event';
import { ShadowQuality } from './entity/unit/ShadowQuality';
import { MeshBatchManager } from '../gfx/batch/MeshBatchManager';
import { BoxedVar } from '../../util/BoxedVar';
import * as THREE from 'three';
const AMBIENT_LIGHT_INTENSITY = 0.8;
const CAMERA_FAR = 16000;
const SHADOW_QUALITY_MAP = new Map([
    [ShadowQuality.High, 8],
    [ShadowQuality.Medium, 4],
    [ShadowQuality.Low, 2]
]);
export class WorldScene extends RenderableContainer {
    public scene: THREE.Scene;
    public camera: THREE.OrthographicCamera;
    public viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    public cameraPan: CameraPan;
    public cameraZoom: CameraZoom;
    public shadowQuality: BoxedVar<ShadowQuality>;
    private initialized: boolean = false;
    private ambientLight: THREE.AmbientLight;
    private directionalLight: THREE.DirectionalLight;
    private _onBeforeCameraUpdate = new EventDispatcher<WorldScene, number>();
    private _onCameraUpdate = new EventDispatcher<WorldScene, number>();
    private lastCameraPan?: {
        x: number;
        y: number;
    };
    private lastCameraZoom?: number;
    private meshBatchManager?: MeshBatchManager;
    private shadowQualityListener?: () => void;
    private lightFocusPoint?: {
        x: number;
        y: number;
    };
    get onBeforeCameraUpdate() {
        return this._onBeforeCameraUpdate.asEvent();
    }
    get onCameraUpdate() {
        return this._onCameraUpdate.asEvent();
    }
    static factory(viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, enableLighting: BoxedVar<boolean>, shadowQuality: BoxedVar<ShadowQuality>): WorldScene {
        let scene = new THREE.Scene();
        scene.matrixAutoUpdate = false;
        const camera = WorldScene.createCamera(viewport);
        const cameraPan = new CameraPan(enableLighting);
        const cameraZoom = new CameraZoom(enableLighting);
        return new WorldScene(scene, camera, viewport, cameraPan, cameraZoom, shadowQuality);
    }
    static getCameraParams(viewport: {
        width: number;
        height: number;
    }) {
        const alpha = Coords.ISO_CAMERA_ALPHA;
        const beta = Coords.ISO_CAMERA_BETA;
        const worldScale = Coords.ISO_WORLD_SCALE;
        return {
            alpha,
            beta,
            d: (viewport.height / 2) * Coords.COS_ISO_CAMERA_BETA * worldScale,
            aspect: viewport.width / viewport.height,
            far: CAMERA_FAR * worldScale
        };
    }
    static createCamera(viewport: {
        width: number;
        height: number;
    }): THREE.OrthographicCamera {
        const { alpha, beta, d, aspect, far } = this.getCameraParams(viewport);
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0, far);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = +beta;
        camera.rotation.x = -alpha;
        return camera;
    }
    constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera, viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, cameraPan: CameraPan, cameraZoom: CameraZoom, shadowQuality: BoxedVar<ShadowQuality>) {
        super(scene);
        this.scene = scene;
        this.camera = camera;
        this.viewport = viewport;
        this.cameraPan = cameraPan;
        this.cameraZoom = cameraZoom;
        this.shadowQuality = shadowQuality;
        this.ambientLight = new THREE.AmbientLight(0xFFFFFF, AMBIENT_LIGHT_INTENSITY);
        this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
        this._onBeforeCameraUpdate = new EventDispatcher<WorldScene, number>();
        this._onCameraUpdate = new EventDispatcher<WorldScene, number>();
    }
    updateViewport(viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): void {
        this.viewport = viewport;
        const { d, aspect } = WorldScene.getCameraParams(viewport);
        const camera = this.camera;
        camera.left = -d * aspect;
        camera.right = d * aspect;
        camera.top = d;
        camera.bottom = -d;
        camera.updateProjectionMatrix();
    }
    updateCamera(pan: {
        x: number;
        y: number;
    }, zoom: number): void {
        const camera = this.camera;
        camera.updateMatrix();
        const elements = camera.matrix.elements;
        const translation = new THREE.Vector3();
        camera.position.set(0, 0, 0);
        camera.translateZ(CAMERA_FAR * Coords.ISO_WORLD_SCALE);
        translation.set(elements[0], elements[1], elements[2]);
        translation.multiplyScalar((pan.x * (camera.right - camera.left)) / this.viewport.width / camera.zoom);
        camera.position.add(translation);
        translation.set(elements[4], elements[5], elements[6]);
        translation.multiplyScalar((-pan.y * (camera.top - camera.bottom)) / this.viewport.height / camera.zoom);
        camera.position.add(translation);
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(false);
    }
    create3DObject(): void {
        super.create3DObject();
        if (!this.initialized) {
            this.initialized = true;
            this.scene.position.x -= 0.1 * Coords.ISO_WORLD_SCALE;
            this.scene.position.z -= 0.1 * Coords.ISO_WORLD_SCALE;
            this.scene.updateMatrix();
            const axesHelper = new THREE.AxesHelper(Coords.LEPTONS_PER_TILE);
            this.scene.add(axesHelper);
            this.scene.add(this.ambientLight);
            const light = this.directionalLight;
            light.position.set(-87.012, 204.338, 195.409);
            if (this.lightFocusPoint) {
                light.position.x += this.lightFocusPoint.x;
                light.position.z += this.lightFocusPoint.y;
                light.target.position.set(this.lightFocusPoint.x, 0, this.lightFocusPoint.y);
                light.target.updateMatrixWorld(undefined);
            }
            this.updateShadowQuality(light, this.shadowQuality.value);
            this.shadowQualityListener = () => this.updateShadowQuality(light, this.shadowQuality.value);
            this.shadowQuality.onChange.subscribe(this.shadowQualityListener);
            this.scene.add(light);
            this.scene.add(this.camera);
            this.meshBatchManager = new MeshBatchManager(this);
            this.add(this.meshBatchManager);
            (this.scene as any).autoUpdate = false;
        }
    }
    updateShadowQuality(light: THREE.DirectionalLight, quality: ShadowQuality): void {
        const enableShadows = quality !== ShadowQuality.Off;
        light.castShadow = enableShadows;
        if (enableShadows) {
            const worldScale = Coords.ISO_WORLD_SCALE;
            const shadowSize = 3500 * worldScale;
            const shadowCamera = light.shadow.camera as THREE.OrthographicCamera;
            shadowCamera.right = shadowSize;
            shadowCamera.left = -shadowSize;
            shadowCamera.top = shadowSize;
            shadowCamera.bottom = -shadowSize;
            shadowCamera.near = -4000 * worldScale;
            shadowCamera.far = 3000 * worldScale;
            const shadowMapMultiplier = SHADOW_QUALITY_MAP.get(quality);
            if (!shadowMapMultiplier) {
                throw new Error(`Unsupported shadow quality "${quality}"`);
            }
            light.shadow.mapSize.width = 1024 * shadowMapMultiplier;
            light.shadow.mapSize.height = 1024 * shadowMapMultiplier;
        }
    }
    setLightFocusPoint(x: number, y: number): void {
        this.lightFocusPoint = { x, y };
    }
    applyLighting(lighting: {
        computeTint: (type: LightingType) => THREE.Vector3;
        getAmbientIntensity: () => number;
    }): void {
        const tint = lighting.computeTint(LightingType.Ambient);
        this.ambientLight.color.setRGB(tint.x, tint.y, tint.z);
        this.directionalLight.color.setRGB(tint.x, tint.y, tint.z);
        const ambientIntensity = lighting.getAmbientIntensity();
        this.ambientLight.intensity = ambientIntensity * AMBIENT_LIGHT_INTENSITY;
        this.directionalLight.intensity = ambientIntensity;
    }
    update(deltaTime: number, time?: number): void {
        super.update(deltaTime);
        this._onBeforeCameraUpdate.dispatch(this, deltaTime);
        const zoom = this.cameraZoom.getZoom();
        const pan = this.cameraPan.getPan();
        if (!pointEquals(pan, this.lastCameraPan) || this.lastCameraZoom !== zoom) {
            this.updateCamera(pan, zoom);
            this.lastCameraZoom = zoom;
            this.lastCameraPan = pan;
        }
        this._onCameraUpdate.dispatch(this, deltaTime);
        this.scene.updateMatrixWorld(false);
        this.meshBatchManager?.updateMeshes();
    }
    dispose(): void {
        if (this.shadowQualityListener) {
            this.shadowQuality.onChange.unsubscribe(this.shadowQualityListener);
            this.shadowQualityListener = undefined;
        }
        (this.directionalLight.shadow.map as any)?.dispose();
        if (this.meshBatchManager) {
            this.meshBatchManager.dispose();
            this.remove(this.meshBatchManager);
            this.meshBatchManager = undefined;
        }
        this.scene.remove(this.ambientLight);
        this.scene.remove(this.directionalLight);
    }
}
