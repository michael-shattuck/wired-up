import { Graph } from '../topological-sort';

describe('Graph', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  test('should add a node correctly', () => {
    const node = { id: 1 };
    graph.addNode(node);

    expect(graph.nodes.size).toBe(1);
    expect(graph.nodes.has(node)).toBe(true);
  });

  test('should add an edge correctly', () => {
    const node1 = { id: 1 };
    const node2 = { id: 2 };
    graph.addNode(node1);
    graph.addNode(node2);
    graph.addEdge(node1, node2);

    expect(graph.edges.size).toBe(1);
    expect(graph.edges.get(node1).has(node2)).toBe(true);
  });

  test('should handle adding multiple edges from the same source correctly', () => {
    const node1 = { id: 1 };
    const node2 = { id: 2 };
    const node3 = { id: 3 };
    graph.addNode(node1);
    graph.addNode(node2);
    graph.addNode(node3);
    graph.addEdge(node1, node2);
    graph.addEdge(node1, node3);

    expect(graph.edges.size).toBe(1);
    expect(graph.edges.get(node1).has(node2)).toBe(true);
    expect(graph.edges.get(node1).has(node3)).toBe(true);
  });

  test('should return dependencies correctly', () => {
    const node1 = { id: 1 };
    const node2 = { id: 2 };
    graph.addNode(node1);
    graph.addNode(node2);
    graph.addEdge(node1, node2);

    const dependencies = graph.dependenciesOf(node1);
    expect(dependencies.size).toBe(1);
    expect(dependencies.has(node2)).toBe(true);
  });

  test('should handle nodes without dependencies correctly', () => {
    const node1 = { id: 1 };
    graph.addNode(node1);

    const dependencies = graph.dependenciesOf(node1);
    expect(dependencies.size).toBe(0);
  });

  test('should handle nodes with no dependencies set correctly', () => {
    const node1 = { id: 1 };
    graph.addNode(node1);
    graph.addEdge(node1, undefined);

    const dependencies = graph.dependenciesOf(node1);
    expect(dependencies.size).toBe(1);
    expect(dependencies.has(undefined)).toBe(true);
  });
});
