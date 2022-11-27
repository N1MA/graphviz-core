declare type GraphEventProgress = {
    current: number;
    max: number;
    z?: number;
};
export default class GraphEvent {
    phase: 'simulation' | 'tiling';
    progress: GraphEventProgress;
    constructor(phase: 'simulation' | 'tiling', progress: GraphEventProgress);
}
export {};
