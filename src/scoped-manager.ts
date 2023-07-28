import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage<any>();

export const RequestScope = {
  setScoped: (key: string, value: any) => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error('Attempt to set scoped value outside of scope');
    }

    if (store.hasOwnProperty(key) && store[key] !== value) {
      throw new Error(`Attempt to overwrite scoped value ${key}`);
    }

    store[key] = value;
  },

  getScoped: <T>(key: string): T => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error('Attempt to get scoped value outside of scope');
    }

    if (!store || !store.hasOwnProperty(key)) {
      throw new Error(`Attempt to get scoped value ${key} that does not exist`);
    }

    return store && store[key];
  },

  run: (fn: (...args: any[]) => any) => {
    asyncLocalStorage.run(new Map(), fn);
  },

  deleteKey: (key: string) => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error('Attempt to delete scoped value outside of scope');
    }

    if (!store || !store.hasOwnProperty(key)) {
      throw new Error(`Attempt to delete scoped value ${key} that does not exist`);
    }

    delete store[key];
  },
};
