import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/auth-context';
import { fetchClientAppointments } from '@/lib/api/calendar';
import {
  Client,
  ClientNote,
  addClientNote,
  fetchClient,
  fetchClientNotes,
  updateClient,
} from '@/lib/api/clients';
import { getInitialsFromLabel } from '@/lib/text';

import { appointmentToEvent } from '../(tabs)/calendar/calendar-data';
import { getListHeaderLabel, toDateKey } from '../(tabs)/calendar/date-utils';
import { EventItem } from '../(tabs)/calendar/types';

export default function ClientDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();

  const [client, setClient] = React.useState<Client | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [notes, setNotes] = React.useState<ClientNote[]>([]);
  const [newNote, setNewNote] = React.useState('');
  const [addingNote, setAddingNote] = React.useState(false);

  const [history, setHistory] = React.useState<EventItem[]>([]);

  const [isEditing, setIsEditing] = React.useState(false);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const [clientData, notesData, appointmentsData] = await Promise.all([
        fetchClient(id),
        fetchClientNotes(id, companyId),
        fetchClientAppointments(id, companyId),
      ]);
      setClient(clientData);
      setNotes(notesData);
      setHistory(appointmentsData.map(appointmentToEvent));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('client.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const startEditing = () => {
    setFirstName(client?.first_name ?? '');
    setLastName(client?.last_name ?? '');
    setEmail(client?.email ?? '');
    setPhone(client?.phone ?? '');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateClient(id, { firstName, lastName, email, phone });
      await load();
      setIsEditing(false);
    } catch {
      setError(t('client.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    const trimmed = newNote.trim();
    if (!trimmed || !id || !companyId) return;
    setAddingNote(true);
    try {
      await addClientNote(id, companyId, trimmed);
      setNewNote('');
      const notesData = await fetchClientNotes(id, companyId);
      setNotes(notesData);
    } catch {
      setError(t('client.failedToAddNote'));
    } finally {
      setAddingNote(false);
    }
  };

  const name = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || client.email || '' : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name || t('client.title')}
        </Text>
        {isEditing ? (
          <Pressable onPress={handleSaveProfile} disabled={saving} hitSlop={8}>
            {saving ? (
              <ActivityIndicator size="small" color="#1b1b1b" />
            ) : (
              <Text style={styles.saveText}>{t('client.save')}</Text>
            )}
          </Pressable>
        ) : (
          <Pressable onPress={startEditing} hitSlop={8}>
            <Text style={styles.saveText}>{t('client.edit')}</Text>
          </Pressable>
        )}
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitialsFromLabel(name)}</Text>
            </View>

            {isEditing ? (
              <View style={{ width: '100%' }}>
                <TextInput
                  style={styles.input}
                  placeholder={t('client.firstName')}
                  placeholderTextColor="#9a9a9a"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('client.lastName')}
                  placeholderTextColor="#9a9a9a"
                  value={lastName}
                  onChangeText={setLastName}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('client.email')}
                  placeholderTextColor="#9a9a9a"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('client.phone')}
                  placeholderTextColor="#9a9a9a"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            ) : (
              <>
                {client?.email ? <Text style={styles.profileLine}>{client.email}</Text> : null}
                {client?.phone ? <Text style={styles.profileLine}>{client.phone}</Text> : null}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('client.notes')}</Text>
            <View style={styles.addNoteRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={t('client.addNotePlaceholder')}
                placeholderTextColor="#9a9a9a"
                value={newNote}
                onChangeText={setNewNote}
              />
              <Pressable style={styles.addNoteButton} onPress={handleAddNote} disabled={addingNote}>
                {addingNote ? (
                  <ActivityIndicator size="small" color="#1b1b1b" />
                ) : (
                  <Text style={styles.addNoteButtonText}>{t('client.addNote')}</Text>
                )}
              </Pressable>
            </View>
            {notes.length === 0 ? (
              <Text style={styles.emptyText}>{t('client.noNotes')}</Text>
            ) : (
              notes.map((note) => (
                <View key={note.id} style={styles.noteRow}>
                  <Text style={styles.noteText}>{note.note}</Text>
                  <Text style={styles.noteDate}>{getListHeaderLabel(toDateKey(new Date(note.created_at)))}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('client.history')}</Text>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>{t('client.noHistory')}</Text>
            ) : (
              history.map((event) => (
                <View key={event.appointmentId} style={styles.historyRow}>
                  <View style={[styles.historyColorBar, { backgroundColor: event.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{event.label}</Text>
                    <Text style={styles.historySubtitle}>
                      {`${getListHeaderLabel(toDateKey(new Date(event.startISO)))} · ${event.startTime}–${event.endTime} · ${event.staffName}`}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#20b87b',
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
    gap: 24,
  },
  profileSection: {
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#d8cfc6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4a4a4a',
  },
  profileLine: {
    fontSize: 14,
    color: '#8b8b8b',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b8b8b',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e7e7e7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1b1b1b',
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
    borderColor: '#1b1b1b',
  },
  addNoteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  emptyText: {
    fontSize: 14,
    color: '#8b8b8b',
  },
  noteRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noteText: {
    fontSize: 14,
    color: '#1b1b1b',
  },
  noteDate: {
    fontSize: 12,
    color: '#9a9a9a',
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyColorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  historySubtitle: {
    fontSize: 12,
    color: '#8b8b8b',
    marginTop: 2,
  },
});
