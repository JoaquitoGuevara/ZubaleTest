import {TaskRecord} from '../../domain/taskModels';
import {getCurrentIsoTimestamp} from '../../shared/timeHelpers';

export type FakeServerSyncResult =
  | {
      resultType: 'success';
      serverTaskRecord: TaskRecord;
    }
  | {
      resultType: 'conflict';
      serverTaskRecord: TaskRecord;
      reason: string;
    }
  | {
      resultType: 'network_error';
      reason: string;
    };

let fakeServerIsAvailable = true;
let forceConflictForNextSyncRequest = false;
const fakeServerTaskStore = new Map<string, TaskRecord>();

function cloneTaskRecord(taskRecord: TaskRecord): TaskRecord {
  return JSON.parse(JSON.stringify(taskRecord)) as TaskRecord;
}

export function setFakeServerAvailability(availability: boolean): void {
  fakeServerIsAvailable = availability;
}

export function setForceConflictForNextSyncRequest(shouldForceConflict: boolean): void {
  forceConflictForNextSyncRequest = shouldForceConflict;
}

export function getForceConflictForNextSyncRequestFlag(): boolean {
  return forceConflictForNextSyncRequest;
}

export function clearForceConflictForNextSyncRequestFlag(): void {
  forceConflictForNextSyncRequest = false;
}

export async function applyTaskUpsertToFakeServer(
  localTaskRecord: TaskRecord,
  deviceIsOnline: boolean,
): Promise<FakeServerSyncResult> {
  if (!deviceIsOnline) {
    return {
      resultType: 'network_error',
      reason: 'Device is offline according to network monitor.',
    };
  }

  if (!fakeServerIsAvailable) {
    return {
      resultType: 'network_error',
      reason: 'Fake server is set to unavailable by debug panel.',
    };
  }

  const existingServerTaskRecord = fakeServerTaskStore.get(localTaskRecord.id);
  const now = getCurrentIsoTimestamp();

  if (forceConflictForNextSyncRequest) {
    forceConflictForNextSyncRequest = false;

    const conflictServerTaskRecord: TaskRecord = {
      ...(existingServerTaskRecord
        ? cloneTaskRecord(existingServerTaskRecord)
        : cloneTaskRecord(localTaskRecord)),
      businessStatus: 'cancelled',
      syncStatus: 'synced',
      serverVersion: (existingServerTaskRecord?.serverVersion ?? localTaskRecord.serverVersion) + 1,
      updatedAt: now,
      lastSyncedAt: now,
    };

    fakeServerTaskStore.set(localTaskRecord.id, conflictServerTaskRecord);

    return {
      resultType: 'conflict',
      serverTaskRecord: conflictServerTaskRecord,
      reason: 'Forced conflict requested from debug panel.',
    };
  }

  if (existingServerTaskRecord?.businessStatus === 'cancelled' && localTaskRecord.businessStatus === 'done') {
    return {
      resultType: 'conflict',
      serverTaskRecord: cloneTaskRecord(existingServerTaskRecord),
      reason: 'Server task is already cancelled while local task is marked done.',
    };
  }

  const acceptedServerTaskRecord: TaskRecord = {
    ...cloneTaskRecord(localTaskRecord),
    syncStatus: 'synced',
    serverVersion: (existingServerTaskRecord?.serverVersion ?? localTaskRecord.serverVersion) + 1,
    updatedAt: now,
    lastSyncedAt: now,
  };

  fakeServerTaskStore.set(localTaskRecord.id, acceptedServerTaskRecord);

  return {
    resultType: 'success',
    serverTaskRecord: acceptedServerTaskRecord,
  };
}
