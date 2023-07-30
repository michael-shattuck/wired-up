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
    function simpleFunc(a, b, c) { return + b + c; };
    expect(describeTarget(simpleFunc)).toEqual(['a', 'b', 'c']);
  });

  test('should return an array of class constructor', () => {
    class SimpleClass {
      constructor(a, b, c) {}
    }
    
    expect(describeTarget(SimpleClass)).toEqual(['a', 'b', 'c']);
  });
});