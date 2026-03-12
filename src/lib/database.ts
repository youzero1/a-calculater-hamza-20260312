import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CalculationHistory } from './entities/CalculationHistory';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = process.env.DATABASE_PATH || './data/calculator.db';
const dbDir = path.dirname(path.resolve(dbPath));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: path.resolve(dbPath),
    synchronize: true,
    logging: false,
    entities: [CalculationHistory],
  });

  await dataSource.initialize();
  return dataSource;
}
