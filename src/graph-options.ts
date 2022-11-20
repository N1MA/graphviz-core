export type GraphOptions = {
  path: string;
  colors: string[];
  tileSize: number;

  baseZoomImgSize: number;
  initialZoomScale: number;
  zoomLevels: number;

  animationTicksTimeouSeconds: number;
  animationTicksMaxIters: number;

  nodeFill: string;
  nodeStroke: string;
  nodeStrokeWidth: number;
  nodeStrokeOpacity: number;
  nodeRadius: number;

  linkStroke: string;
  linkStrokeWidth: number;
  linkStrokeOpacity: number;
  linkStrokeLinecap: string;
};
