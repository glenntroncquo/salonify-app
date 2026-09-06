import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { VisitPhaseBar } from '@/components/visit-phase-bar';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cancelAppointment } from '@/lib/api/appointment-cancel';
import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import { fetchAppointmentById, fetchClientAppointments, type AppointmentRow } from '@/lib/api/calendar';
import { addClientNote, Client, ClientNote, fetchClient, fetchClientNotes } from '@/lib/api/clients';
import { getInitialsFromLabel } from '@/lib/text';

import { appointmentToEvent, listVisitBlockHeight } from '../(tabs)/calendar/calendar-data';
import { getListHeaderLabel, toDateKey, toDateKeyFromSalonClock } from '../(tabs)/calendar/date-utils';
import { EventItem } from '../(tabs)/calendar/types';

export default function AppointmentDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const { locationId, loading: locationLoading } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [event, setEvent] = React.useState<EventItem | null>(null);
  const [appointment, setAppointment] = React.useState<AppointmentRow | null>(null);
  const [client, setClient] = React.useState<Client | null>(null);
  const [notes, setNotes] = React.useState<ClientNote[]>([]);
  const [newNote, setNewNote] = React.useState('');
  const [addingNote, setAddingNote] = React.useState(false);
  const [history, setHistory] = React.useState<EventItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cancelling, setCancelling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (locationLoading) return;
    setLoading(true);
    try {
      const appointment = await fetchAppointmentById(id);
      if (!appointment) {
        setError(t('client.failedToLoad'));
        return;
      }
      const nextEvent = appointmentToEvent(appointment);
      setAppointment(appointment);
      setEvent(nextEvent);

      const clientId = nextEvent.clientId;
      if (clientId && companyId) {
        const [clientData, notesData, appointmentsData] = await Promise.all([
          fetchClient(clientId),
          fetchClientNotes(clientId, companyId),
          locationId ? fetchClientAppointments(clientId, companyId, locationId) : Promise.resolve([]),
        ]);
        setClient(clientData);
        setNotes(notesData);
        setHistory(appointmentsData.map(appointmentToEvent).filter((item) => item.appointmentId !== nextEvent.appointmentId));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('client.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, locationId, locationLoading, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleAddNote = async () => {
    const trimmed = newNote.trim();
    const clientId = event?.clientId;
    if (!trimmed || !clientId || !companyId) return;
    setAddingNote(true);
    try {
      await addClientNote(clientId, companyId, trimmed);
      setNewNote('');
      const notesData = await fetchClientNotes(clientId, companyId);
      setNotes(notesData);
    } catch {
      setError(t('client.failedToAddNote'));
    } finally {
      setAddingNote(false);
    }
  };

  const handleCancel = () => {
    const clientId = event?.clientId ?? appointment?.client_id;
    const company = appointment?.company_id ?? companyId;
    const shopId = appointment?.location_id ?? locationId;
    if (!event || !clientId || !company) {
      setError(t('appointment.cancelFailed'));
      return;
    }

    Alert.alert(t('appointment.cancelConfirmTitle'), t('appointment.cancelConfirmMessage'), [
      { text: t('appointment.cancel'), style: 'cancel' },
      {
        text: t('appointment.cancelConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelAppointment({
              appointmentId: event.appointmentId,
              clientId,
              companyId: company,
              locationId: shopId,
            });
            DeviceEventEmitter.emit('calendarRefreshAppointments');
            router.back();
          } catch (err) {
            setError(err instanceof Error ? err.message : t('appointment.cancelFailed'));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const canceled = event?.canceled || (appointment ? isAppointmentCanceled(appointment) : false);
  const clientDisplayName =
    client && (client.first_name || client.last_name)
      ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
      : (event?.clientName ?? '');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: event?.label ?? '',
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
          headerRight: () =>
            event && !canceled ? (
              <HeaderButton
                onPress={() => {
                  router.push({ pathname: '/checkout/[appointmentId]', params: { appointmentId: event.appointmentId } });
                }}
                hitSlop={8}>
                <AppIcon name="pointOfSale" size={22} color={theme.tint} />
              </HeaderButton>
            ) : null,
        }}
      />

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.muted} />
        </View>
      ) : !event ? (
        <View style={styles.stateContainer}>
          <Text style={{ color: theme.muted }}>{error ?? t('client.failedToLoad')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <View style={styles.appointmentRow}>
              <VisitPhaseBar
                phases={event.phases}
                color={event.color}
                bgColor={event.bgColor}
                height={listVisitBlockHeight(event)}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.appointmentTitle, { color: theme.text }]}>{event.label}</Text>
                <Text style={[styles.appointmentSubtitle, { color: theme.muted }]}>
                  {`${getListHeaderLabel(toDateKeyFromSalonClock(event.startISO))} · ${event.startTime}–${event.endTime}`}
                </Text>
                <Text style={[styles.appointmentSubtitle, { color: theme.muted }]}>{event.staffName}</Text>
                {canceled ? (
                  <Text style={[styles.canceledBadge, { color: theme.error }]}>{t('appointment.canceled')}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('client.title')}</Text>
            <Pressable
              style={styles.clientRow}
              onPress={() => {
                if (event.clientId) router.push({ pathname: '/client/[id]', params: { id: event.clientId } });
              }}>
              <View style={[styles.clientAvatar, { backgroundColor: theme.border }]}>
                <Text style={[styles.clientAvatarText, { color: theme.text }]}>{getInitialsFromLabel(clientDisplayName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.clientName, { color: theme.text }]}>{clientDisplayName}</Text>
                {client?.email ? <Text style={[styles.clientDetail, { color: theme.muted }]}>{client.email}</Text> : null}
                {client?.phone ? <Text style={[styles.clientDetail, { color: theme.muted }]}>{client.phone}</Text> : null}
              </View>
              {event.clientId ? <AppIcon name="chevronRight" size={20} color={theme.muted} /> : null}
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('client.notes')}</Text>
            <View style={styles.addNoteRow}>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, flex: 1, marginBottom: 0 }]}
                placeholder={t('client.addNotePlaceholder')}
                placeholderTextColor={theme.muted}
                value={newNote}
                onChangeText={setNewNote}
              />
              <Pressable style={[styles.addNoteButton, { borderColor: theme.border }]} onPress={handleAddNote} disabled={addingNote}>
                {addingNote ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Text style={[styles.addNoteButtonText, { color: theme.text }]}>{t('client.addNote')}</Text>
                )}
              </Pressable>
            </View>
            {notes.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>{t('client.noNotes')}</Text>
            ) : (
              notes.map((note) => (
                <View key={note.id} style={[styles.noteRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.noteText, { color: theme.text }]}>{note.note}</Text>
                  <Text style={[styles.noteDate, { color: theme.muted }]}>
                    {getListHeaderLabel(toDateKey(new Date(note.created_at)))}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('client.history')}</Text>
            {history.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>{t('client.noHistory')}</Text>
            ) : (
              history.map((historyEvent) => (
                <View key={historyEvent.id} style={[styles.historyRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.historyColorBar, { backgroundColor: historyEvent.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyTitle, { color: theme.text }]}>{historyEvent.label}</Text>
                    <Text style={[styles.historySubtitle, { color: theme.muted }]}>
                      {`${getListHeaderLabel(toDateKeyFromSalonClock(historyEvent.startISO))} · ${historyEvent.startTime}–${historyEvent.endTime}`}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {!canceled ? (
            <Pressable
              style={[styles.cancelButton, { borderColor: theme.error }]}
              onPress={handleCancel}
              disabled={cancelling}>
              {cancelling ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <Text style={[styles.cancelButtonText, { color: theme.error }]}>{t('appointment.cancelAppointment')}</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  appointmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
  },
  appointmentTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  appointmentSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  clientDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addNoteButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  addNoteButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
  },
  noteRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  noteText: {
    fontSize: 14,
  },
  noteDate: {
    fontSize: 12,
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyColorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  historySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  canceledBadge: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
