import { sortTopologically } from '../topological-sort';
import { RegisteredService } from '../utils';

describe('sortTopologically', () => {
  test('should return an empty array for an empty input', () => {
    const sorted = sortTopologically([]);
    expect(sorted).toEqual([]);
  });

  test('should sort a single node correctly', () => {
    const node: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: [],
    };
    const sorted = sortTopologically([node]);
    expect(sorted).toEqual([node]);
  });

  test('should sort multiple nodes correctly', () => {
    const node1: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: ['Node2'],
    };
    const node2: RegisteredService<any> = {
      name: 'Node2',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: [],
    };
    const sorted = sortTopologically([node1, node2]);
    expect(sorted).toEqual([node2, node1]);
  });

  test('should handle nodes with cyclic dependencies correctly', () => {
    const node1: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: ['Node2'],
    };
    const node2: RegisteredService<any> = {
      name: 'Node2',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: ['Node1'],
    };
    expect(() => sortTopologically([node1, node2])).toThrowError('Graph has cyclic dependencies');
  });

  test('should sort nodes with the correct order of dependencies', () => {
    const node1: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: ['Node2', 'Node3'],
    };
    const node2: RegisteredService<any> = {
      name: 'Node2',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: ['Node3'],
    };
    const node3: RegisteredService<any> = {
      name: 'Node3',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: [],
    };
    const sorted = sortTopologically([node1, node2, node3]);
    expect(sorted).toEqual([node3, node2, node1]);
  });

  test('should handle nodes with teardown correctly', () => {
    const node1: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: ['Node2'],
      teardown: async () => {},
    };
    const node2: RegisteredService<any> = {
      name: 'Node2',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: [],
    };
    const sorted = sortTopologically([node1, node2]);
    expect(sorted).toEqual([node2, node1]);
  });

  test('should handle nodes with different registration types correctly', () => {
    const node1: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: ['Node2'],
    };
    const node2: RegisteredService<any> = {
      name: 'Node2',
      registrationType: 'transient',
      impl: () => {},
      dependencies: [],
    };
    const sorted = sortTopologically([node1, node2]);
    expect(sorted).toEqual([node2, node1]);
  });

  test('should handle nodes with the same registration types correctly', () => {
    const node1: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: ['Node2'],
    };
    const node2: RegisteredService<any> = {
      name: 'Node2',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: [],
    };

    const sorted = sortTopologically([node1, node2]);

    expect(sorted).toEqual([node2, node1]);
  });

  test('should handle nodes with no dependencies correctly', () => {
    const node1: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: [],
    };
    const sorted = sortTopologically([node1]);
    expect(sorted).toEqual([node1]);
  });

  test('should handle nodes with undefined dependencies correctly', () => {
    const node1: RegisteredService<any> = {
      name: 'Node1',
      registrationType: 'singleton',
      impl: () => {},
      dependencies: [undefined as any],
    };
    const sorted = sortTopologically([node1]);

    // Check for the properties of the nodes
    expect(sorted[0].name).toEqual(node1.name);
    expect(sorted[0].registrationType).toEqual(node1.registrationType);
    expect(sorted[0].impl).toEqual(node1.impl);
    expect(sorted[0].dependencies).toEqual([]);
  });
});
