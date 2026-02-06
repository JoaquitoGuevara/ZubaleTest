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
import {Task, TaskPatch, TaskStatus} from '../../domain/taskModels';
import {syncStatusLabel, taskStatusLabel} from '../../shared/taskPresentation';
import {formatDateTime} from '../../shared/timeHelpers';

interface TaskDetailsScreenProps {
  task: Task;
  hasConflict: boolean;
  onBack: () => void;
  onSave: (taskId: string, patch: TaskPatch) => Promise<void>;
  onAcceptConflict: (taskId: string) => Promise<void>;
  onRetryConflict: (taskId: string) => Promise<void>;
}

const statusOptions: TaskStatus[] = ['available', 'in_progress', 'done', 'cancelled'];

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permissionResult = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera permission required',
      message: 'The app needs camera access to capture task evidence.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
      buttonNeutral: 'Later',
    },
  );

  return permissionResult === PermissionsAndroid.RESULTS.GRANTED;
}

export function TaskDetailsScreen({
  task,
  hasConflict,
  onBack,
  onSave,
  onAcceptConflict,
  onRetryConflict,
}: TaskDetailsScreenProps): React.JSX.Element {
  const [draftStatus, setDraftStatus] = useState<TaskStatus>(task.businessStatus);
  const [draftNotes, setDraftNotes] = useState(task.notes);
  const [draftImageUri, setDraftImageUri] = useState<string | null>(task.imageUri);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftStatus(task.businessStatus);
    setDraftNotes(task.notes);
    setDraftImageUri(task.imageUri);
    setCameraError(null);
  }, [task]);

  const hasUnsavedChanges = useMemo(() => {
    return (
      draftStatus !== task.businessStatus ||
      draftNotes !== task.notes ||
      draftImageUri !== task.imageUri
    );
  }, [draftImageUri, draftNotes, draftStatus, task]);

  const capturePhoto = async () => {
    setCameraError(null);

    const permissionGranted = await requestCameraPermission();

    if (!permissionGranted) {
      setCameraError('Camera permission was not granted.');
      return;
    }

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.6,
      saveToPhotos: false,
      includeBase64: false,
    });

    if (result.errorMessage) {
      setCameraError(result.errorMessage);
      return;
    }

    const uri = result.assets?.[0]?.uri ?? null;

    if (!uri) {
      setCameraError('Camera did not return an image file.');
      return;
    }

    setDraftImageUri(uri);
  };

  const saveChanges = async () => {
    if (!hasUnsavedChanges || saving) {
      return;
    }

    setSaving(true);

    try {
      await onSave(task.id, {
        businessStatus: draftStatus,
        notes: draftNotes,
        imageUri: draftImageUri,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Pressable
        style={({pressed}) => [styles.backButton, pressed ? styles.pressedBlackBackground : null]}
        onPress={onBack}>
        <Text style={styles.backButtonLabel}>Back to task list</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.metaLine}>Store: {task.location.address}</Text>
        <Text style={styles.metaLine}>Price: ${task.price.toFixed(2)}</Text>
        <Text style={styles.metaLine}>Expires: {formatDateTime(task.expiresAt)}</Text>
        <Text style={styles.metaLine}>Sync: {syncStatusLabel(task.syncStatus)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Task status</Text>
        <View style={styles.statusButtonsContainer}>
          {statusOptions.map(status => {
            const selected = status === draftStatus;

            return (
              <Pressable
                key={status}
                onPress={() => setDraftStatus(status)}
                style={({pressed}) => [
                  styles.statusButton,
                  selected ? styles.statusButtonSelected : styles.statusButtonUnselected,
                  pressed ? styles.pressedBlackBackground : null,
                ]}>
                <Text
                  style={[
                    styles.statusButtonLabel,
                    selected ? styles.statusButtonLabelSelected : styles.statusButtonLabelUnselected,
                  ]}>
                  {taskStatusLabel(status)}
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

        <Pressable
          style={({pressed}) => [
            styles.photoActionButton,
            pressed ? styles.pressedBlackBackground : null,
          ]}
          onPress={capturePhoto}>
          <Text style={styles.photoActionButtonLabel}>Capture photo</Text>
        </Pressable>

        {cameraError ? <Text style={styles.errorText}>{cameraError}</Text> : null}

        {draftImageUri ? (
          <Image source={{uri: draftImageUri}} style={styles.photoPreview} />
        ) : (
          <Text style={styles.metaLine}>Current image: None</Text>
        )}
      </View>

      {hasConflict ? (
        <View style={styles.conflictCard}>
          <Text style={styles.conflictTitle}>Conflict detected</Text>
          <Text style={styles.conflictDescription}>
            Server and local task states disagree. Choose the preferred resolution.
          </Text>

          <View style={styles.conflictActionsRow}>
            <Pressable
              style={({pressed}) => [
                styles.acceptServerButton,
                pressed ? styles.pressedBlackBackground : null,
              ]}
              onPress={() => onAcceptConflict(task.id)}>
              <Text style={styles.acceptServerButtonLabel}>Accept server</Text>
            </Pressable>

            <Pressable
              style={({pressed}) => [
                styles.retryLocalButton,
                pressed ? styles.pressedBlackBackground : null,
              ]}
              onPress={() => onRetryConflict(task.id)}>
              <Text style={styles.retryLocalButtonLabel}>Retry local</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Pressable
        style={({pressed}) => [
          styles.saveButton,
          !hasUnsavedChanges || saving ? styles.saveButtonDisabled : null,
          pressed && hasUnsavedChanges && !saving ? styles.pressedBlackBackground : null,
        ]}
        disabled={!hasUnsavedChanges || saving}
        onPress={saveChanges}>
        <Text style={styles.saveButtonLabel}>
          {saving ? 'Saving...' : 'Save and queue sync'}
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
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
  pressedBlackBackground: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
});
