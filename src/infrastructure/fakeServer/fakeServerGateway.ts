import {Task} from '../../domain/taskModels';
import {nowIso} from '../../shared/timeHelpers';

export type FakeServerSyncResult =
  | {
      resultType: 'success';
      serverTask: Task;
    }
  | {
      resultType: 'conflict';
      serverTask: Task;
      reason: string;
    }
  | {
      resultType: 'network_error';
      reason: string;
    };

let serverAvailable = true;
let shouldForceConflictNextSync = false;
const serverTasks = new Map<string, Task>();

function cloneTask(task: Task): Task {
  return JSON.parse(JSON.stringify(task)) as Task;
}

export function setFakeServerAvailability(availability: boolean): void {
  serverAvailable = availability;
}

export function setForceConflictNextSync(shouldForceConflict: boolean): void {
  shouldForceConflictNextSync = shouldForceConflict;
}

export function clearForceConflictNextSync(): void {
  shouldForceConflictNextSync = false;
}

export async function upsertTaskOnFakeServer(
  localTask: Task,
  online: boolean,
): Promise<FakeServerSyncResult> {
  if (!online) {
    return {
      resultType: 'network_error',
      reason: 'Device is offline according to network monitor.',
    };
  }

  if (!serverAvailable) {
    return {
      resultType: 'network_error',
      reason: 'Fake server is set to unavailable by debug panel.',
    };
  }

  const existingServerTask = serverTasks.get(localTask.id);
  const now = nowIso();

  if (shouldForceConflictNextSync) {
    shouldForceConflictNextSync = false;

    const conflictServerTask: Task = {
      ...(existingServerTask
        ? cloneTask(existingServerTask)
        : cloneTask(localTask)),
      businessStatus: 'cancelled',
      syncStatus: 'synced',
      serverVersion: (existingServerTask?.serverVersion ?? localTask.serverVersion) + 1,
      updatedAt: now,
      lastSyncedAt: now,
    };

    serverTasks.set(localTask.id, conflictServerTask);

    return {
      resultType: 'conflict',
      serverTask: conflictServerTask,
      reason: 'Forced conflict requested from debug panel.',
    };
  }

  if (existingServerTask?.businessStatus === 'cancelled' && localTask.businessStatus === 'done') {
    return {
      resultType: 'conflict',
      serverTask: cloneTask(existingServerTask),
      reason: 'Server task is already cancelled while local task is marked done.',
    };
  }

  const acceptedServerTask: Task = {
    ...cloneTask(localTask),
    syncStatus: 'synced',
    serverVersion: (existingServerTask?.serverVersion ?? localTask.serverVersion) + 1,
    updatedAt: now,
    lastSyncedAt: now,
  };

  serverTasks.set(localTask.id, acceptedServerTask);

  return {
    resultType: 'success',
    serverTask: acceptedServerTask,
  };
}
