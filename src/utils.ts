export type RegisteredService<TService> = {
  name: string;
  registrationType: 'singleton' | 'transient' | 'scoped';
  impl: Function;
  teardown?: (...args: any[]) => Promise<void>;
  dependencies: string[];
};

export function isClass(obj: any): boolean {
  return typeof obj === 'function' && obj.hasOwnProperty('prototype');
}

export function isConstructor(func: any): func is new (...args: any[]) => any {
  return typeof func === 'function' && !!func.prototype && !!func.prototype.constructor;
}
