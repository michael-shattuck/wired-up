import { Container, singleton, scoped, transient } from '../container';
import { RequestScope } from '../scoped-manager';

jest.mock('../scoped-manager'); // Mocking RequestScope
const mockRun = RequestScope.run as jest.Mock;

describe('Container class', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Container instance should throw error if not initialized', () => {
    expect(() => Container.instance).toThrow('Container has not been initialized');
  });

  test('Container should be able to initiate singleton classes', async () => {
    const spy = jest.fn()
    class TestClass {
      constructor() { spy() }
    }

    await Container.getInstance([
      singleton('testService', TestClass),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('Container should be able to initiate singleton classes with dependencies', async () => {
    const innerSpy = jest.fn()
    const innerMethodSpy = jest.fn()

    interface IInnerService { method(): void }
    class InnerService implements IInnerService {
      constructor() { innerSpy() }
      method() { innerMethodSpy() }
    }

    const outerSpy = jest.fn()
    class OuterService {
      constructor(innerService: IInnerService) { 
        outerSpy()
        innerService.method()
      }
    }

    await Container.getInstance([
      singleton('innerService', InnerService),
      singleton('outerService', OuterService),
    ]);

    expect(innerSpy).toHaveBeenCalledTimes(1);
    expect(outerSpy).toHaveBeenCalledTimes(1);
    expect(innerMethodSpy).toHaveBeenCalledTimes(1);
  });

  test('Container should be able to initiate singleton services', async () => {
    const setupFn = jest.fn().mockResolvedValue({});
    const teardownFn = jest.fn().mockResolvedValue(undefined);

    await Container.getInstance([
      singleton('testService', setupFn, teardownFn),
    ]);

    expect(setupFn).toHaveBeenCalledTimes(1);
  });

  test('Container should be able to initiate scoped services', async () => {
    const setupFn = jest.fn().mockResolvedValue({});
    const teardownFn = jest.fn().mockResolvedValue(undefined);

    mockRun.mockImplementation(async (callback) => {
      await callback();
    });

    await Container.getInstance([
      scoped('testService', setupFn, teardownFn),
    ]);

    await Container.startScope(() => {});

    expect(setupFn).toHaveBeenCalledTimes(1);
  });

  test('Container should be able to initiate and teardown transient services', async () => {
    const func = jest.fn().mockResolvedValue({});
    const setupFn = jest.fn().mockResolvedValue(func);
    const teardownFn = jest.fn().mockResolvedValue(undefined);

    await Container.getInstance([
      transient('testService', setupFn, teardownFn),
    ]);

    await Container.instance.resolve(async (testService) => { 
      await testService(); 
    });

    expect(func).toHaveBeenCalledTimes(1);
    expect(setupFn).toHaveBeenCalledTimes(1);
    expect(teardownFn).toHaveBeenCalledTimes(1);
  });

  test('Container should be able to teardown transient services after use', async () => {
    const methodSpy = jest.fn().mockResolvedValue({});
    const teardownSpy = jest.fn().mockResolvedValue({});

    class TestClass {
      public tornDown = false;

      async method() {
        if (this.tornDown) throw new Error('Transient service was not torn down');
        await methodSpy();
        return this.tornDown;
      }

      async teardown() {
        teardownSpy();
        this.tornDown = true;
      }
    }

    await Container.getInstance([
      transient('testClass', TestClass, TestClass.prototype.teardown),
    ]);

    let tornDown;
    await Container.instance.resolve(async (testClass: TestClass) => { 
      tornDown = await testClass.method(); 
    });

    expect(tornDown).toBe(false);
    expect(methodSpy).toHaveBeenCalledTimes(1);
    expect(teardownSpy).toHaveBeenCalledTimes(1);
  });

  test('Container should be able to teardown multiple transient services after use', async () => {
    
    const methodSpy = jest.fn().mockResolvedValue({});
    const teardownSpy = jest.fn().mockResolvedValue({});
    class TestClass {
      async method() { await methodSpy(); }
      async teardown() { teardownSpy(); }
    }

    const otherMethodSpy = jest.fn().mockResolvedValue({});
    const otherTeardownSpy = jest.fn().mockResolvedValue({});
    class OtherTestClass {
      async method() { await otherMethodSpy(); }
      async teardown() { otherTeardownSpy(); }
    }

    await Container.getInstance([
      transient('testClass', TestClass, TestClass.prototype.teardown),
      transient('otherTestClass', OtherTestClass, OtherTestClass.prototype.teardown),
    ]);

    await Container.instance.resolve(async (testClass: TestClass, otherTestClass: OtherTestClass) => { 
      await testClass.method(); 
      await otherTestClass.method(); 
    });

    expect(methodSpy).toHaveBeenCalledTimes(1);
    expect(teardownSpy).toHaveBeenCalledTimes(1);
    expect(otherMethodSpy).toHaveBeenCalledTimes(1);
    expect(otherTeardownSpy).toHaveBeenCalledTimes(1);
  });

  test('Container should be able to inject dependencies through multiple levels of depths', async () => {
    const dependencySpy = jest.fn().mockResolvedValue({});
    const deepDependencySpy = jest.fn().mockResolvedValue({});
    const deeperDependencySpy = jest.fn().mockResolvedValue({});

    const dependencyFn = async (deepDependency) => async () => {
      await deepDependency();
      dependencySpy();
    }

    const deepDependencyFn = async (deeperDependency) => async () => {
      await deeperDependency();
      deepDependencySpy();
    }

    const deeperDependencyFn = async () => async () => {
      deeperDependencySpy();
    }

    await Container.getInstance([
      transient('dependency', dependencyFn),
      transient('deepDependency', deepDependencyFn),
      transient('deeperDependency', deeperDependencyFn),
    ]);

    await Container.instance.resolve(async (dependency) => {
      await dependency();
    });

    expect(dependencySpy).toHaveBeenCalledTimes(1);
    expect(deepDependencySpy).toHaveBeenCalledTimes(1);
    expect(deeperDependencySpy).toHaveBeenCalledTimes(1);
  });


  test('Container should be able to inject dependencies without async', async () => {
    const dependencySpy = jest.fn().mockResolvedValue({});
    const deepDependencySpy = jest.fn().mockResolvedValue({});
    const deeperDependencySpy = jest.fn().mockResolvedValue({});

    const dependencyFn = (deepDependency) => () => {
      deepDependency();
      dependencySpy();
    }

    const deepDependencyFn = (deeperDependency) => () => {
      deeperDependency();
      deepDependencySpy();
    }

    const deeperDependencyFn = () => () => {
      deeperDependencySpy();
    }

    Container.getInstance([
      transient('dependency', dependencyFn),
      transient('deepDependency', deepDependencyFn),
      transient('deeperDependency', deeperDependencyFn),
    ]);

    await Container.instance.resolve((dependency) => {
      dependency();
    });

    expect(dependencySpy).toHaveBeenCalledTimes(1);
    expect(deepDependencySpy).toHaveBeenCalledTimes(1);
    expect(deeperDependencySpy).toHaveBeenCalledTimes(1);
  });
});