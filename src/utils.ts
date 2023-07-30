export type RegisteredService<TService> = {
  name: string;
  registrationType: 'singleton' | 'transient' | 'scoped';
  impl: Function;
  teardown?: (...args: any[]) => Promise<void>;
};

export function isConstructor(func: any): func is new (...args: any[]) => any {
  return typeof func === 'function' && !!func.prototype && !!func.prototype.constructor;
}