import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';

import { EventEmitter } from 'events';

import { GraphLink } from './graph-link';
import { GraphNode } from './graph-node';

import { GraphOptions } from './graph-options';
import GraphEvent from './graph-event';

export class ForceGraph {
  private svg: d3.Selection<any, any, any, any>;
  private _options: GraphOptions;
  private isSVGGenerated = false;
  private eventEmitter: EventEmitter;

  constructor(
    public nodes: GraphNode[],
    public links: GraphLink[],
    options: Partial<GraphOptions> = {}
  ) {
    this.eventEmitter = new EventEmitter();
    this._options = <GraphOptions>Object.assign(
      {
        path: 'generated_tiles',
        colors: d3.schemeTableau10,
        tileSize: 256,

        baseZoomImgSize: 512,
        initialZoomScale: 1,
        zoomLevels: 3,

        animationTicksTimeouSeconds: 10,
        animationTicksMaxIters: 100,

        nodeFill: 'currentColor',
        nodeStroke: '#fff',
        nodeStrokeWidth: 1.5,
        nodeStrokeOpacity: 1,
        nodeRadius: 5,

        linkStroke: '#999',
        linkStrokeWidth: 1.5,
        linkStrokeOpacity: 0.6,
        linkStrokeLinecap: 'round',
      },
      options
    );

    const dom = new JSDOM(`<body></body>`);
    const container = d3.select(dom.window.document.querySelector('body'));
    this.svg = container.append('svg');
  }

  public on(event: 'progress', listener: (event: GraphEvent) => void): void {
    this.eventEmitter.on(event, listener);
  }

  private emit(event: GraphEvent) {
    this.eventEmitter.emit('progress', event);
  }

  async simulate(): Promise<void> {
    this.isSVGGenerated = false;

    const simulationEvent = new GraphEvent('simulation', {
      current: 0,
      max: this._options.animationTicksMaxIters,
    });
    this.emit(simulationEvent);

    const G = d3.map(this.nodes, (node) => node.group);

    const nodeGroups = d3.sort(G);
    const color = d3.scaleOrdinal(nodeGroups, this._options.colors);

    const link = this.getLink();
    const node = this.getNode(color);

    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(this.links).id(({ index: i }) => this.nodes[Number(i)].index);

    let timer: NodeJS.Timeout;
    let tickCounter = 0;

    return new Promise((resolve) => {
      const onSimulationFinish = () => {
        clearTimeout(timer);
        simulation.stop();
        this.isSVGGenerated = true;
        resolve();
      };

      const resetTimer = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          onSimulationFinish();
        }, this._options.animationTicksTimeouSeconds * 1000);
      };

      const ticked = () => {
        tickCounter++;
        resetTimer();

        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

        simulationEvent.progress.current = tickCounter;
        this.emit(simulationEvent);

        if (tickCounter === this._options.animationTicksMaxIters) {
          onSimulationFinish();
        }
      };

      const simulation = d3
        .forceSimulation(this.nodes)
        .force('link', forceLink)
        .force('charge', forceNode)
        .force('center', d3.forceCenter())
        .on('tick', ticked);
    });
  }

  private getLink() {
    return this.svg
      .append('g')
      .attr('stroke', this._options.linkStroke)
      .attr('stroke-opacity', this._options.linkStrokeOpacity)
      .attr('stroke-width', this._options.linkStrokeWidth)
      .attr('stroke-linecap', this._options.linkStrokeLinecap)
      .selectAll('line')
      .data(this.links)
      .join('line');
  }

  private getNode(color: d3.ScaleOrdinal<number, string, never>) {
    return this.svg
      .append('g')
      .attr('fill', this._options.nodeFill)
      .attr('stroke', this._options.nodeStroke)
      .attr('stroke-opacity', this._options.nodeStrokeOpacity)
      .attr('stroke-width', this._options.nodeStrokeWidth)
      .selectAll('circle')
      .data(this.nodes)
      .join('circle')
      .attr('r', this._options.nodeRadius)
      .attr('fill', (d: any) => color(d.group));
  }

  async generateTiles(generatePreview = false) {
    if (!this.isSVGGenerated) await this.simulate();

    for (let z = 1; z <= this._options.zoomLevels; z++) {
      const { img, w, h } = this.image(z);
      await this.generateTilesForZoom(img, w, h, z);
    }
  }

  private async generateTilesForZoom(img: sharp.Sharp, w: number, h: number, z: number) {
    const generationEvent = new GraphEvent('tiling', {
      current: 0,
      max: (w / this._options.tileSize) * (h / this._options.tileSize),
      z,
    });
    for (let i = 0; i < w / this._options.tileSize; i++) {
      for (let j = 0; j < h / this._options.tileSize; j++) {
        await this.generateTile(img, i, j, z);
        generationEvent.progress.current++;
        this.emit(generationEvent);
      }
    }
  }

  private async generateTile(img: sharp.Sharp, i: number, j: number, z: number) {
    const fileName = `${this._options.path}/tiles/${z}/${i}-${j}.png`;
    const area = {
      left: i * this._options.tileSize,
      top: j * this._options.tileSize,
      width: this._options.tileSize,
      height: this._options.tileSize,
    };

    await img.clone().extract(area).toFile(fileName);
  }

  image(z: number = 0): { img: sharp.Sharp; w: number; h: number } {
    if (!this.isSVGGenerated) throw Error('Run simulation first');

    const w = z * this._options.baseZoomImgSize;
    const h = w;
    const t = d3.zoomIdentity.translate(w / 2, h / 2).scale(z * this._options.initialZoomScale);

    this.svg
      .attr('transform', <any>t)
      .attr('width', w)
      .attr('height', h)
      .attr('viewBox', `0 0 ${w} ${h}`);

    const svgTxt = this.svg.node().outerHTML;
    const buff = Buffer.from(svgTxt, 'utf-8');
    const img = sharp(buff).png();

    return { img, w, h };
  }
}
