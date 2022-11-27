import sharp from 'sharp';
import { GraphLink } from './graph-link';
import { GraphNode } from './graph-node';
import { GraphOptions } from './graph-options';
import GraphEvent from './graph-event';
export declare class ForceGraph {
    nodes: GraphNode[];
    links: GraphLink[];
    private svg;
    private _options;
    private isSVGGenerated;
    private eventEmitter;
    constructor(nodes: GraphNode[], links: GraphLink[], options?: Partial<GraphOptions>);
    on(event: 'progress', listener: (event: GraphEvent) => void): void;
    private emit;
    simulate(): Promise<void>;
    private getLink;
    private getNode;
    generateTiles(generatePreview?: boolean): Promise<void>;
    private generateTilesForZoom;
    private generateTile;
    image(z?: number): {
        img: sharp.Sharp;
        w: number;
        h: number;
    };
}
