import { WiredUpContainerConfig, getDefaultContainerConfig } from './config';
import { describeTarget } from './describe-target';
import { RegistrationBuilder } from './registration-builder';
import { RequestScope } from './scoped-manager';
import { sortTopologically } from './topological-sort';
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
  private _config: WiredUpContainerConfig;
  private _initialized = false;
  private _singletons = new Map<string, any>();
  private _registrations = new Map<string, RegisteredService<any>>();

  private constructor(config?: WiredUpContainerConfig) {
    this._config = !config 
      ? getDefaultContainerConfig()
      : { ...getDefaultContainerConfig(), ...config };

    if (config?.logLevel) {
      console.log(`WiredUp: Logging level set to ${config.logLevel}`);
    }

    if (config?.lazyLoad === false) {
      console.log('WiredUp: Lazy loading disabled');
    }
  }

  /**
   * Returns the singleton instance of the container
   * @throws {Error} If the container has not been initialized
   * @returns {Container} The singleton instance of the container
   */
  public static get instance(): Container {
    if (!Container._instance) {
      throw new Error('Container has not been initialized. Please call the init() method first.');
    }

    return Container._instance;
  }

  /**
   * Initializes the container and provides a fluent interface for registering services
   * 
   * @returns {RegistrationBuilder} Fluent interface for registering services
   */
  public static register(config?: WiredUpContainerConfig) {
    if (!Container._instance) {
      Container._instance = new Container(config);
    }

    return new RegistrationBuilder(Container.instance);
  }

  /**
   * Initializes the container and registers services
   * 
   * @param services Services to register with the container
   * @param config Configuration for the container
   * @returns {Promise<Container>} The singleton instance of the container
   * @throws {Error} If the container has already been initialized
   * @throws {Error} If a service with the same name has already been registered
   * @returns {Promise<Container>} The singleton instance of the container
   */
  public static async init(services: RegisteredService<any>[], config?: WiredUpContainerConfig): Promise<Container> {
    if (!Container._instance) {
      Container._instance = new Container(config);
    }

    return await Container._instance.build(services);
  }

  /**
   * Builds the container and registers services
   *
   * @param services Services to register with the container
   * @throws {Error} If the container has already been initialized
   * @throws {Error} If a service with the same name has already been registered
   * @returns {Promise<Container>} The singleton instance of the container
   */
  public async build(services: RegisteredService<any>[]): Promise<Container> {
    if (this._initialized) {
      throw new Error('Container has already been initialized');
    }

    // Sort services topologically
    const sortedServices = sortTopologically([...this.registrations, ...services]);

    // Throw error if a service if there are duplicate service names
    const serviceNames = sortedServices.map((service) => service.name);
    const duplicateServiceNames = serviceNames.filter((serviceName, index) => serviceNames.indexOf(serviceName) !== index);
    if (duplicateServiceNames.length > 0) {
      throw new Error(`Duplicate service names: ${duplicateServiceNames.join(', ')}`);
    }

    // Throw error if a service has already been registered
    const registeredServiceNames = Array.from(this._registrations.keys());
    const duplicateRegistrations = serviceNames.filter((serviceName) => registeredServiceNames.includes(serviceName));
    if (duplicateRegistrations.length > 0) {
      throw new Error(`Service already registered: ${duplicateRegistrations.join(', ')}`);
    }

    for (const service of sortedServices) {
      this._registrations.set(service.name, service);
    }

    if (this._config?.lazyLoad === false) {
      await this.setupSingletons();
    }

    return this;
  }

  /**
   * Returns all registered services
   * 
   * @returns {RegisteredService<any>[]} All registered services
   * @throws {Error} If the container has not been initialized
   */
  public get registrations() {
    return Array.from(Container._instance._registrations.values());
  }

  /**
   * Static access to all registered services
   * 
   * @returns {RegisteredService<any>[]} All registered services
   * @throws {Error} If the container has not been initialized
   */
  public static get registrations() {
    if (!Container._instance) {
      throw new Error('Container has not been initialized. Please call the init() method first.');
    }

    return Array.from(Container._instance.registrations);
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

    Container._instance._registrations.clear();
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
      const scopedServices = Array.from(Container._instance._registrations.entries()).filter(
        ([_, service]) => service.registrationType === 'scoped',
      );

      for (const [serviceName, service] of scopedServices) {
        const instance = await this._instance.resolve(service.impl, service.dependencies);
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

    const scopedServices = Array.from(Container._instance._registrations.entries()).filter(
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
  public async resolve(func: Function, dependencies?: string[]): Promise<Function> {
    const hasConstructor = isConstructor(func);
    const params = dependencies || describeTarget(func);

    if (params.length === 0) {
      return hasConstructor ? new func() : await func();
    }

    const registeredServices = params
      .map((param) => this._registrations.get(param))
      .filter((service) => service !== undefined);

    if (registeredServices.length !== params.length) {
      throw new Error('Not all parameters are registered services: ' + params.join(', '));
    }

    const services = await Promise.all(params.map((serviceName) => this.getService(serviceName)));

    try {
      return hasConstructor ? new func(...services) : await func(...services);
    } finally {
      const transientServices = params
        .map((serviceName) => this._registrations.get(serviceName))
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
    const service = this._registrations.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    // If the service is a singleton, return the singleton instance
    if (service.registrationType === 'singleton') {
      if (!this._singletons[serviceName]) {
        this._singletons[serviceName] = await this.resolve(service.impl, service.dependencies);
      }

      return this._singletons[serviceName];
    }

    // If the service is scoped, return a new instance if one does not exist
    // for the current scope, otherwise return the existing instance
    if (service.registrationType === 'scoped') {
      const serviceInstance = RequestScope.getScoped(serviceName);
      if (!serviceInstance) {
        const newInstance = await this.resolve(service.impl, service.dependencies);
        RequestScope.setScoped(serviceName, newInstance);
        return newInstance;
      }

      return serviceInstance;
    }

    // If the service is transient, return a new instance
    const instance = await this.resolve(service.impl, service.dependencies);
    return instance;
  }

  private async setupSingletons(): Promise<void> {
    const singletons = Array.from(this._registrations.entries()).filter(
      ([_, service]) => service.registrationType === 'singleton',
    );

    for (const [serviceName, service] of singletons) {
      const instance = await this.resolve(service.impl, service.dependencies);
      this._singletons.set(serviceName, instance);
    }
  }
}