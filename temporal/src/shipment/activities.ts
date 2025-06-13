import { v4 as uuidv4 } from 'uuid';
import { ApplicationFailure } from '@temporalio/common';
import {
  Shipment,
  CreateShipmentParams,
  ShipmentStatusUpdatedSignal,
  ShipmentStatus
} from './interfaces.js';

// --- Placeholder Database Client ---
// Replace this with your actual database client implementation.
// This interface defines the methods your activities will expect.
interface DbClient {
  createShipmentInDB(shipmentData: Shipment): Promise<Shipment>;
  updateShipmentStatusInDB(
    shipmentId: string,
    status: ShipmentStatus,
    updatedAt: Date
  ): Promise<Shipment>;
  // Potentially: getShipmentById(shipmentId: string): Promise<Shipment | null>;
}

// Example placeholder dbClient.
// In a real application, this would be properly instantiated and injected.
const dbClient: DbClient = {
  async createShipmentInDB(shipmentToCreate) {
    console.log('SIMULATE DB: Inserting shipment', shipmentToCreate);
    // Simulate DB insert and return the full shipment object as it would be in the DB
    return { ...shipmentToCreate };
  },
  async updateShipmentStatusInDB(
    shipmentId: string,
    status: ShipmentStatus,
    updatedAt: Date
  ): Promise<Shipment> {
    console.log(`SIMULATE DB: Updating shipment ${shipmentId} to status ${status}`);
    // Simulate DB update: fetch existing, update, save.
    // This is highly simplified. You'd fetch the actual shipment.
    const mockExistingShipment: Shipment = {
      id: shipmentId,
      orderId: 'mock-order-id', // This would come from the fetched record
      productId: 'mock-product-id', // This would come from the fetched record
      quantity: 1, // This would come from the fetched record
      status: 'pending', // Old status
      createdAt: new Date(Date.now() - 100000), // This would come from the fetched record
      updatedAt: new Date(Date.now() - 100000) // This would come from the fetched record
    };
    return {
      ...mockExistingShipment,
      status,
      updatedAt
    };
  }
};
// --- End Placeholder Database Client ---

export async function createShipmentActivity(params: CreateShipmentParams): Promise<Shipment> {
  console.log(`CreateShipmentActivity invoked with params: ${JSON.stringify(params)}`);

  const shipmentId = uuidv4(); // Corresponds to Go's uuid.NewString()
  const now = new Date();

  const newShipmentData = {
    id: shipmentId,
    orderId: params.orderId,
    productId: params.productId,
    quantity: params.quantity,
    status: 'PENDING' as ShipmentStatus, // Initial status
    createdAt: now,
    updatedAt: now
  };

  try {
    const createdShipment = await dbClient.createShipmentInDB(newShipmentData);
    console.log(`Shipment created with ID: ${createdShipment.id}`);
    return createdShipment;
  } catch (error) {
    console.error('Error creating shipment in DB:', error);
    throw ApplicationFailure.create({
      message: `Failed to create shipment: ${error instanceof Error ? error.message : String(error)}`,
      type: 'CreateShipmentError', // Used for non-retryable policy
      nonRetryable: true
    });
  }
}

export async function updateShipmentStatusActivity(
  params: ShipmentStatusUpdatedSignal
): Promise<Shipment> {
  console.log(`UpdateShipmentStatusActivity invoked with params: ${JSON.stringify(params)}`);
  const now = new Date();

  try {
    const updatedShipment = await dbClient.updateShipmentStatusInDB(
      params.shipmentId,
      params.status,
      now
    );
    if (!updatedShipment) {
      // This case might not be hit if dbClient.updateShipmentStatusInDB throws for not found
      throw new Error(`Shipment with ID ${params.shipmentId} not found for update.`);
    }
    console.log(`Shipment ${params.shipmentId} status updated to ${params.status}`);
    return updatedShipment;
  } catch (error) {
    console.error(`Error updating shipment status for ID ${params.shipmentId} in DB:`, error);
    throw ApplicationFailure.create({
      message: `Failed to update shipment status for ID ${params.shipmentId}: ${error instanceof Error ? error.message : String(error)}`,
      type: 'UpdateShipmentStatusError', // Used for non-retryable policy
      nonRetryable: true
    });
  }
}

// It's common to export activities as an object for easy registration with the Worker.
export const activities = {
  createShipmentActivity,
  updateShipmentStatusActivity
};
