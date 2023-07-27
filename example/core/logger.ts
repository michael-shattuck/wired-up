import { ILogger } from '../domain/interfaces';

export async function createLogger(): Promise<ILogger> {
  return {
    log: (message: string) => {
      console.log(message);
    }
  }
}