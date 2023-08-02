import { RegisteredService } from './utils';

export class Graph {
  nodes: Set<RegisteredService<any>>;
  edges: Map<RegisteredService<any>, Set<RegisteredService<any>>>;

  constructor() {
    this.nodes = new Set();
    this.edges = new Map();
  }

  addNode(node: RegisteredService<any>) {
    this.nodes.add(node);
  }

  addEdge(source: RegisteredService<any>, destination: RegisteredService<any>) {
    if (!this.edges.has(source)) {
      this.edges.set(source, new Set());
    }
    this.edges.get(source)?.add(destination);
  }

  dependenciesOf(node) {
    return this.edges.get(node) || new Set();
  }
}

export function sortTopologically(registrations: RegisteredService<any>[]): RegisteredService<any>[] {
  const graph = new Graph();

  // Add services as nodes
  for (const registration of registrations) {
    graph.addNode(registration);
    for (const dependency of registration.dependencies) {
      const dependencyRegistration = registrations.find((reg) => reg.name === dependency);
      graph.addEdge(registration, dependencyRegistration as RegisteredService<any>);
    }
  }

  const sorted: RegisteredService<any>[] = [];
  const visited = new Set();
  const recursionStack = new Set();

  function visit(node: RegisteredService<any>) {
    if (!graph.nodes.has(node)) {
      return;
    }

    if (recursionStack.has(node)) {
      throw new Error('Graph has cyclic dependencies');
    }

    if (visited.has(node)) {
      return;
    }

    recursionStack.add(node);

    for (const dependency of graph.dependenciesOf(node)) {
      visit(dependency);
    }

    recursionStack.delete(node);
    visited.add(node);

    sorted.push(node);
  }

  for (const node of graph.nodes) {
    visit(node);
  }

  return sorted;
}
