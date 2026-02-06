import {TaskRecord} from '../../domain/taskModels';
import {getCurrentIsoTimestamp} from '../../shared/timeHelpers';

const taskTitleOptions = [
  'Audit Coca-Cola Shelf',
  'Audit Snacks Aisle',
  'Verify Dairy Prices',
  'Check Beverage Promotions',
  'Review Frozen Foods Display',
  'Validate Pharmacy Endcap',
  'Inspect Personal Care Section',
  'Count Seasonal Inventory',
  'Capture Checkout Display',
  'Verify Cleaning Products Placement',
];

const storeOptions = [
  'Walmart Buenavista',
  'Walmart Reforma',
  'Walmart Coyoacan',
  'Walmart Polanco',
  'Walmart Santa Fe',
  'Walmart Tezontle',
];

function createExpiresAtIso(daysAhead: number): string {
  const now = new Date();
  const expiryDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return expiryDate.toISOString();
}

export function createInitialTaskRecords(): TaskRecord[] {
  const initialTasks: TaskRecord[] = [];
  const baseLatitude = 19.4326;
  const baseLongitude = -99.1332;

  for (let index = 0; index < 40; index += 1) {
    const taskTitle = taskTitleOptions[index % taskTitleOptions.length];
    const storeName = storeOptions[index % storeOptions.length];
    const priceAmount = 40 + (index % 7) * 5;
    const latitude = baseLatitude + (index % 8) * 0.0021;
    const longitude = baseLongitude - (index % 8) * 0.0019;

    initialTasks.push({
      id: `seed_task_${String(index + 1).padStart(3, '0')}`,
      title: taskTitle,
      price: priceAmount,
      businessStatus: 'available',
      syncStatus: 'synced',
      location: {
        latitude,
        longitude,
        address: storeName,
      },
      imageUri: null,
      expiresAt: createExpiresAtIso(15 + (index % 10)),
      notes: '',
      serverVersion: 1,
      updatedAt: getCurrentIsoTimestamp(),
      lastSyncedAt: getCurrentIsoTimestamp(),
    });
  }

  return initialTasks;
}
