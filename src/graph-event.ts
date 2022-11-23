type GraphEventProgress = {
  current: number;
  max: number;
  z?: number;
};

export default class GraphEvent {
  constructor(public phase: 'simulation' | 'tiling', public progress: GraphEventProgress) {}
}
