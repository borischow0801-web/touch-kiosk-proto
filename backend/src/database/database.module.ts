import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database-config.factory';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        const host = process.env.DB_HOST;
        const user = process.env.DB_USER;
        const name = process.env.DB_NAME;
        if (!host || !user || !name) {
          Logger.error(
            'Database not configured: DB_HOST, DB_USER, DB_NAME are required. ' +
              'See backend/.env.example.',
            'DatabaseModule',
          );
        }
        return {
          ...buildDataSourceOptions(),
          retryAttempts: 1,
          retryDelay: 3000,
        } as TypeOrmModuleOptions;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
