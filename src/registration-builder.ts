import { Container } from "./container";
import { describeTarget } from "./describe-target";
import { RegisteredService } from "./utils";

export class RegistrationBuilder {
  container: Container;
  registrations: RegisteredService<any>[] = [];

  constructor(container: Container) {
    this.container = container;
  }

  public singleton(name, impl, teardown?: (...args: any[]) => Promise<void>) {
    const registration = singleton(name, impl, teardown);
    this.registrations.push(registration);
  }

  public transient(name, impl, teardown?: (...args: any[]) => Promise<void>) {
    const registration = transient(name, impl, teardown);
    this.registrations.push(registration);
  }

  public scoped(name, impl, teardown?: (...args: any[]) => Promise<void>) {
    const registration = scoped(name, impl, teardown);
    this.registrations.push(registration);
  }

  public build() {
    return this.container.build(this.registrations);
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
    dependencies: describeTarget(impl),
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
    dependencies: describeTarget(impl),
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
    dependencies: describeTarget(impl),
  };
}