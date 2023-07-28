import 'reflect-metadata';

interface TargetMetadata {
  name: string;
  type: any;
  defaultValue: any;
}

/**
 * Returns the parameters of a function as an array of strings.
 *
 * @param func The function to describe
 * @returns
 */
export function describeTarget(func: (...args) => any): TargetMetadata[] {
  if (typeof func !== 'function') {
    throw Error('Must pass a function');
  }

  const metadata = Reflect.getMetadata('design:paramtypes', func);
  return metadata.map((param) => ({
    name: param.name,
    type: param,
    defaultValue: param.defaultValue,
  }));
}
