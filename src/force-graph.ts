import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';

import { GraphLink } from './graph-link';
import { GraphNode } from './graph-node';

import { GraphOptions } from './graph-options';

export class ForceGraph {
  private svg: d3.Selection<any, any, any, any>;
  private _options: GraphOptions;
  private isSVGGenerated = false;

  constructor(
    public nodes: GraphNode[],
    public links: GraphLink[],
    options: Partial<GraphOptions> = {}
  ) {
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

  async generateTiles() {
    if (!this.isSVGGenerated) await this.simulate();
    for (let z = 0; z < this._options.zoomLevels; z++) {
      const { img, w, h } = this.image(z + 1, true);
      this.generateTilesForZoom(img, w, h, z);
    }
  }

  async simulate(): Promise<void> {
    return new Promise((resolve) => {
      console.log('Drawing svg');

      this.isSVGGenerated = false;
      const G = d3.map(this.nodes, (node) => node.group);

      const nodeGroups = d3.sort(G);
      const color = d3.scaleOrdinal(nodeGroups, this._options.colors);

      const forceNode = d3.forceManyBody();
      const forceLink = d3.forceLink(this.links).id(({ index: i }) => this.nodes[Number(i)].index);

      let timer: NodeJS.Timeout;
      let tickCounter = 0;

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
        console.log(tickCounter + ' Animation tick ...');
        resetTimer();

        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

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

      const link = this.svg
        .append('g')
        .attr('stroke', this._options.linkStroke)
        .attr('stroke-opacity', this._options.linkStrokeOpacity)
        .attr('stroke-width', this._options.linkStrokeWidth)
        .attr('stroke-linecap', this._options.linkStrokeLinecap)
        .selectAll('line')
        .data(this.links)
        .join('line');

      const node = this.svg
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
    });
  }

  private generateTilesForZoom(img: sharp.Sharp, w: number, h: number, z: number) {
    for
      (let i = 0; i < w / this._options.tileSize; i++)
      for (let j = 0; j < h / this._options.tileSize; j++) this.generateTile(img, i, j, z);
  }

  private generateTile(img: sharp.Sharp, i: number, j: number, z: number) {
    const fileName = `${this._options.path}/tiles/${z + 1}/${i}-${j}.png`;
    const area = {
      left: i * this._options.tileSize,
      top: j * this._options.tileSize,
      width: this._options.tileSize,
      height: this._options.tileSize,
    };

    img
      .clone()
      .extract(area)
      .toFile(fileName)
      .then(() => console.log(`\tGenerated ${fileName}`))
      .catch((e: Error) => {
        console.error('Error: ' + e);
      });
  }

  image(z: number = 0, generatePreview = false): { img: sharp.Sharp; w: number; h: number } {
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

    if (generatePreview) {
      const fileName = `${this._options.path}/preview-${z}.png`;
      img
        .toFile(fileName)
        .then(() => console.log(`Generated ${fileName}`))
        .catch((e) => {
          console.error('Error: ' + e);
        });
    }
    return { img, w, h };
  }
}
