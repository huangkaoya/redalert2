import { OctreeContainer } from '@/engine/gfx/OctreeContainer';
import { World } from '@/game/World';
import { WorldScene } from '@/engine/renderable/WorldScene';
import { Camera } from '@/engine/gfx/Camera';
import { RenderableFactory } from '@/engine/renderable/entity/RenderableFactory';
import { GameObject } from '@/game/gameobject/GameObject';
import { Renderable } from '@/engine/renderable/Renderable';
export class RenderableManager {
    private world: World;
    private worldScene: WorldScene;
    private camera: Camera;
    private renderableFactory: RenderableFactory;
    private container: OctreeContainer;
    private renderablesByGameObject: Map<GameObject, Renderable>;
    private renderablesById: Map<string, Renderable>;
    private positionListeners: Map<GameObject, Function>;
    private onCameraUpdate: () => void;
    private onWorldObjectSpawned: (gameObject: GameObject) => void;
    private onWorldObjectRemoved: (gameObject: GameObject) => void;
    constructor(world: World, worldScene: WorldScene, camera: Camera, renderableFactory: RenderableFactory) {
        this.world = world;
        this.worldScene = worldScene;
        this.camera = camera;
        this.renderableFactory = renderableFactory;
        this.renderablesByGameObject = new Map();
        this.renderablesById = new Map();
        this.positionListeners = new Map();
        this.onCameraUpdate = () => {
            this.container.cullChildren();
        };
        this.onWorldObjectSpawned = (gameObject: GameObject) => {
            const isLightpost = gameObject.isTechno() && gameObject.rules.isLightpost;
            const renderable = this.createRenderable(gameObject, isLightpost ? this.worldScene : this.container);
            if (renderable.onCreate) {
                renderable.onCreate(this);
            }
            const positionListener = ({ tileChanged }) => this.onObjectPositionChanged(gameObject, tileChanged);
            this.positionListeners.set(gameObject, positionListener);
            gameObject.position.onPositionChange.subscribe(positionListener);
        };
        this.onWorldObjectRemoved = (gameObject: GameObject) => {
            gameObject.position.onPositionChange.unsubscribe(this.positionListeners.get(gameObject));
            this.positionListeners.delete(gameObject);
            const renderable = this.renderablesByGameObject.get(gameObject);
            if (!renderable) {
                return;
            }
            if (renderable.onRemove) {
                const result = renderable.onRemove(this);
                if (result) {
                    result
                        .then(() => this.removeAndDisposeRenderable(renderable, gameObject))
                        .catch(error => console.error(error));
                }
                else {
                    this.removeAndDisposeRenderable(renderable, gameObject);
                }
            }
            else {
                this.removeAndDisposeRenderable(renderable, gameObject);
            }
        };
    }
    init(): void {
        this.container = OctreeContainer.factory(this.camera);
        this.container.autoCull = false;
        this.worldScene.add(this.container);
        this.worldScene.onCameraUpdate.subscribe(this.onCameraUpdate);
        this.world.getAllObjects().forEach(gameObject => this.onWorldObjectSpawned(gameObject));
        this.world.onObjectSpawned.subscribe(this.onWorldObjectSpawned);
        this.world.onObjectRemoved.subscribe(this.onWorldObjectRemoved);
    }
    getRenderableById(id: string): Renderable {
        return this.renderablesById.get(id);
    }
    getRenderableByGameObject(gameObject: GameObject): Renderable {
        return this.renderablesByGameObject.get(gameObject);
    }
    getRenderableContainer(): OctreeContainer {
        return this.container;
    }
    onObjectPositionChanged(gameObject: GameObject, tileChanged: boolean): void {
        const renderable = this.renderablesByGameObject.get(gameObject);
        renderable.setPosition(gameObject.position.worldPosition);
        if (!(gameObject.isTechno() && gameObject.rules.isLightpost)) {
            this.container.updateChild(renderable);
        }
    }
    removeAndDisposeRenderable(renderable: Renderable, gameObject: GameObject): void {
        const container = gameObject.isTechno() && gameObject.rules.isLightpost
            ? this.worldScene
            : this.container;
        container.remove(renderable);
        renderable.dispose?.();
        this.renderablesByGameObject.delete(gameObject);
        this.renderablesById.delete(gameObject.id);
    }
    createTransientAnim(anim: any, callback?: (renderable: Renderable) => void): Renderable {
        const renderable = this.renderableFactory.createTransientAnim(anim, this.container);
        if (callback) {
            callback(renderable);
        }
        this.container.add(renderable);
        return renderable;
    }
    createAnim(anim: any, callback?: (renderable: Renderable) => void, skipAdd: boolean = false): Renderable {
        const renderable = this.renderableFactory.createAnim(anim);
        if (callback) {
            callback(renderable);
        }
        if (!skipAdd) {
            this.container.add(renderable);
        }
        return renderable;
    }
    addEffect(effect: any): void {
        effect.setContainer(this.worldScene);
        this.worldScene.add(effect);
    }
    dispose(): void {
        this.worldScene.remove(this.container);
        this.container = undefined;
        this.worldScene.onCameraUpdate.unsubscribe(this.onCameraUpdate);
        this.world.onObjectSpawned.unsubscribe(this.onWorldObjectSpawned);
        this.world.onObjectRemoved.unsubscribe(this.onWorldObjectRemoved);
        this.onWorldObjectRemoved = undefined;
        this.onWorldObjectSpawned = undefined;
        this.positionListeners.forEach((listener, gameObject) => {
            gameObject.position.onPositionChange.unsubscribe(listener);
        });
        this.positionListeners.clear();
        this.renderablesById.forEach(renderable => renderable.dispose?.());
    }
    createRenderable(gameObject: GameObject, container: any): Renderable {
        const renderable = this.renderableFactory.create(gameObject);
        renderable.setPosition(gameObject.position.worldPosition);
        container.add(renderable);
        this.renderablesByGameObject.set(gameObject, renderable);
        this.renderablesById.set(gameObject.id, renderable);
        return renderable;
    }
    updateLighting(): void {
        for (const renderable of this.renderablesById.values()) {
            renderable.updateLighting();
        }
    }
}
