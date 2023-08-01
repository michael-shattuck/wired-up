import { describeTarget } from './describe-target';
import { RequestScope } from './scoped-manager';
import { RegisteredService, isClass, isConstructor } from './utils';

/**
 * Container for managing dependency injection
 *
 * @example
 * // Register services with the container
 * const container = await Container.initiate([
 *   {
 *     name: 'logger',
 *     type: 'singleton',
 *     impl: async () => {
 *       const logger = new Logger();
 *       await logger.init();
 *       return logger;
 *     },
 *     teardown: async () => {
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
  public static async init(services: RegisteredService<any>[]): Promise<Container> {
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

    const singletons = Array.from(Container._instance._singletons.entries()).filter(
      ([_, service]) => service.registrationType === 'singleton',
    );

    for (const [serviceName, service] of singletons) {
      const singletonService = Container._instance._singletons.get(serviceName);
      if (service.teardown) {
        if (isClass(service.impl)) await singletonService[service.teardown.name]();
        else await service.teardown();
      }

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
        ([_, service]) => service.registrationType === 'scoped',
      );

      for (const [serviceName, service] of scopedServices) {
        const instance = await this._instance.resolve(service.impl);
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
      ([_, service]) => service.registrationType === 'scoped',
    );

    for (const [serviceName, service] of scopedServices) {
      const instance = RequestScope.getScoped(serviceName);
      if (instance && service.teardown) {
        if (isClass(service.impl)) await instance[service.teardown.name]();
        else await service.teardown();
      }

      RequestScope.deleteKey(serviceName);
    }
  }

  /**
   * Resolves a function by injecting services into it
   *
   * @param func Function to resolve
   * @returns {Promise<(...args) => any>} The resolved function
   * @throws {Error} If the function has parameters that are not registered services
   */
  public async resolve(func: Function): Promise<Function> {
    const hasConstructor = isConstructor(func);
    const params = describeTarget(func);

    if (params.length === 0) {
      return hasConstructor ? new func() : await func();
    }

    const registeredServices = params
      .map((param) => this._services.get(param))
      .filter((service) => service !== undefined);

    if (registeredServices.length !== params.length) {
      throw new Error('Not all parameters are registered services: ' + params.join(', '));
    }

    const services = await Promise.all(params.map((serviceName) => this.getService(serviceName)));

    try {
      return hasConstructor ? new func(...services) : await func(...services);
    } finally {
      const transientServices = params
        .map((serviceName) => this._services.get(serviceName))
        .filter((service) => service?.registrationType === 'transient');

      for (const service of transientServices) {
        if (service?.teardown) {
          if (hasConstructor) await services[service.teardown.name]();
          else await service.teardown();
        }
      }
    }
  }

  /**
   * Retrieve an injected instance of the requested service.
   * 
   * @param serviceName Name of the service to get
   * @returns 
   */
  public async getService(serviceName: string): Promise<any> {
    const service = this._services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    // If the service is a singleton, return the singleton instance
    if (service.registrationType === 'singleton') {
      const singletonService = this._singletons.get(serviceName);
      if (!singletonService) {
        throw new Error(`Singleton ${serviceName} not initialized`);
      }

      return singletonService;
    }

    // If the service is scoped, return a new instance if one does not exist
    // for the current scope, otherwise return the existing instance
    if (service.registrationType === 'scoped') {
      const serviceInstance = RequestScope.getScoped(serviceName);
      if (!serviceInstance) {
        const newInstance = await this.resolve(service.impl);
        RequestScope.setScoped(serviceName, newInstance);
        return newInstance;
      }

      return serviceInstance;
    }

    // If the service is transient, return a new instance
    const instance = await this.resolve(service.impl);
    return instance;
  }

  private async setupSingletons(): Promise<void> {
    const singletons = Array.from(this._services.entries()).filter(
      ([_, service]) => service.registrationType === 'singleton',
    );

    for (const [serviceName, service] of singletons) {
      const instance = await this.resolve(service.impl);
      this._singletons.set(serviceName, instance);
    }
  }
}

export function singleton<TService>(
  name: string,
  impl: Function,
  teardown?: (...args: any[]) => Promise<void>,
): RegisteredService<TService> {
  return {
    name,
    registrationType: 'singleton',
    impl,
    teardown,
  };
}

export function scoped<TService>(
  name: string,
  impl: Function,
  teardown?: (...args: any[]) => Promise<void>,
): RegisteredService<TService> {
  return {
    name,
    registrationType: 'scoped',
    impl,
    teardown,
  };
}

export function transient<TService>(
  name: string,
  impl: Function,
  teardown?: (...args: any[]) => Promise<void>,
): RegisteredService<TService> {
  return {
    name,
    registrationType: 'transient',
    impl,
    teardown,
  };
}
