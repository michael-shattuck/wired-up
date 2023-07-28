import { IDatabase, ILogger } from '../domain/interfaces';

export const excellentFunction = (deeperFunction: DeeperFn) => () => {
  console.log('Excellent function called');
  console.log(deeperFunction)
  deeperFunction(1);
}

export type DeeperFn = (count: number) => Promise<any>;

export const deeperFunction = async (logger: ILogger, db: IDatabase): Promise<DeeperFn> => async (count: number) => {
  console.log('Deeper function called: ' + count)
  logger.log('Logger called');
  db.query('SELECT * FROM foo', []);
}
