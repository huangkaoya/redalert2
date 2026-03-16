import * as THREE from 'three';
import { UiObject } from './UiObject';
import { HtmlContainer } from './HtmlContainer';
import { MeshBatchManager } from '../engine/gfx/batch/MeshBatchManager';
export class UiScene extends UiObject {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    public viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    private meshBatchManager?: MeshBatchManager;
    static factory(viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): UiScene {
        let scene = new THREE.Scene();
        scene.matrixAutoUpdate = false;
        const camera = UiScene.createCamera(viewport);
        const htmlContainer = new HtmlContainer();
        return new UiScene(scene, camera, viewport, htmlContainer);
    }
    static createCamera(viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): THREE.Camera {
        const halfHeight = viewport.height / 2;
        const aspectRatio = viewport.width / viewport.height;
        let camera = new THREE.OrthographicCamera(-halfHeight * aspectRatio, halfHeight * aspectRatio, halfHeight, -halfHeight, -1000, 1000);
        camera.rotation.x = Math.PI;
        camera.position.x = -viewport.x + viewport.width / 2;
        camera.position.y = -viewport.y + viewport.height / 2;
        camera.position.z = -1000;
        return camera;
    }
    constructor(scene: THREE.Scene, camera: THREE.Camera, viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, htmlContainer: HtmlContainer) {
        super(scene, htmlContainer);
        this.scene = scene;
        this.camera = camera;
        this.viewport = viewport;
    }
    setCamera(camera: THREE.Camera): void {
        this.camera = camera;
    }
    setViewport(viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): void {
        this.viewport = viewport;
    }
    create3DObject(): void {
        super.create3DObject();
        if (!this.meshBatchManager) {
            const meshBatchManager = this.meshBatchManager = new MeshBatchManager(this.getRenderableContainer());
            this.getRenderableContainer().add(meshBatchManager);
            this.scene.matrixAutoUpdate = false;
        }
    }
    update(deltaTime: number): void {
        super.update(deltaTime);
        if (this.meshBatchManager) {
            this.scene.updateMatrixWorld(false);
            this.meshBatchManager.updateMeshes();
        }
    }
    get menuViewport(): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        const menuWidth = 800;
        const menuHeight = 600;
        return {
            x: Math.max(0, (this.viewport.width - menuWidth) / 2),
            y: Math.max(0, (this.viewport.height - menuHeight) / 2),
            width: menuWidth,
            height: menuHeight,
        };
    }
    getScene(): THREE.Scene {
        return this.scene;
    }
    getCamera(): THREE.Camera {
        return this.camera;
    }
    destroy(): void {
        super.destroy();
        this.meshBatchManager?.dispose();
    }
}
