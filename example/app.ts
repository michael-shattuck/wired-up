import * as db from './core/db';
import * as logger from './core/logger';
import { Container, singleton, transient, scoped } from '../src';
import { deeperFunction, excellentFunction } from './core/child';

async function run() {
  await Container.getInstance([
    singleton('db', db.createConnection, db.closeConnection),
    scoped('logger', logger.createLogger),
    transient('deeperFunction', deeperFunction),
  ]);

  await Container.startScope(async () => {
    const childFn = await Container.instance.resolve(excellentFunction);
    await childFn();
  });
}

run()
  .then(() => {
    console.log('App initialized');
  })
  .catch((error) => {
    console.error('App failed to initialize', error);
  }
);