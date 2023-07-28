# Wired-up
## Painless dependency injection for TypeScript

Tired of endless boilerplate code for wiring up dependencies in TypeScript? Wired-up provides a clean, simple API for injecting services using constructor and parameter injection powered by TypeScript metadata reflection.

## Installation
```cli
npm i wired-up
yarn add wired-up
pnpm i wired-up
```

## Usage

```typescript
await Container.startScope(async () => {
  const injectedFn = await Container.instance.resolve(excellentFunction);
  await injectedFn();
});
```

## Example

Let's start with setting up an abstract representation of the services we'll need.

```typescript
export interface ILogger {
  log(message: string): void;
}

export interface IDatabase {
  query(sql: string, params: any[]): Promise<any[]>;
}
```

Next, let's create the concrete implementations. For the logger, let's assume we need to call an outer function to retrieve the instance. 
```typescript
export async function createLogger(): Promise<ILogger> {
  return {
    log: (message: string) => {
      console.log(message);
    }
  }
}

```
The database is a bit different, it's safe to assume we'll need to setup and teardown. 
```typescript
export async function createConnection(): Promise<IDatabase> {
  // Instantiate the db/connection.
  return await db.connect();
}

export async function closeConnection(connection: any) {
  console.log('Closing connection');
}
```

Now let's assume we have a function that requires both the logger and the database.
```typescript
export const deeperFunction = async (logger: ILogger, db: IDatabase): Promise<DeeperFn> => async (count: number) => {
  logger.log(`Logger called with count: ${count}`);
  db.query('SELECT * FROM foo', []);
}

```

Let's also say we have an outer level function that doesn't know/care about the logger or database, but needs to call the `deeperFunction` we just defined.
```typescript
export const excellentFunction = (deeperFunction: DeeperFn) => () => {
  deeperFunction(1);
}
```

Finally, let's set up out context.
```typescript
import * as db from './core/db';
import * as logger from './core/logger';
import { deeperFunction } from './core/deeper';

await Container.getInstance([
  singleton('db', db.createConnection, db.closeConnection),
  scoped('logger', logger.createLogger),
  transient('deeperFunction', deeperFunction),
]);
```

We can then resolve the dependencies and run the outer function without needing to worry about a significant amout of additional boiler plate.
```typescript
await Container.startScope(async () => {
  const injectedFn = await Container.instance.resolve(excellentFunction);
  await injectedFn();
});
```

## Contributions
We welcome contributions! Please read the [contribution guidelines][contributing] to get started.

Let me know if you would like me to modify or expand this example repository description in any way!

[contributing]: https://github.com/michael-shattuck/wired-up/blob/main/Contributions.md