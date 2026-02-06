import React, {useEffect, useMemo, useState} from 'react';
import {
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import {
  LocalTaskUpdateInput,
  TaskBusinessStatus,
  TaskRecord,
} from '../../domain/taskModels';
import {
  getTaskBusinessStatusLabel,
  getTaskSyncStatusLabel,
} from '../../shared/taskPresentation';

interface TaskDetailsScreenProps {
  taskRecord: TaskRecord;
  hasPendingConflict: boolean;
  onGoBack: () => void;
  onSaveTaskChanges: (taskId: string, localTaskUpdateInput: LocalTaskUpdateInput) => Promise<void>;
  onAcceptServerConflict: (taskId: string) => Promise<void>;
  onRetryLocalConflict: (taskId: string) => Promise<void>;
}

const editableBusinessStatuses: TaskBusinessStatus[] = [
  'available',
  'in_progress',
  'done',
  'cancelled',
];

async function requestCameraPermissionIfNeeded(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permissionRequestResult = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera permission required',
      message: 'The app needs camera access to capture task evidence.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
      buttonNeutral: 'Later',
    },
  );

  return permissionRequestResult === PermissionsAndroid.RESULTS.GRANTED;
}

export function TaskDetailsScreen({
  taskRecord,
  hasPendingConflict,
  onGoBack,
  onSaveTaskChanges,
  onAcceptServerConflict,
  onRetryLocalConflict,
}: TaskDetailsScreenProps): React.JSX.Element {
  const [draftBusinessStatus, setDraftBusinessStatus] = useState<TaskBusinessStatus>(
    taskRecord.businessStatus,
  );
  const [draftNotes, setDraftNotes] = useState(taskRecord.notes);
  const [draftImageUri, setDraftImageUri] = useState<string | null>(taskRecord.imageUri);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [savingInProgress, setSavingInProgress] = useState(false);

  useEffect(() => {
    setDraftBusinessStatus(taskRecord.businessStatus);
    setDraftNotes(taskRecord.notes);
    setDraftImageUri(taskRecord.imageUri);
    setCameraErrorMessage(null);
  }, [taskRecord]);

  const hasUnsavedChanges = useMemo(() => {
    return (
      draftBusinessStatus !== taskRecord.businessStatus ||
      draftNotes !== taskRecord.notes ||
      draftImageUri !== taskRecord.imageUri
    );
  }, [draftBusinessStatus, draftNotes, draftImageUri, taskRecord]);

  const handleCapturePhoto = async () => {
    setCameraErrorMessage(null);

    const permissionGranted = await requestCameraPermissionIfNeeded();

    if (!permissionGranted) {
      setCameraErrorMessage('Camera permission was not granted.');
      return;
    }

    const cameraResult = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.6,
      saveToPhotos: false,
      includeBase64: false,
    });

    if (cameraResult.errorMessage) {
      setCameraErrorMessage(cameraResult.errorMessage);
      return;
    }

    const capturedUri = cameraResult.assets?.[0]?.uri ?? null;

    if (!capturedUri) {
      setCameraErrorMessage('Camera did not return an image file.');
      return;
    }

    setDraftImageUri(capturedUri);
  };

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || savingInProgress) {
      return;
    }

    setSavingInProgress(true);

    try {
      await onSaveTaskChanges(taskRecord.id, {
        businessStatus: draftBusinessStatus,
        notes: draftNotes,
        imageUri: draftImageUri,
      });
    } finally {
      setSavingInProgress(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Pressable style={styles.backButton} onPress={onGoBack}>
        <Text style={styles.backButtonLabel}>Back to task list</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.title}>{taskRecord.title}</Text>
        <Text style={styles.metaLine}>Store: {taskRecord.location.address}</Text>
        <Text style={styles.metaLine}>Price: ${taskRecord.price.toFixed(2)}</Text>
        <Text style={styles.metaLine}>Sync: {getTaskSyncStatusLabel(taskRecord.syncStatus)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Task status</Text>
        <View style={styles.statusButtonsContainer}>
          {editableBusinessStatuses.map(statusOption => {
            const statusIsSelected = statusOption === draftBusinessStatus;

            return (
              <Pressable
                key={statusOption}
                onPress={() => setDraftBusinessStatus(statusOption)}
                style={[
                  styles.statusButton,
                  statusIsSelected ? styles.statusButtonSelected : styles.statusButtonUnselected,
                ]}>
                <Text
                  style={[
                    styles.statusButtonLabel,
                    statusIsSelected
                      ? styles.statusButtonLabelSelected
                      : styles.statusButtonLabelUnselected,
                  ]}>
                  {getTaskBusinessStatusLabel(statusOption)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          value={draftNotes}
          onChangeText={setDraftNotes}
          multiline
          placeholder="Write what happened during the audit"
          style={styles.notesInput}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Photo evidence</Text>

        <Pressable style={styles.photoActionButton} onPress={handleCapturePhoto}>
          <Text style={styles.photoActionButtonLabel}>Capture photo</Text>
        </Pressable>

        {cameraErrorMessage ? <Text style={styles.errorText}>{cameraErrorMessage}</Text> : null}

        {draftImageUri ? <Image source={{uri: draftImageUri}} style={styles.photoPreview} /> : null}
      </View>

      {hasPendingConflict ? (
        <View style={styles.conflictCard}>
          <Text style={styles.conflictTitle}>Conflict detected</Text>
          <Text style={styles.conflictDescription}>
            Server and local task states disagree. Choose the preferred resolution.
          </Text>

          <View style={styles.conflictActionsRow}>
            <Pressable
              style={styles.acceptServerButton}
              onPress={() => onAcceptServerConflict(taskRecord.id)}>
              <Text style={styles.acceptServerButtonLabel}>Accept server</Text>
            </Pressable>

            <Pressable
              style={styles.retryLocalButton}
              onPress={() => onRetryLocalConflict(taskRecord.id)}>
              <Text style={styles.retryLocalButtonLabel}>Retry local</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Pressable
        style={[
          styles.saveButton,
          !hasUnsavedChanges || savingInProgress ? styles.saveButtonDisabled : null,
        ]}
        disabled={!hasUnsavedChanges || savingInProgress}
        onPress={handleSaveChanges}>
        <Text style={styles.saveButtonLabel}>
          {savingInProgress ? 'Saving...' : 'Save and queue sync'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonLabel: {
    color: '#155EEF',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: '#DDE3EA',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  title: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  metaLine: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusButtonSelected: {
    backgroundColor: '#155EEF',
    borderColor: '#155EEF',
  },
  statusButtonUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  statusButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusButtonLabelSelected: {
    color: '#FFFFFF',
  },
  statusButtonLabelUnselected: {
    color: '#334155',
  },
  notesInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#0F172A',
  },
  photoActionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#155EEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoActionButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#8B1A1A',
    fontSize: 12,
    fontWeight: '600',
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  conflictCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  conflictTitle: {
    color: '#9F1239',
    fontSize: 15,
    fontWeight: '800',
  },
  conflictDescription: {
    color: '#881337',
    fontSize: 13,
    fontWeight: '500',
  },
  conflictActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptServerButton: {
    backgroundColor: '#9F1239',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptServerButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  retryLocalButton: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryLocalButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#0D652D',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  saveButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
