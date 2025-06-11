import {
  Worker,
  NativeConnection,
  NativeConnectionOptions,
  DefaultLogger,
  LogEntry
} from '@temporalio/worker';
// Assuming activities.ts exports shipmentLifecycleActivities for the ShipmentLifecycleWorkflow
import { activities } from './activities.js';
// Assuming workflows.ts exports ShipmentLifecycleWorkflow
import { ShipmentWorkflow } from './workflows.js';
import { TASK_QUEUE_NAME } from './interfaces.js';

interface ShipmentWorkerConfig {
  temporalAddress?: string;
  namespace?: string;
  taskQueue?: string;
  maxConcurrentWorkflowTaskPolls?: number;
  maxConcurrentActivityPolls?: number;
  // Add other configurations if needed, e.g., for TLS
}

/**
 * Runs a Temporal worker for the Shipment system.
 * This corresponds to the `RunWorker` function in Go.
 */
export async function runShipmentWorker(config?: ShipmentWorkerConfig): Promise<void> {
  const temporalAddress =
    config?.temporalAddress || process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = config?.namespace || process.env.TEMPORAL_NAMESPACE || 'default';
  // TASK_QUEUE_NAME from interfaces.ts is 'shipment-task-queue'
  // The Go code uses 'shipments' (from its api.go).
  // We'll use the one from interfaces.ts for consistency within the TS codebase.
  // If 'shipments' is strictly required, update TASK_QUEUE_NAME in interfaces.ts or override here.
  const taskQueue = config?.taskQueue || TASK_QUEUE_NAME;

  // The Go Activities struct received ShipmentURL.
  // The TypeScript updateShipmentStatusHttpActivity uses process.env.SHIPMENT_SERVICE_URL directly.
  // Ensure SHIPMENT_SERVICE_URL environment variable is set for the activity to function correctly.

  const connectionOptions: NativeConnectionOptions = {
    address: temporalAddress
    // tls: If you need to configure TLS, do it here
    // e.g. tls: fs.readFileSync(process.env.TEMPORAL_TLS_CERT_PATH) ...
  };

  // Example of a custom logger to match default Go SDK verbosity
  const logger = new DefaultLogger('INFO', (entry: LogEntry) => {
    // eslint-disable-next-line no-console
    console.log(`[${entry.level}]`, entry.message, entry.meta ? JSON.stringify(entry.meta) : '');
  });

  const connection = await NativeConnection.connect(connectionOptions);

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: './workflows.js', // Path to the workflows file
    activities: activities, // Register the activities for this workflow
    // Match Go worker options:
    maxConcurrentWorkflowTaskPolls: config?.maxConcurrentWorkflowTaskPolls ?? 8,
    maxConcurrentActivityTaskPolls: config?.maxConcurrentActivityPolls ?? 8 // Note: TS SDK uses 'ActivityPollers'
  });

  console.log(
    `Shipment Worker starting. Task Queue: "${taskQueue}", Namespace: "${namespace}", Address: "${temporalAddress}"`
  );
  await worker.run();
  console.log('Shipment Worker shut down gracefully.');
  await connection.close();
  console.log('Temporal connection closed.');
}

// If this file is run directly, start the worker.
if (require.main === module) {
  runShipmentWorker().catch((err) => {
    console.error('Shipment Worker encountered an error:', err);
    process.exit(1);
  });
}
