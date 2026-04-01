import { RenderableContainer } from './RenderableContainer';
import { FrustumCuller } from './FrustumCuller';
import { Coords } from '@/game/Coords';
import * as THREE from 'three';
import { Octree } from '@brakebein/threeoctree';
const CAMERA_PADDING = 3;
let cameraClone: THREE.OrthographicCamera | THREE.PerspectiveCamera;
export class OctreeContainer extends RenderableContainer {
    autoCull: boolean;
    private lastCameraPosition: THREE.Vector3;
    private tree: Octree;
    private frustumCuller: FrustumCuller;
    private camera: THREE.Camera;
    static factory(camera: THREE.Camera): OctreeContainer {
        const perspCamera = camera as THREE.PerspectiveCamera;
        const { near, far } = perspCamera;
        const octree = new Octree({
            undeferred: false,
            depthMax: Math.ceil(Math.log2((2 * (far - near)) / 128)),
            objectsThreshold: 10,
            overlapPct: 0.15
        });
        const frustumCuller = new FrustumCuller();
        return new OctreeContainer(octree, frustumCuller, camera);
    }
    constructor(tree: Octree, frustumCuller: FrustumCuller, camera: THREE.Camera) {
        const dummyObject = new THREE.Object3D();
        dummyObject.name = 'octree-container';
        super(dummyObject);
        this.autoCull = true;
        this.lastCameraPosition = new THREE.Vector3();
        this.tree = tree;
        this.frustumCuller = frustumCuller;
        this.camera = camera;
    }
    update(deltaTime: number): void {
        super.update(deltaTime);
        if (this.autoCull) {
            this.cullChildren();
        }
    }
    cullChildren(): void {
        if (!this.camera.position.equals(this.lastCameraPosition)) {
            this.lastCameraPosition.copy(this.camera.position);
            let matrix = this.computeProjectionMatrix();
            this.camera.updateMatrixWorld(false);
            this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
            matrix = new THREE.Matrix4().multiplyMatrices(matrix, this.camera.matrixWorldInverse);
            const frustum = new THREE.Frustum();
            frustum.setFromProjectionMatrix(matrix);
            this.frustumCuller.cull(this.tree, frustum);
        }
    }
    computeProjectionMatrix(): THREE.Matrix4 {
        if (!cameraClone) {
            cameraClone = this.camera.clone() as THREE.OrthographicCamera | THREE.PerspectiveCamera;
        }
        else {
            cameraClone.copy(this.camera as any);
        }
        if ('top' in cameraClone && 'bottom' in cameraClone && 'left' in cameraClone && 'right' in cameraClone) {
            const orthoCamera = cameraClone as THREE.OrthographicCamera;
            orthoCamera.top += CAMERA_PADDING * Coords.LEPTONS_PER_TILE * Coords.COS_ISO_CAMERA_BETA;
            orthoCamera.bottom -= CAMERA_PADDING * Coords.LEPTONS_PER_TILE * Coords.COS_ISO_CAMERA_BETA;
            orthoCamera.left -= CAMERA_PADDING * (2 * Coords.LEPTONS_PER_TILE) * Coords.COS_ISO_CAMERA_BETA;
            orthoCamera.right += CAMERA_PADDING * (2 * Coords.LEPTONS_PER_TILE) * Coords.COS_ISO_CAMERA_BETA;
        }
        cameraClone.updateProjectionMatrix();
        return cameraClone.projectionMatrix;
    }
    updateChild(child: any): void {
        const obj3D = child.get3DObject();
        if (obj3D && obj3D.parent) {
            this.tree.remove(obj3D);
            this.tree.add(obj3D);
        }
    }
}
