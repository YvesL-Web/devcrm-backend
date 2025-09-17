import { AppDataSource } from './config/data-source'
import { closeQueues, setupQueues } from './queues_workers/queues/setupQueues'

import './queues_workers/workers/email.worker'

async function main() {
  await AppDataSource.initialize()
  await setupQueues()
  console.info('Worker is up and running')
}

main().catch((err) => {
  console.error('Error occurred while starting worker:', err)
  process.exit(1)
})

process.on('SIGINT', async () => {
  console.info('Shutting down workers...')
  await closeQueues().catch((err) => console.error('Error occurred while closing queues:', err))
  await AppDataSource.destroy().catch((err) =>
    console.error('Error occurred while closing data source:', err)
  )
  process.exit(0)
})
process.on('SIGTERM', async () => {
  console.info('Shutting down workers...')
  await closeQueues().catch((err) => console.error('Error occurred while closing queues:', err))
  await AppDataSource.destroy().catch((err) =>
    console.error('Error occurred while closing data source:', err)
  )
  process.exit(0)
})
