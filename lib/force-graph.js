"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForceGraph = void 0;
const d3 = __importStar(require("d3"));
const fs = __importStar(require("fs"));
const jsdom_1 = require("jsdom");
const sharp_1 = __importDefault(require("sharp"));
const events_1 = require("events");
const graph_event_1 = __importDefault(require("./graph-event"));
class ForceGraph {
    constructor(nodes, links, options = {}) {
        this.nodes = nodes;
        this.links = links;
        this.isSVGGenerated = false;
        this.eventEmitter = new events_1.EventEmitter();
        this._options = Object.assign({
            storage: (buffer, slug) => __awaiter(this, void 0, void 0, function* () {
                fs.writeFileSync(__dirname + "/generated_tiles/" + slug, buffer);
            }),
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
        }, options);
        const dom = new jsdom_1.JSDOM(`<body></body>`);
        const container = d3.select(dom.window.document.querySelector('body'));
        this.svg = container.append('svg');
    }
    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }
    emit(event) {
        this.eventEmitter.emit('progress', event);
    }
    simulate() {
        return __awaiter(this, void 0, void 0, function* () {
            this.isSVGGenerated = false;
            const simulationEvent = new graph_event_1.default('simulation', {
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
            let timer;
            let tickCounter = 0;
            return new Promise((resolve) => {
                const onSimulationFinish = () => {
                    clearTimeout(timer);
                    simulation.stop();
                    this.isSVGGenerated = true;
                    resolve();
                };
                const resetTimer = () => {
                    if (timer)
                        clearTimeout(timer);
                    timer = setTimeout(() => {
                        onSimulationFinish();
                    }, this._options.animationTicksTimeouSeconds * 1000);
                };
                const ticked = () => {
                    tickCounter++;
                    resetTimer();
                    link
                        .attr('x1', (d) => d.source.x)
                        .attr('y1', (d) => d.source.y)
                        .attr('x2', (d) => d.target.x)
                        .attr('y2', (d) => d.target.y);
                    node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
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
        });
    }
    getLink() {
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
    getNode(color) {
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
            .attr('fill', (d) => color(d.group));
    }
    generateTiles(generatePreview = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isSVGGenerated)
                yield this.simulate();
            for (let z = 1; z <= this._options.zoomLevels; z++) {
                const { img, w, h } = this.image(z);
                yield this.generateTilesForZoom(img, w, h, z);
            }
        });
    }
    generateTilesForZoom(img, w, h, z) {
        return __awaiter(this, void 0, void 0, function* () {
            const generationEvent = new graph_event_1.default('tiling', {
                current: 0,
                max: (w / this._options.tileSize) * (h / this._options.tileSize),
                z,
            });
            for (let i = 0; i < w / this._options.tileSize; i++) {
                for (let j = 0; j < h / this._options.tileSize; j++) {
                    yield this.generateTile(img, i, j, z);
                    generationEvent.progress.current++;
                    this.emit(generationEvent);
                }
            }
        });
    }
    generateTile(img, i, j, z) {
        return __awaiter(this, void 0, void 0, function* () {
            const area = {
                left: i * this._options.tileSize,
                top: j * this._options.tileSize,
                width: this._options.tileSize,
                height: this._options.tileSize,
            };
            const { data } = yield img.clone().extract(area).toBuffer({ resolveWithObject: true });
            this._options.store(data, `tiles/${z}/${i}-${j}.png`);
        });
    }
    image(z = 0) {
        if (!this.isSVGGenerated)
            throw Error('Run simulation first');
        const w = z * this._options.baseZoomImgSize;
        const h = w;
        const t = d3.zoomIdentity.translate(w / 2, h / 2).scale(z * this._options.initialZoomScale);
        this.svg
            .attr('transform', t)
            .attr('width', w)
            .attr('height', h)
            .attr('viewBox', `0 0 ${w} ${h}`);
        const svgTxt = this.svg.node().outerHTML;
        const buff = Buffer.from(svgTxt, 'utf-8');
        const img = (0, sharp_1.default)(buff).png();
        return { img, w, h };
    }
}
exports.ForceGraph = ForceGraph;
