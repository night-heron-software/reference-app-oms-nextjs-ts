import * as wf from '@temporalio/workflow';
import { CancellationScope } from '@temporalio/workflow';
// Import activity types for proxyActivities, assuming activities are exported as an object
import type { activities as shipmentActivitiesType } from './activities.js';
import {
  CreateShipmentParams,
  Shipment,
  SHIPMENT_SHIPPED_SIGNAL_NAME,
  ShipmentStatusUpdatedSignal
} from './interfaces.js';
export const shipmentStatusSignal =
  wf.defineSignal<[ShipmentStatusUpdatedSignal]>('ShipmentStatusUpdated');

// Proxy activities for use in the workflow
const { createShipmentActivity, updateShipmentStatusActivity } = wf.proxyActivities<
  typeof shipmentActivitiesType
>({
  startToCloseTimeout: '1 minute', // Matches Go's StartToCloseTimeout
  retry: {
    // Based on Go's RetryPolicy: NonRetryableErrorTypes: []string{"ApplicationError"}
    // In TS SDK, ApplicationFailure is non-retryable by default.
    // Explicitly listing custom error types used in ApplicationFailure is also good.
    nonRetryableErrorTypes: [
      'CreateShipmentError',
      'UpdateShipmentStatusError',
      'ApplicationFailure'
    ]
    // You might want to configure other retry options (initialInterval, backoffCoefficient, etc.)
    // if the defaults are not suitable. The Go example didn't specify them.
  }
});

/**
 * Workflow to manage the lifecycle of a shipment.
 * Corresponds to ShipmentWorkflow in Go.
 */
export async function ShipmentWorkflow(params: CreateShipmentParams): Promise<Shipment> {
  const logger = wf.log;
  logger.info('ShipmentWorkflow started.', { orderId: params.orderId });

  let shipment: Shipment | undefined = undefined;

  try {
    shipment = await createShipmentActivity(params);
    logger.info('Shipment created successfully.', {
      shipmentId: shipment.id,
      orderId: params.orderId
    });

    let shippedSignalReceived = false;
    wf.setHandler(wf.defineSignal(SHIPMENT_SHIPPED_SIGNAL_NAME), () => {
      logger.info('ShipmentShippedSignal received.', { shipmentId: shipment!.id });
      shippedSignalReceived = true;
    });

    // Wait for the shipment shipped signal or a timeout (30 seconds in Go code)
    const shipmentProcessingTimeout = '30 seconds'; // Go: shipmentProcessingTimeout = 30 * time.Second
    logger.info(`Waiting for shipment shipped signal or timeout of ${shipmentProcessingTimeout}.`, {
      shipmentId: shipment.id
    });

    const signalOrTimeout = await wf.condition(
      () => shippedSignalReceived,
      shipmentProcessingTimeout
    );

    if (signalOrTimeout) {
      // Signal received before timeout
      logger.info('Shipment shipped signal processed. Updating status to shipped.', {
        shipmentId: shipment.id
      });
      shipment = await updateShipmentStatusActivity({
        shipmentId: shipment.id,
        status: 'shipped',
        updatedAt: new Date() // Assuming we want to update the timestamp to now
      });
      logger.info(`Shipment status updated to shipped.`, { shipmentId: shipment.id });
    } else {
      // Timeout occurred
      logger.warn('Shipment processing timed out. Updating status to timed_out.', {
        shipmentId: shipment.id
      });
      shipment = await updateShipmentStatusActivity({
        shipmentId: shipment.id,
        status: 'timed_out',
        updatedAt: new Date() // Assuming we want to update the timestamp to now
      });
      logger.warn(`Shipment status updated to timed_out.`, { shipmentId: shipment.id });
    }

    logger.info('ShipmentWorkflow completed successfully.', {
      shipmentId: shipment.id,
      finalStatus: shipment.status
    });
    return shipment;
  } catch (err) {
    // Handle cancellation
    if (wf.isCancellation(err)) {
      logger.info('ShipmentWorkflow was cancelled.', {
        shipmentId: shipment?.id,
        orderId: params.orderId
      });
      if (shipment) {
        // Only update status if shipment was actually created
        // Use a non-cancellable scope for cleanup activities
        await CancellationScope.nonCancellable(async () => {
          logger.info(
            'Attempting to update shipment status to cancelled due to workflow cancellation.',
            { shipmentId: shipment!.id }
          );
          try {
            shipment = await updateShipmentStatusActivity({
              shipmentId: shipment!.id,
              status: 'cancelled',
              updatedAt: new Date() // Assuming we want to update the timestamp to now
            });
            logger.info('Shipment status updated to cancelled.', { shipmentId: shipment!.id });
          } catch (cleanupErr) {
            logger.error(
              'Failed to update shipment status to cancelled during cancellation cleanup.',
              { shipmentId: shipment!.id, error: cleanupErr }
            );
            // Log and absorb, or rethrow if critical. The workflow will still be marked as cancelled.
          }
        });
      }
      // Rethrow the cancellation error to ensure the workflow is marked as Cancelled.
      throw err;
    }

    // Handle other errors
    logger.error('ShipmentWorkflow failed.', {
      shipmentId: shipment?.id,
      orderId: params.orderId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });

    // Rethrow the error to fail the workflow.
    throw err;
  }
}
