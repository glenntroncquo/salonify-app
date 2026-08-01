import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/date-time-field';
import { useAuth } from '@/contexts/auth-context';
import {
  UnavailabilityBlock,
  createUnavailability,
  deleteUnavailability,
  fetchUnavailability,
} from '@/lib/api/staff';

function formatDateLabel(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeLabel(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function defaultDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function defaultStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function defaultEnd() {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
}

export default function StaffTimeOffScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();

  const [blocks, setBlocks] = React.useState<UnavailabilityBlock[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [modalVisible, setModalVisible] = React.useState(false);
  const [date, setDate] = React.useState(defaultDate);
  const [startTime, setStartTime] = React.useState(defaultStart);
  const [endTime, setEndTime] = React.useState(defaultEnd);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchUnavailability(id, companyId);
      setBlocks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.failedToLoadTimeOff'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setDate(defaultDate());
    setStartTime(defaultStart());
    setEndTime(defaultEnd());
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!id || !companyId) return;
    setSaving(true);
    try {
      await createUnavailability(
        id,
        companyId,
        date,
        startTime.getHours(),
        startTime.getMinutes(),
        endTime.getHours(),
        endTime.getMinutes()
      );
      setModalVisible(false);
      await load();
    } catch {
      setError(t('staff.failedToSaveTimeOff'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (blockId: string) => {
    try {
      await deleteUnavailability(blockId);
      setBlocks((prev) => prev.filter((item) => item.id !== blockId));
    } catch {
      setError(t('staff.failedToDeleteTimeOff'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('staff.timeOff')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#1b1b1b" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {blocks.length === 0 ? (
            <Text style={styles.emptyText}>{t('staff.noTimeOff')}</Text>
          ) : (
            blocks.map((block) => {
              const start = block.start ? new Date(block.start) : null;
              const end = block.end ? new Date(block.end) : null;
              return (
                <View key={block.id} style={styles.blockRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.blockDate}>{start ? formatDateLabel(start) : '—'}</Text>
                    <Text style={styles.blockTime}>
                      {start && end ? `${formatTimeLabel(start)} – ${formatTimeLabel(end)}` : '—'}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDelete(block.id)} hitSlop={8}>
                    <MaterialIcons name="close" size={20} color="#8b8b8b" />
                  </Pressable>
                </View>
              );
            })
          )}
          <Pressable style={{ marginTop: 12 }} onPress={openAdd}>
            <Text style={styles.addLink}>{t('staff.addTimeOff')}</Text>
          </Pressable>
        </ScrollView>
      )}

      <Modal transparent animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('staff.addTimeOff')}</Text>

            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>{t('staff.date')}</Text>
              <DateTimeField value={date} mode="date" doneLabel={t('appointment.done')} formatLabel={formatDateLabel} onChange={setDate} />
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>{t('appointment.starts')}</Text>
              <DateTimeField value={startTime} mode="time" doneLabel={t('appointment.done')} formatLabel={formatTimeLabel} onChange={setStartTime} />
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>{t('appointment.ends')}</Text>
              <DateTimeField value={endTime} mode="time" doneLabel={t('appointment.done')} formatLabel={formatTimeLabel} onChange={setEndTime} />
            </View>

            <Pressable style={styles.modalSaveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSaveButtonText}>{t('client.save')}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFE4E6',
  },
  errorBannerText: {
    color: '#881337',
    fontSize: 13,
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#8b8b8b',
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  blockDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  blockTime: {
    fontSize: 13,
    color: '#8b8b8b',
    marginTop: 2,
  },
  addLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20b87b',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  modalSaveButton: {
    backgroundColor: '#1b1b1b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
