/**
 * TypeORM CLI DataSource — used by migration:run / migration:revert / migration:show.
 * Usage: node_modules/.bin/typeorm -d dist/database/data-source.js <command>
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database-config.factory';

export const AppDataSource = new DataSource(buildDataSourceOptions());
