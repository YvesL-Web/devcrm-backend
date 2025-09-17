import { createApp } from './app.js'
import { AppDataSource } from './config/data-source.js'
import { env } from './config/env.js'
import { closeRedis } from './config/Ioredis.js'

async function bootstrap() {
  await AppDataSource.initialize()
  console.log('📦 DataSource initialized')

  const app = createApp()
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server ready on http://localhost:${env.PORT}`)
  })

  const shutdown = async (signal: string) => {
    try {
      console.log(`\n${signal} received. Shutting down gracefully...`)
      server.close(async () => {
        if (AppDataSource.isInitialized) await AppDataSource.destroy()
        console.log('🛑 Server closed. DB pool destroyed.')
        await closeRedis()
        process.exit(0)
      })
      setTimeout(async () => {
        if (AppDataSource.isInitialized) await AppDataSource.destroy()
        process.exit(0)
      }, 5000).unref()
    } catch (e) {
      console.error('Error during shutdown', e)
      process.exit(1)
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

bootstrap().catch((e) => {
  console.error('Bootstrap failed', e)
  process.exit(1)
})
