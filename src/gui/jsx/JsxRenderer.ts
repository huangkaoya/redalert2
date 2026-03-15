import { renderJsx } from "./jsx";
import { UiObjectSprite } from "../UiObjectSprite";
import { UiObject } from "../UiObject";
import { HtmlContainer } from "../HtmlContainer";
import { ShpSpriteBatch } from "../ShpSpriteBatch";
import { CanvasSpriteBuilder } from '../../engine/renderable/builder/CanvasSpriteBuilder';
import * as THREE from 'three';
import { Camera } from 'three';
import { PointerEvents } from '../PointerEvents';

interface SpriteProps {
  images?: any;
  image?: string | any;
  palette?: string | any;
  alignX?: number;
  alignY?: number;
  x?: number;
  y?: number;
  frame?: number;
  animationRunner?: any;
  hidden?: boolean;
  zIndex?: number;
  opacity?: number;
  transparent?: boolean;
  tooltip?: string;
  onFrame?: () => void;
  static?: boolean;
  [key: string]: any;
}

interface ContainerProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  hidden?: boolean;
  zIndex?: number;
  onFrame?: () => void;
  [key: string]: any;
}

interface MeshProps {
  x?: number;
  y?: number;
  hidden?: boolean;
  zIndex?: number;
  children?: any;
  [key: string]: any;
}

const hasImages = (props: SpriteProps): boolean => !!props.images;

export class JsxRenderer {
  private images: Map<string, any> | any;
  private palettes: Map<string, any> | any;
  private camera: Camera;
  private jsxIntrinsicRenderers: {
    [key: string]: (props: any) => { obj: any; children?: any[] };
  };

  constructor(images: Map<string, any> | any, palettes: Map<string, any> | any  , camera: Camera, pointerEvents?: PointerEvents) {
    this.images = images;
    this.palettes = palettes;
    this.camera = camera;
    
    this.jsxIntrinsicRenderers = {
      sprite: (props: SpriteProps) => {
        let sprite: UiObjectSprite;

        if (hasImages(props)) {
          const builder = new CanvasSpriteBuilder(props.images, this.camera);
          builder.setAlign(props.alignX ?? 0, props.alignY ?? 0);
          sprite = new UiObjectSprite(builder);
        } else {
          const image = typeof props.image === "string" ? this.getImage(props.image) : props.image;
          const palette = typeof props.palette === "string" ? this.getPalette(props.palette) : props.palette;
          sprite = UiObjectSprite.fromShpFile(image, palette, this.camera);
          if ((sprite as any).builder && (props.alignX !== undefined || props.alignY !== undefined)) {
            (sprite as any).builder.setAlign?.(props.alignX ?? 0, props.alignY ?? 0);
          }
        }

        if (pointerEvents) {
          sprite.setPointerEvents(pointerEvents);
        }

        this.setupListeners(sprite, props);

        if (props.onFrame) {
          sprite.onFrame.subscribe(props.onFrame);
        }

        sprite.setPosition(props.x || 0, props.y || 0);

        if (props.frame !== undefined) {
          sprite.setFrame(props.frame);
        }

        if (props.animationRunner) {
          sprite.setAnimationRunner(props.animationRunner);
        }

        if (props.hidden) {
          sprite.setVisible(false);
        }

        if (props.zIndex) {
          sprite.setZIndex(props.zIndex);
        }

        if (props.opacity !== undefined) {
          sprite.setOpacity(props.opacity);
        }

        if (props.transparent !== undefined) {
          sprite.setTransparent(props.transparent);
        }

        if (props.tooltip !== undefined) {
          sprite.setTooltip(props.tooltip);
        }

        return { obj: sprite };
      },
      
      "sprite-batch": (props: { children?: any[] }) => {
        let children: any[] = [];
        if (props.children) {
          children = Array.isArray(props.children) 
            ? props.children.flat() 
            : [props.children];
        }
        
        let dynamicChildren: any[] = [];
        let staticSprites: any[] = [];
        
        for (const child of children) {
          if (child.type === "sprite" && child.props.static && !hasImages(child.props)) {
            staticSprites.push(child.props);
          } else {
            dynamicChildren.push(child);
          }
        }
        
        return {
          obj: new ShpSpriteBatch(
            staticSprites,
            (name: string) => this.getImage(name),
            (name: string) => this.getPalette(name),
            this.camera,
          ),
          children: [...dynamicChildren],
        };
      },
      
      container: (props: ContainerProps) => {
        let container = new UiObject(
          new THREE.Object3D(),
          new HtmlContainer(),
        );
        
        if (pointerEvents) {
          container.setPointerEvents(pointerEvents);
        }
        
        this.setupListeners(container, props);
        
        if (props.onFrame) {
          container.onFrame.subscribe(props.onFrame);
        }
        
        if (props.hidden) {
          container.setVisible(false);
        }
        
        if (props.zIndex) {
          container.setZIndex(props.zIndex);
        }
        
        container.setPosition(props.x || 0, props.y || 0);
        
        container.getHtmlContainer()?.setSize(props.width || 0, props.height || 0);
        
        return { obj: container };
      },
      
      mesh: (props: MeshProps) => {
        let mesh = new UiObject(props.children);
        
        if (pointerEvents) {
          mesh.setPointerEvents(pointerEvents);
        }
        
        this.setupListeners(mesh, props);
        mesh.setPosition(props.x || 0, props.y || 0);
        
        if (props.zIndex) {
          mesh.setZIndex(props.zIndex);
        }
        
        if (props.hidden) {
          mesh.setVisible(false);
        }
        
        return { obj: mesh };
      },
    };
  }

  private setupListeners(object: any, props: any): void {
    const eventMap: { [key: string]: string } = {
      click: "onClick",
      dblclick: "onDoubleClick",
      mousedown: "onMouseDown",
      mouseenter: "onMouseEnter",
      mouseleave: "onMouseLeave",
      mouseout: "onMouseOut",
      mouseover: "onMouseOver",
      mouseup: "onMouseUp",
      mousemove: "onMouseMove",
      wheel: "onWheel",
    };
    
    Object.keys(eventMap).forEach((eventType) => {
      const handler = props[eventMap[eventType]];
      if (handler) {
        object.addEventListener(eventType, handler);
      }
    });
  }

  public setCamera(camera: Camera): void {
    this.camera = camera;
  }

  private getImage(name: string): any {
    const image = this.images.get(name);
    if (!image) {
      throw new Error(`Missing image "${name}"`);
    }
    return image;
  }

  private getPalette(name: string): any {
    const palette = this.palettes.get(name);
    if (!palette) {
      throw new Error(`Missing palette "${name}"`);
    }
    return palette;
  }

  public render(jsx: any): any {
    return renderJsx(jsx, this.jsxIntrinsicRenderers);
  }
}
