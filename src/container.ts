import { describeTarget } from './describe-params';
import { RequestScope } from './scoped-manager';

export type RegisteredService<TService> = {
  name: string;
  type: 'singleton' | 'transient' | 'scoped';
  setupFn: (...args: any[]) => Promise<TService>;
  teardownFn?: (...args: any[]) => Promise<void>;
};

/**
 * Container for managing dependency injection
 *
 * @example
 * // Register services with the container
 * const container = await Container.initiate([
 *   {
 *     name: 'logger',
 *     type: 'singleton',
 *     setupFn: async () => {
 *       const logger = new Logger();
 *       await logger.init();
 *       return logger;
 *     },
 *     teardownFn: async () => {
 *       const logger = Container.instance.getSingleton('logger');
 *       await logger.close();
 *     }
 *   }
 * ]);
 *
 * // Inject services into a function
 * const fn = await container.inject(['logger'], ([logger]) => {
 *   return () => {
 *     logger.log('Hello world!');
 *   }
 * });
 *
 * // Run the function
 * fn();
 */
export class Container {
  private static _instance: Container;
  private _singletons = new Map<string, any>();
  private _services = new Map<string, RegisteredService<any>>();

  private constructor() {}

  /**
   * Returns the singleton instance of the container
   * @throws {Error} If the container has not been initialized
   * @returns {Container} The singleton instance of the container
   */
  public static get instance(): Container {
    if (!Container._instance) {
      throw new Error('Container has not been initialized');
    }

    return Container._instance;
  }

  /**
   * Initializes the singleton instance of the container
   *
   * @param services Services to register with the container
   * @throws {Error} If the container has already been initialized
   * @throws {Error} If a service with the same name has already been registered
   * @returns {Promise<Container>} The singleton instance of the container
   */
  public static async getInstance(services: RegisteredService<any>[]): Promise<Container> {
    if (!Container._instance) {
      Container._instance = new Container();
    }

    for (const service of services) {
      Container._instance._services.set(service.name, service);
    }

    await Container._instance.setupSingletons();

    return Container._instance;
  }

  /**
   * Tears down all singleton services and clears the container
   * @returns {Promise<void>}
   * @throws {Error} If the container has not been initialized
   */
  public static async destroy() {
    if (!Container._instance) {
      throw new Error('Container has not been initialized');
    }

    const singletons = Array.from(Container._instance._services.entries()).filter(
      ([_, service]) => service.type === 'singleton',
    );

    for (const [serviceName, service] of singletons) {
      if (service.teardownFn) await service.teardownFn();
      Container._instance._singletons.delete(serviceName);
    }

    Container._instance._services.clear();
  }

  /**
   * Initializes scoped services and runs the callback function.
   * This is typically used in a request lifecycle.
   *
   * @param next Callback function to run after initializing scoped services
   * @returns {Promise<any>} The result of the callback function
   */
  public static async startScope(next: (...args) => any) {
    return RequestScope.run(async () => {
      const scopedServices = Array.from(Container._instance._services.entries()).filter(
        ([_, service]) => service.type === 'scoped',
      );

      for (const [serviceName, service] of scopedServices) {
        const instance = await this._instance.resolve(service.setupFn);
        RequestScope.setScoped(serviceName, instance);
      }

      await next();
    });
  }

  /**
   * Tears down scoped services
   * @returns {Promise<void>}
   * @throws {Error} If the container has not been initialized
   */
  public static async endScope() {
    if (!Container._instance) {
      throw new Error('Container has not been initialized');
    }

    const scopedServices = Array.from(Container._instance._services.entries()).filter(
      ([_, service]) => service.type === 'scoped',
    );

    for (const [serviceName, service] of scopedServices) {
      const instance = RequestScope.getScoped(serviceName);
      if (instance && service.teardownFn) await service.teardownFn();
      RequestScope.deleteKey(serviceName);
    }
  }

  /**
   * Injects services into the receiving function
   * and tears down any transient services after
   * the receiving function completes.
   *
   * @param receivingFn Function to inject services into
   * @returns {Promise<(...args) => any>} The receiving function with services injected
   */
  public async inject(serviceNames: string[], receivingFn: (...args) => any): Promise<(...args) => any> {
    const services = await Promise.all(serviceNames.map((serviceName) => this.getService(serviceName)));

    try {
      return receivingFn(...services);
    } finally {
      const transientServices = serviceNames
        .map((serviceName) => this._services.get(serviceName))
        .filter((service) => service?.type === 'transient');

      for (const service of transientServices) {
        if (service?.teardownFn) await service.teardownFn();
      }
    }
  }

  /**
   * Resolves a function by injecting services into it
   *
   * @param func Function to resolve
   * @returns {Promise<(...args) => any>} The resolved function
   * @throws {Error} If the function has parameters that are not registered services
   */
  public async resolve(func: (...args) => any): Promise<(...args) => any> {
    if (func.length === 0) {
      return await func();
    }

    const params = describeTarget(func);
    const registeredServices = params
      .map((param) => this._services.get(param.name))
      .filter((service) => service !== undefined);

    if (registeredServices.length === 0) {
      return await func();
    }

    if (registeredServices.length !== params.length) {
      throw new Error('Not all parameters are registered services: ' + params.join(', '));
    }

    return await this.inject(
      params.map((x) => x.name),
      func,
    );
  }

  private async setupSingletons(): Promise<void> {
    const singletons = Array.from(this._services.entries()).filter(([_, service]) => service.type === 'singleton');

    for (const [serviceName, service] of singletons) {
      const instance = await this.resolve(service.setupFn);
      this._singletons.set(serviceName, instance);
    }
  }

  private async getService(serviceName: string): Promise<any> {
    const service = this._services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    // If the service is a singleton, return the singleton instance
    if (service.type === 'singleton') {
      const singletonService = this._singletons.get(serviceName);
      if (!singletonService) {
        throw new Error(`Singleton ${serviceName} not initialized`);
      }

      return singletonService;
    }

    // If the service is scoped, return a new instance if one does not exist
    // for the current scope, otherwise return the existing instance
    if (service.type === 'scoped') {
      const serviceInstance = RequestScope.getScoped(serviceName);
      if (!serviceInstance) {
        const newInstance = await this.resolve(service.setupFn);
        RequestScope.setScoped(serviceName, newInstance);
        return newInstance;
      }

      return serviceInstance;
    }

    // If the service is transient, return a new instance
    const instance = await this.resolve(service.setupFn);
    return instance;
  }
}

export function singleton<TService>(
  name: string,
  setupFn: (...args: any[]) => Promise<TService>,
  teardownFn?: (...args: any[]) => Promise<void>,
): RegisteredService<TService> {
  return {
    name,
    type: 'singleton',
    setupFn,
    teardownFn,
  };
}

export function scoped<TService>(
  name: string,
  setupFn: (...args: any[]) => Promise<TService>,
  teardownFn?: (...args: any[]) => Promise<void>,
): RegisteredService<TService> {
  return {
    name,
    type: 'scoped',
    setupFn,
    teardownFn,
  };
}

export function transient<TService>(
  name: string,
  setupFn: (...args: any[]) => Promise<TService>,
  teardownFn?: (...args: any[]) => Promise<void>,
): RegisteredService<TService> {
  return {
    name,
    type: 'transient',
    setupFn,
    teardownFn,
  };
}
