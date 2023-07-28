export interface ILogger {
  log(message: string): void;
}

export interface IDatabase {
  query(sql: string, params: any[]): Promise<any[]>;
}

export type DeeperFn = (count: number) => Promise<any>;