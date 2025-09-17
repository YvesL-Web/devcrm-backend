import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { env } from './env.js'

const isDev = process.env.NODE_ENV !== 'production'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  synchronize: false, // true dev-only
  logging: false,
  entities: [isDev ? 'src/entities/**/*.ts' : 'dist/entities/**/*.js'],
  migrations: [isDev ? 'src/migrations/**/*.ts' : 'dist/migrations/**/*.js'],
  extra: {
    max: 10,
    idleTimeoutMillis: 30000 // 30 seconds
  }
})
