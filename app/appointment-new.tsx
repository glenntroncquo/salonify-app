import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  Platform,
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
import { createAppointment } from '@/lib/api/appointment-create';
import { fetchStaff, StaffMember } from '@/lib/api/calendar';
import { ClientSearchResult, searchClients } from '@/lib/api/clients';
import { fetchTreatments, PriceOption, TreatmentWithOptions } from '@/lib/api/treatments';
import { getInitialsFromLabel } from '@/lib/text';
import { COLOR_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';

import { getMonthShortLabel, toFakeUtcISOString } from './(tabs)/calendar/date-utils';

type CartItem = {
  treatmentId: string;
  priceOptionId: string;
  treatmentName: string;
  color: string | null;
  priceOptionName: string;
  price: number;
  durationMinutes: number;
};

function formatDateForInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeForInput(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function mergeDatePart(base: Date, picked: Date) {
  const next = new Date(base);
  next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return next;
}

function mergeTimePart(base: Date, picked: Date) {
  const next = new Date(base);
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}

function defaultStartDate(dateParam?: string) {
  const base = dateParam ? new Date(dateParam) : new Date();
  const now = new Date();
  let hours = now.getHours();
  let minutes = Math.ceil(now.getMinutes() / 30) * 30;
  if (minutes >= 60) {
    minutes = 0;
    hours += 1;
  }
  base.setHours(hours, minutes, 0, 0);
  return base;
}

export default function NewAppointmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { companyId } = useAuth();

  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = React.useState(true);
  const [staffId, setStaffId] = React.useState<string | null>(null);

  const [treatmentsList, setTreatmentsList] = React.useState<TreatmentWithOptions[]>([]);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [treatmentPickerVisible, setTreatmentPickerVisible] = React.useState(false);
  const [treatmentPickerSelected, setTreatmentPickerSelected] = React.useState<TreatmentWithOptions | null>(null);

  const [clientSearchTerm, setClientSearchTerm] = React.useState('');
  const [clientResults, setClientResults] = React.useState<ClientSearchResult[]>([]);
  const [clientSearching, setClientSearching] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientSearchResult | null>(null);
  const [showNewClientForm, setShowNewClientForm] = React.useState(false);
  const [newFirstName, setNewFirstName] = React.useState('');
  const [newLastName, setNewLastName] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');

  const [startDate, setStartDate] = React.useState<Date>(() => defaultStartDate(params.date));
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!companyId) return;
    setStaffLoading(true);
    fetchStaff(companyId)
      .then(setStaffList)
      .catch(() => setStaffList([]))
      .finally(() => setStaffLoading(false));

    fetchTreatments(companyId)
      .then(setTreatmentsList)
      .catch(() => setTreatmentsList([]));
  }, [companyId]);

  React.useEffect(
    () => () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    },
    []
  );

  const handleClientSearchChange = React.useCallback((text: string) => {
    setClientSearchTerm(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (text.trim().length < 2) {
      setClientResults([]);
      setClientSearching(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setClientSearching(true);
      try {
        const results = await searchClients(text);
        setClientResults(results);
      } catch {
        setClientResults([]);
      } finally {
        setClientSearching(false);
      }
    }, 350);
  }, []);

  const handleAddTreatment = React.useCallback((treatment: TreatmentWithOptions, option: PriceOption) => {
    setCart((prev) => [
      ...prev,
      {
        treatmentId: treatment.id,
        priceOptionId: option.id,
        treatmentName: treatment.name,
        color: treatment.color,
        priceOptionName: option.name,
        price: option.price,
        durationMinutes: option.duration_in_minutes,
      },
    ]);
    setTreatmentPickerVisible(false);
    setTreatmentPickerSelected(null);
  }, []);

  const closeTreatmentPicker = React.useCallback(() => {
    setTreatmentPickerVisible(false);
    setTreatmentPickerSelected(null);
  }, []);

  const totalMinutes = cart.reduce((sum, item) => sum + item.durationMinutes, 0);
  const endDate = React.useMemo(() => {
    const next = new Date(startDate);
    next.setMinutes(next.getMinutes() + totalMinutes);
    return next;
  }, [startDate, totalMinutes]);

  const emailValue = selectedClient?.email ?? newEmail.trim();
  const firstNameValue = selectedClient?.first_name ?? newFirstName.trim();
  const lastNameValue = selectedClient?.last_name ?? newLastName.trim();
  const hasClientIdentity = Boolean(selectedClient) || firstNameValue.length > 0;
  const canSave = Boolean(staffId) && cart.length > 0 && emailValue.length > 0 && hasClientIdentity && !submitting;

  const handleSave = React.useCallback(async () => {
    if (!companyId || !staffId || cart.length === 0 || !emailValue || !hasClientIdentity) {
      setErrorMessage(t('appointment.validationMissingFields'));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await createAppointment({
        start: toFakeUtcISOString(startDate, startDate.getHours(), startDate.getMinutes()),
        staffId,
        companyId,
        treatments: cart.map((item) => ({ treatmentId: item.treatmentId, priceOptionId: item.priceOptionId })),
        firstName: firstNameValue,
        lastName: lastNameValue,
        email: emailValue,
        notes: notes.trim(),
      });
      DeviceEventEmitter.emit('calendarRefreshAppointments');
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('duplicate') || message.includes('conflict')) {
        setErrorMessage(t('appointment.errorConflict'));
      } else if (message.includes('available')) {
        setErrorMessage(t('appointment.errorNotAvailable'));
      } else if (message.includes('foreign key') || message.includes('constraint')) {
        setErrorMessage(t('appointment.errorInvalidSelection'));
      } else {
        setErrorMessage(t('appointment.errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    companyId,
    staffId,
    cart,
    emailValue,
    hasClientIdentity,
    firstNameValue,
    lastNameValue,
    notes,
    startDate,
    router,
    t,
  ]);

  const renderDatePill = () => {
    if (Platform.OS === 'web') {
      return (
        <input
          type="date"
          value={formatDateForInput(startDate)}
          onChange={(event) => {
            const [y, m, d] = event.target.value.split('-').map(Number);
            if (y && m && d) {
              setStartDate((prev) => {
                const next = new Date(prev);
                next.setFullYear(y, m - 1, d);
                return next;
              });
            }
          }}
          style={webInputStyle}
        />
      );
    }
    return (
      <Pressable style={styles.pill} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.pillText}>
          {`${startDate.getDate()} ${getMonthShortLabel(startDate.getMonth())} ${startDate.getFullYear()}`}
        </Text>
      </Pressable>
    );
  };

  const renderTimePill = () => {
    if (Platform.OS === 'web') {
      return (
        <input
          type="time"
          value={formatTimeForInput(startDate)}
          onChange={(event) => {
            const [h, m] = event.target.value.split(':').map(Number);
            if (!Number.isNaN(h) && !Number.isNaN(m)) {
              setStartDate((prev) => {
                const next = new Date(prev);
                next.setHours(h, m, 0, 0);
                return next;
              });
            }
          }}
          style={webInputStyle}
        />
      );
    }
    return (
      <Pressable style={styles.pill} onPress={() => setShowTimePicker(true)}>
        <Text style={styles.pillText}>{formatTimeForInput(startDate)}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="close" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('appointment.title')}</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
          {submitting ? (
            <ActivityIndicator size="small" color="#1b1b1b" />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>{t('appointment.save')}</Text>
          )}
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('appointment.client')}</Text>
          {selectedClient ? (
            <View style={styles.selectedClientRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedClientName}>
                  {`${selectedClient.first_name ?? ''} ${selectedClient.last_name ?? ''}`.trim() || selectedClient.email}
                </Text>
                <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
              </View>
              <Pressable onPress={() => setSelectedClient(null)}>
                <Text style={styles.changeLink}>{t('appointment.change')}</Text>
              </Pressable>
            </View>
          ) : showNewClientForm ? (
            <View>
              <TextInput
                style={styles.input}
                placeholder={t('appointment.firstName')}
                placeholderTextColor="#9a9a9a"
                value={newFirstName}
                onChangeText={setNewFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('appointment.lastName')}
                placeholderTextColor="#9a9a9a"
                value={newLastName}
                onChangeText={setNewLastName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('appointment.email')}
                placeholderTextColor="#9a9a9a"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowNewClientForm(false)}>
                <Text style={styles.changeLink}>{t('appointment.searchClientPlaceholder')}</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.input}
                placeholder={t('appointment.searchClientPlaceholder')}
                placeholderTextColor="#9a9a9a"
                value={clientSearchTerm}
                onChangeText={handleClientSearchChange}
              />
              {clientSearching ? (
                <ActivityIndicator style={{ marginTop: 8 }} color="#8b8b8b" />
              ) : clientSearchTerm.trim().length >= 2 && clientResults.length === 0 ? (
                <Text style={styles.noResultsText}>{t('appointment.noResults')}</Text>
              ) : (
                clientResults.map((result) => (
                  <Pressable
                    key={result.id}
                    style={styles.clientResultRow}
                    onPress={() => {
                      setSelectedClient(result);
                      setClientResults([]);
                      setClientSearchTerm('');
                    }}>
                    <Text style={styles.pickerRowText}>
                      {`${result.first_name ?? ''} ${result.last_name ?? ''}`.trim() || result.email}
                    </Text>
                    <Text style={styles.selectedClientEmail}>{result.email}</Text>
                  </Pressable>
                ))
              )}
              <Pressable onPress={() => setShowNewClientForm(true)} style={{ marginTop: 8 }}>
                <Text style={styles.changeLink}>{t('appointment.addNewClient')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Staff */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('appointment.staffMember')}</Text>
          {staffLoading ? (
            <ActivityIndicator color="#8b8b8b" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffRow}>
              {staffList.map((staff) => {
                const name = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || t('calendar.employee');
                const isSelected = staffId === staff.id;
                return (
                  <Pressable
                    key={staff.id}
                    style={[styles.staffChip, isSelected && styles.staffChipActive]}
                    onPress={() => setStaffId(staff.id)}>
                    <View style={styles.staffAvatar}>
                      <Text style={styles.staffAvatarText}>{getInitialsFromLabel(name)}</Text>
                    </View>
                    <Text style={[styles.staffChipText, isSelected && styles.staffChipTextActive]}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Treatments */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('appointment.treatments')}</Text>
          {cart.length === 0 ? (
            <Text style={styles.noResultsText}>{t('appointment.noTreatmentsAdded')}</Text>
          ) : (
            cart.map((item, index) => (
              <View key={`${item.treatmentId}-${item.priceOptionId}-${index}`} style={styles.cartRow}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(item.color, item.treatmentName)] },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerRowText}>{item.treatmentName}</Text>
                  <Text style={styles.selectedClientEmail}>
                    {`${item.priceOptionName} · ${item.durationMinutes} ${t('appointment.minutesShort')} · €${item.price}`}
                  </Text>
                </View>
                <Pressable onPress={() => setCart((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                  <MaterialIcons name="close" size={20} color="#8b8b8b" />
                </Pressable>
              </View>
            ))
          )}
          <Pressable style={{ marginTop: 8 }} onPress={() => setTreatmentPickerVisible(true)}>
            <Text style={styles.changeLink}>{t('appointment.addTreatment')}</Text>
          </Pressable>
        </View>

        {/* Date & time */}
        <View style={styles.section}>
          <View style={styles.dateRow}>
            <Text style={styles.sectionLabel}>{t('appointment.starts')}</Text>
            <View style={styles.dateRowPills}>
              {renderDatePill()}
              {renderTimePill()}
            </View>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.sectionLabel}>{t('appointment.ends')}</Text>
            <Text style={styles.computedEndText}>{formatTimeForInput(endDate)}</Text>
          </View>
          <Text style={styles.endsHint}>{t('appointment.endsComputedHint')}</Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('appointment.notes')}</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder={t('appointment.notesPlaceholder')}
            placeholderTextColor="#9a9a9a"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>
      </ScrollView>

      {Platform.OS === 'android' && showDatePicker ? (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selected) setStartDate((prev) => mergeDatePart(prev, selected));
          }}
        />
      ) : null}

      {Platform.OS === 'android' && showTimePicker ? (
        <DateTimePicker
          value={startDate}
          mode="time"
          display="default"
          onChange={(event, selected) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selected) setStartDate((prev) => mergeTimePart(prev, selected));
          }}
        />
      ) : null}

      {Platform.OS === 'ios' && (showDatePicker || showTimePicker) ? (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => {
            setShowDatePicker(false);
            setShowTimePicker(false);
          }}>
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => {
              setShowDatePicker(false);
              setShowTimePicker(false);
            }}>
            <Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
              <View style={styles.pickerDoneRow}>
                <Pressable
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}>
                  <Text style={styles.pickerDoneText}>{t('appointment.done')}</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={startDate}
                mode={showDatePicker ? 'date' : 'time'}
                display="spinner"
                onChange={(_, selected) => {
                  if (!selected) return;
                  setStartDate((prev) => (showDatePicker ? mergeDatePart(prev, selected) : mergeTimePart(prev, selected)));
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      <Modal transparent animationType="slide" visible={treatmentPickerVisible} onRequestClose={closeTreatmentPicker}>
        <Pressable style={styles.pickerOverlay} onPress={closeTreatmentPicker}>
          <Pressable style={styles.treatmentSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            {treatmentPickerSelected ? (
              <>
                <View style={styles.sheetHeaderRow}>
                  <Pressable onPress={() => setTreatmentPickerSelected(null)} hitSlop={8}>
                    <MaterialIcons name="arrow-back" size={20} color="#1b1b1b" />
                  </Pressable>
                  <Text style={styles.sheetTitle}>{treatmentPickerSelected.name}</Text>
                </View>
                <ScrollView>
                  {treatmentPickerSelected.price_option.map((option) => (
                    <Pressable
                      key={option.id}
                      style={styles.pickerRow}
                      onPress={() => handleAddTreatment(treatmentPickerSelected, option)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerRowText}>{option.name}</Text>
                        <Text style={styles.selectedClientEmail}>
                          {`${option.duration_in_minutes} ${t('appointment.minutesShort')} · €${option.price}`}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>{t('appointment.selectTreatment')}</Text>
                <ScrollView>
                  {treatmentsList.map((treatment) => (
                    <Pressable
                      key={treatment.id}
                      style={styles.pickerRow}
                      onPress={() => setTreatmentPickerSelected(treatment)}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(treatment.color, treatment.name)] },
                        ]}
                      />
                      <Text style={styles.pickerRowText}>{treatment.name}</Text>
                      <MaterialIcons name="chevron-right" size={20} color="#8b8b8b" />
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const webInputStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#1b1b1b',
  padding: '8px 12px',
  borderRadius: 18,
  border: '1px solid #e7e7e7',
  backgroundColor: '#ffffff',
};

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
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#20b87b',
  },
  saveTextDisabled: {
    color: '#c6c6c6',
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noResultsText: {
    fontSize: 14,
    color: '#8b8b8b',
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20b87b',
  },
  selectedClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e7e7e7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  selectedClientEmail: {
    fontSize: 13,
    color: '#8b8b8b',
    marginTop: 2,
  },
  clientResultRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerRowText: {
    fontSize: 15,
    color: '#1b1b1b',
    fontWeight: '500',
  },
  staffRow: {
    gap: 10,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    backgroundColor: '#ffffff',
  },
  staffChipActive: {
    backgroundColor: '#1b1b1b',
    borderColor: '#1b1b1b',
  },
  staffAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e7e7e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4a4a4a',
  },
  staffChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  staffChipTextActive: {
    color: '#ffffff',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateRowPills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e7e7e7',
    backgroundColor: '#ffffff',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  computedEndText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b8b8b',
  },
  endsHint: {
    fontSize: 12,
    color: '#9a9a9a',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
  },
  pickerDoneRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#20b87b',
  },
  treatmentSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1b',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});
