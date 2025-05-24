import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities.js';
import { TASK_QUEUE_NAME } from './shared.js';
import { createRequire } from 'node:module';

run().catch((err) => console.log(err));

async function run() {
  const connection = await NativeConnection.connect({
    address: 'localhost:7233'
    // In production, pass options to configure TLS and other settings.
  });
  try {
    const require = createRequire(import.meta.url);
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows'),
      activities,
      taskQueue: TASK_QUEUE_NAME
    });
    await worker.run();
  } finally {
    connection.close();
  }
}
