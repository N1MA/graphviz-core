import * as fs from 'fs';
import { GraphNode } from './graph-node';
import { GraphLink } from './graph-link';
import { ForceGraph } from './force-graph';
import * as readline from 'readline';

function cleanUpDir() {
  if (fs.existsSync('generated')) {
    fs.rmSync(`generated`, { recursive: true, force: true });
  }

  fs.mkdirSync(`generated/tiles`, { recursive: true });

  for (let i = 0; i < 4; i++) {
    fs.mkdirSync(`generated/tiles/${i + 1}`);
  }
}

function smallTest() {
  console.log('small graph');
  cleanUpDir();
  const nodes = <GraphNode[]>(
    JSON.parse(fs.readFileSync('src/resources/miserables-node.json').toString())
  );
  const links = <GraphLink[]>(
    JSON.parse(fs.readFileSync('src/resources/miserables-link.json').toString())
  );
  const graph = new ForceGraph(Array.from(nodes.values()), links, {
    path: 'generated',
    zoomLevels: 4,
  });
  graph.generateTiles().then(() => console.log('done'));
}

smallTest();

// function medTest() {
//   const nodes = new Map<number, GraphNode>();
//   const links: GraphLink[] = [];

//   let lineno = 0;
//   readline
//     .createInterface({
//       input: fs.createReadStream('src/resources/deezer_europe/deezer_europe_edges.csv'),
//     })
//     .on('line', function lineReadHandler(line) {
//       lineno++;
//       const [sourceStr, targetStr] = line.split(',');
//       const source = Number(sourceStr),
//         target = Number(targetStr);

//       if (isNaN(source) || isNaN(target)) {
//         console.log(lineno, sourceStr, targetStr);
//         return;
//       }
//       nodes.set(source, { index: source, group: 0, name: sourceStr });
//       nodes.set(target, { index: target, group: 0, name: targetStr });
//       links.push({ source: source, target: target, value: 0 });
//     })
//     .on('close', function readerCloseHandler() {
//       const body = d3.select(dom.window.document.querySelector('body'));
//       const graph = new ForceGraph(Array.from(nodes.values()), links);
//       graph.draw(body);
//     });
// }

// medTest();
