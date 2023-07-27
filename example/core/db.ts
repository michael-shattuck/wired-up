import { IDatabase } from '../domain/interfaces';

export async function createConnection(): Promise<IDatabase> {
  const database: IDatabase = {
    query: async (sql: string, params: any[]) => {
      console.log('Querying', sql, params);
      return [];
    }
  }

  return database;
}

export async function closeConnection(connection: any) {
  console.log('Closing connection');
}