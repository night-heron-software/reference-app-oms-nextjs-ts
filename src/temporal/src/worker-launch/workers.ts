import { NativeConnection } from '@temporalio/worker';
import startBillingWorker from '../billing/worker.js';
import startOrderWorker from '../order/worker.js';
import startShipmentWorker from '../shipment/worker.js';

async function run() {
  const connection = await NativeConnection.connect({
    address: 'localhost:7233'
    // In production, pass options to configure TLS and other settings.
  });
  try {
    const promises = [
      startOrderWorker(connection),
      startBillingWorker(connection),
      startShipmentWorker(connection)
    ];
    await Promise.all(promises);
  } finally {
    connection.close();
  }
}
