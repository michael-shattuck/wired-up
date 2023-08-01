import { RegisteredService } from "./utils";

export class Graph {
  nodes: Set<any>;
  edges: Map<any, any>;

  constructor() {
    this.nodes = new Set();
    this.edges = new Map();
  }

  addNode(node) {
    this.nodes.add(node);
  }

  addEdge(source, destination) {
    if (!this.edges.has(source)) {
      this.edges.set(source, new Set());
    }
    this.edges.get(source).add(destination);
  }

  dependenciesOf(node) {
    return this.edges.get(node) || new Set();
  }
}

export function sortTopologically(registrations: RegisteredService<any>[]): RegisteredService<any>[] {
  const graph = new Graph();

  // Add services as nodes
  for (let registration of registrations) {
    graph.addNode(registration);
  }

  // Add dependency edges 
  for (let registration of registrations) {
    for (let dependency of registration.dependencies) {
      graph.addEdge(registration, dependency);
    }
  }

  const sorted: RegisteredService<any>[] = [];
  const visited = new Set();

  function visit(node: RegisteredService<any>) {
    if (!graph.nodes.has(node)) {
      throw new Error('Graph has unknown node');
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);

    for (const dependency of graph.dependenciesOf(node)) {
      visit(dependency);
    }

    sorted.unshift(node);
  }

  for (const node of graph.nodes) {
    visit(node);
  }

  return sorted;
}