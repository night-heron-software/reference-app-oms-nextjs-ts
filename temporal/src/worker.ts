import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities.js';
import { TASK_QUEUE_NAME } from './shared.js';
// createRequire is used to resolve the path to the workflows directory
// require is not available in ES modules, so we use createRequire from 'node:module'
// Why are we using ES modules?
// This is because the project iœs set up to use ES modules with Node.js,
// which allows for better compatibility with modern JavaScript features and
// cleaner import syntax.
import { createRequire } from 'node:module';

run().catch((err) => console.log(err));

async function run() {
  console.log(`CWD: ${process.cwd()}`);
  console.log(`env: ${JSON.stringify(process.env, null, 2)}`);
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
