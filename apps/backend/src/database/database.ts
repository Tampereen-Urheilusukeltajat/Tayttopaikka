import config from '../../knexfile';
import knex, { type Knex } from 'knex';

export enum Env {
  development = 'development',
  production = 'production',
  test = 'test',
}

const ENV = (process.env.NODE_ENV as Env) ?? Env.development;

let _knexController: Knex = knex(config[ENV]);

// Create a proxy that properly forwards both property access and function calls
export const knexController = new Proxy(
  (...args: any[]) => _knexController(...args),
  {
    get: (_, prop) => {
      return _knexController[prop as keyof Knex];
    },
    apply: (_, thisArg, args) => {
      return _knexController(...args);
    },
  },
) as unknown as Knex;

/**
 * Override the knex instance. Used for testing with isolated databases.
 * @param knexInstance - The knex instance to use
 */
export const setKnexInstance = (knexInstance: Knex): void => {
  _knexController = knexInstance;
};

/**
 * Get the current knex instance
 */
export const getKnexInstance = (): Knex => {
  return _knexController;
};
