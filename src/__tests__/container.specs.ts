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

  test('Container should be able to initiate transient services', async () => {
    const setupFn = jest.fn().mockResolvedValue({});
    const teardownFn = jest.fn().mockResolvedValue(undefined);

    await Container.getInstance([
      transient('testService', setupFn, teardownFn),
    ]);

    const service = await Container.instance.getService('testService');

    expect(setupFn).toHaveBeenCalledTimes(1);
  });
});