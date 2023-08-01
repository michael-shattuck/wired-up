import { describeTarget } from '../describe-target';

describe('describeTarget function', () => {
  test('should throw an error if argument is not a function', () => {
    expect(() => describeTarget('not a function' as any)).toThrow('Must pass a function or a class');
  });

  test('should return an array of parameter names for an expression statement', () => {
    const simpleFunc = (a, b, c) => a + b + c;
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should return an array of parameter names for a simple function', () => {
    function simpleFunc(a, b, c) {
      return a + b + c;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should return an array of class constructor', () => {
    class SimpleClass {
      constructor(a, b, c) {}
    }

    expect(describeTarget(SimpleClass)).toEqual(['a', 'b', 'c']);
  });

  test('should be able to handle async functions', () => {
    async function simpleFunc(a, b, c) {
      return a + b + c;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should be able to handle async arrow functions', () => {
    const simpleFunc = async (a, b, c) => a + b + c;
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle functions with types', () => {
    function simpleFunc(a: string, b: number, c: boolean) {
      return a + b + c;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle functions with default values', () => {
    function simpleFunc(a = 'a', b = 1, c = true) {
      return a + b + c;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle functions with default values and types', () => {
    function simpleFunc(a: string = 'asdf', b: number = 2, c: boolean = false) {
      return a + b + c;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle functions with odd formatting', () => {
    function simpleFunc(a: string = 'asdf', b: number = 2, c: boolean = false) {
      return a + b + c;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle functions with odd formatting and no types', () => {
    function simpleFunc(a = 'asdf', b = 2, c = false) {
      return a + b + c;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle functions with odd formatting and no types and no default values', () => {
    function simpleFunc(a, b, c) {
      return a + b + c;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle many dependencies', () => {
    function simpleFunc(a, b, c, d, e, f, g, h, i, j) {
      return a + b + c + d + e + f + g + h + i + j;
    }
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
  });

  test('should handle zero dependencies', () => {
    function simpleFunc() {
      return 1;
    }
    expect(describeTarget(simpleFunc)).toEqual([]);
  });

  test('should handle standard functions with nested functions', () => {
    function simpleFunc(a, b, c) {
      function nestedFunc(d, e, f) {
        return d + e + f;
      }
      return a + b + c + nestedFunc(1, 2, 3);
    }

    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle arrow functions with nested functions', () => {
    const simpleFunc = (a, b, c) => {
      const nestedFunc = (d, e, f) => {
        return d + e + f;
      }
      return a + b + c + nestedFunc(1, 2, 3);
    }

    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should handle async arrow functions with nested functions', () => {
    const simpleFunc = async (a: number, b: number, c: number): Promise<number> => {
      const nestedFunc = async (d: number, e: number, f: number): Promise<number> => {
        return d + e + f;
      }
      return a + b + c + await nestedFunc(1, 2, 3);
    }

    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });
});
