// Disable import first to allow dotenv configuration to happen before any imports
/* eslint-disable import/first */
import * as dotenv from 'dotenv';
dotenv.config();

import { knex, Knex } from 'knex';
import {
  DB_CONNECTION,
  TEST_DATABASE,
  TEST_USER,
  TEST_USER_PASSWORD,
} from '../../../knexfile';
import { readdir, readFile } from 'fs/promises';
import { redisClient } from '../auth/redis';
import { log } from './log';

const MYSQL_ROOT_PASSWORD = process.env.MYSQL_ROOT_PASSWORD;

// Store the current test database name for this test suite
let currentTestDatabase: string = TEST_DATABASE ?? 'test_db';
// Store a knex instance specific to this test suite
let testKnexInstance: Knex | null = null;

/**
 * Generate a unique database name for this test suite
 */
const generateTestDatabaseName = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${TEST_DATABASE ?? 'test_db'}_${timestamp}_${random}`;
};

/**
 * Get the knex instance for the current test suite
 */
export const getTestKnex = (): Knex => {
  if (!testKnexInstance) {
    throw new Error('Test database not initialized. Call createTestDatabase first.');
  }
  return testKnexInstance;
};

/**
 * Get the current test database name
 */
export const getCurrentTestDatabase = (): string => {
  return currentTestDatabase;
};

/**
 * We can't read tables to the database in random order,
 * since they might have foreign keys that are depended on each other.
 * This array provides an order in which the tables are read to the database.
 */
const TABLE_READ_ORDER = [
  'user',
  'diving_cylinder',
  'diving_cylinder_set',
  'diving_cylinder_to_set',
  'compressor',
  'fill_event',
  'gas',
  'gas_price',
  'storage_cylinder',
  'fill_event_gas_fill',
  'payment_event',
  'fill_event_payment_event',
];

const deriveReadOrder = (tableNames: string[]): string[] => {
  const unknownTableNames = tableNames.filter(
    (tableName) => !TABLE_READ_ORDER.includes(tableName),
  );
  if (unknownTableNames.length > 0) {
    throw new Error(
      'Unknown table names met! Please add them to TABLE_READ_ORDER!',
    );
  }

  const tableNamesSet = new Set(tableNames);
  return TABLE_READ_ORDER.filter((tableName) => tableNamesSet.has(tableName));
};

/**
 * Reads test data folder contents to the test database.
 * @param testDataFolderName
 * @returns Promise<void>
 */
const readTestDataFolderToDatabase = async (
  testDataFolderName: string,
): Promise<void> => {
  const testKnex = getTestKnex();
  const tableNames = (
    await readdir(`./src/test_data/${testDataFolderName}`)
  ).map((file) => file.slice(undefined, -4));

  // Ignore empty folders
  if (tableNames.length === 0) return;

  const tableNamesInOrder = deriveReadOrder(tableNames);

  for (const tableName of tableNamesInOrder) {
    const content = (
      await readFile(
        `./src/test_data/${testDataFolderName}/${tableName}.csv`,
        'utf8',
      )
    ).split('\n');

    // Delete default gas_price entries so that we can insert test data
    if (tableName === 'gas_price') {
      await testKnex('gas_price').del();
    }

    // Ignore empty or files without columns.
    // There will always be at least one entry to the array
    if (content.length < 2 || content[0] === '') return;

    const columns = content[0].split(';');

    // Remove columns from the data
    content.shift();

    const insertPayloads = content
      // Filter empty lines (e.g. in the end of file)
      .filter((row) => row !== '')
      .map((row) => {
        const values = row.split(';');
        const keyValuePairs = new Map();
        for (let i = 0; i < columns.length; i++) {
          if (columns[i] !== '' && values[i] !== '')
            keyValuePairs.set(columns[i], values[i]);
        }

        return Object.fromEntries(keyValuePairs);
      });

    await testKnex(tableName).insert(insertPayloads);
  }
};

const runMigrations = async (): Promise<void> => {
  const testKnex = getTestKnex();
  await testKnex.migrate.latest();
};

/**
 * Creates test database and runs migrations
 * @param testDataFolder If provided, reads the .csv files from the folder
 * and inserts values to the database
 */
export const createTestDatabase = async (
  testDataFolder?: string,
): Promise<void> => {
  // Generate a unique database name for this test suite
  currentTestDatabase = generateTestDatabaseName();
  
  const adminKnex = knex({
    client: 'mysql',
    connection: {
      ...DB_CONNECTION,
      user: 'root',
      password: MYSQL_ROOT_PASSWORD,
    },
  });

  // Drop database if it exists to ensure clean state
  await adminKnex.raw(`DROP DATABASE IF EXISTS ??;`, [currentTestDatabase]);
  await adminKnex.raw(`CREATE DATABASE ??;`, [currentTestDatabase]);
  await adminKnex.raw(`GRANT ALL PRIVILEGES ON ??.* TO ?@'%' IDENTIFIED BY ?`, [
    currentTestDatabase,
    TEST_USER,
    TEST_USER_PASSWORD,
  ]);
  await adminKnex.destroy();

  // Create a new knex instance for this test suite
  testKnexInstance = knex({
    client: 'mysql',
    connection: {
      ...DB_CONNECTION,
      database: currentTestDatabase,
      user: TEST_USER,
      password: TEST_USER_PASSWORD,
    },
    migrations: {
      directory: './src/database/migrations',
    },
  });

  await runMigrations();

  if (testDataFolder !== undefined) {
    await readTestDataFolderToDatabase(testDataFolder);
  }
};

/**
 * Drops the test database. Should be ran in the afterAll -clause.
 */
export const dropTestDatabase = async (): Promise<void> => {
  // Destroy the test knex instance first
  if (testKnexInstance) {
    await testKnexInstance.destroy();
    testKnexInstance = null;
  }
  
  const adminKnex = knex({
    client: 'mysql',
    connection: {
      ...DB_CONNECTION,
      user: 'root',
      password: MYSQL_ROOT_PASSWORD,
    },
  });
  await adminKnex.raw(`DROP DATABASE IF EXISTS ??;`, [currentTestDatabase]);
  await adminKnex.destroy();
};

export const startRedisConnection = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    log.error('Error connecting redis!', error);
    process.exit(1);
  }
};

export const stopRedisConnection = async (): Promise<void> => {
  await redisClient.disconnect();
};
