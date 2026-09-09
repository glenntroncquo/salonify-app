import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createAppointment } from '@/lib/api/appointment-create';
import { fetchStaff, StaffMember } from '@/lib/api/calendar';
import { ClientSearchResult, searchClients } from '@/lib/api/clients';
import {
  fetchServices,
  phasesForEditor,
  ServiceVariant,
  ServiceWithVariants,
  spanDurationFromPhases,
  variantDurationMinutes,
} from '@/lib/api/services';
import { getInitialsFromLabel } from '@/lib/text';
import { COLOR_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';

import { getMonthShortLabel } from './(tabs)/calendar/date-utils';

type CartItem = {
  serviceId: string;
  serviceVariantId: string;
  serviceName: string;
  color: string | null;
  variantName: string;
  price: number;
  durationMinutes: number;
  staffId: string;
  phases: ServiceVariant['service_variant_phase'];
};

type Screen = 'form' | 'services' | 'serviceOptions';

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
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [screen, setScreen] = React.useState<Screen>('form');
  const [pickedService, setPickedService] = React.useState<ServiceWithVariants | null>(null);

  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = React.useState(true);
  const [staffId, setStaffId] = React.useState<string | null>(null);

  const [servicesList, setServicesList] = React.useState<ServiceWithVariants[]>([]);
  const [cart, setCart] = React.useState<CartItem[]>([]);

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
    if (!companyId || !locationId) return;
    setStaffLoading(true);
    fetchStaff(companyId, locationId)
      .then(setStaffList)
      .catch(() => setStaffList([]))
      .finally(() => setStaffLoading(false));

    fetchServices(companyId, locationId)
      .then(setServicesList)
      .catch(() => setServicesList([]));
  }, [companyId, locationId]);

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

  const handleAddService = React.useCallback(
    (service: ServiceWithVariants, variant: ServiceVariant) => {
      if (!staffId) {
        setErrorMessage(t('appointment.validationMissingFields'));
        setScreen('form');
        return;
      }
      Haptics.selectionAsync();
      const phases = phasesForEditor(variant);
      setCart((prev) => [
        ...prev,
        {
          serviceId: service.id,
          serviceVariantId: variant.id,
          serviceName: service.name,
          color: service.color,
          variantName: variant.name,
          price: variant.price,
          durationMinutes: spanDurationFromPhases(phases),
          staffId,
          phases,
        },
      ]);
      setScreen('form');
      setPickedService(null);
    },
    [staffId, t]
  );

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
  const canSave =
    cart.length > 0 &&
    cart.every((item) => Boolean(item.staffId)) &&
    emailValue.length > 0 &&
    hasClientIdentity &&
    !submitting;

  const handleSave = React.useCallback(async () => {
    if (!companyId || !locationId || cart.length === 0 || !emailValue || !hasClientIdentity || cart.some((item) => !item.staffId)) {
      setErrorMessage(t('appointment.validationMissingFields'));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const created = await createAppointment({
        start: startDate,
        companyId,
        locationId,
        clientId: selectedClient?.id,
        segments: cart.map((item) => ({
          serviceId: item.serviceId,
          serviceVariantId: item.serviceVariantId,
          staffId: item.staffId,
          price: item.price,
          phases: item.phases,
          durationMinutes: item.durationMinutes,
        })),
        firstName: firstNameValue,
        lastName: lastNameValue,
        email: emailValue,
        notes: notes.trim(),
      });
      DeviceEventEmitter.emit('calendarRefreshAppointments', { appointmentId: created.id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    locationId,
    cart,
    emailValue,
    hasClientIdentity,
    firstNameValue,
    lastNameValue,
    notes,
    startDate,
    selectedClient,
    router,
    t,
  ]);

  const webInputStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: theme.text,
    padding: '8px 12px',
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.surface,
  };

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
      <Pressable style={[styles.pill, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => setShowDatePicker(true)}>
        <Text style={[styles.pillText, { color: theme.text }]}>
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
      <Pressable style={[styles.pill, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => setShowTimePicker(true)}>
        <Text style={[styles.pillText, { color: theme.text }]}>{formatTimeForInput(startDate)}</Text>
      </Pressable>
    );
  };

  const screenOptions = (() => {
    if (screen === 'services') {
      return (
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('appointment.selectService'),
            headerLeft: () => (
              <HeaderButton onPress={() => setScreen('form')} hitSlop={8}>
                <AppIcon name="back" size={22} color={theme.text} />
              </HeaderButton>
            ),
          }}
        />
      );
    }
    if (screen === 'serviceOptions') {
      return (
        <Stack.Screen
          options={{
            headerShown: true,
            title: pickedService?.name ?? '',
            headerLeft: () => (
              <HeaderButton
                onPress={() => {
                  setPickedService(null);
                  setScreen('services');
                }}
                hitSlop={8}>
                <AppIcon name="back" size={22} color={theme.text} />
              </HeaderButton>
            ),
          }}
        />
      );
    }
    return (
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('appointment.title'),
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton onPress={handleSave} disabled={!canSave} hitSlop={8}>
              {submitting ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <Text style={[styles.saveText, { color: canSave ? theme.tint : theme.muted }]}>{t('appointment.save')}</Text>
              )}
            </HeaderButton>
          ),
        }}
      />
    );
  })();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      {screenOptions}

      {screen === 'form' && errorMessage ? (
        <View style={[styles.errorBanner, { backgroundColor: `${theme.error}22` }]}>
          <Text style={[styles.errorBannerText, { color: theme.error }]}>{errorMessage}</Text>
        </View>
      ) : null}

      {screen === 'services' ? (
        servicesList.length === 0 ? (
          <EmptyState
            icon="gridView"
            title={t('service.noServices')}
            subtitle={t('service.noServicesHint')}
            actionLabel={t('service.addNew')}
            onAction={() => router.push('/services/new')}
          />
        ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {servicesList.map((service) => (
            <Pressable
              key={service.id}
              style={[styles.pickerRow, { borderBottomColor: theme.border }]}
              onPress={() => {
                setPickedService(service);
                setScreen('serviceOptions');
              }}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(service.color, service.name)] },
                ]}
              />
              <Text style={[styles.pickerRowText, { color: theme.text }]}>{service.name}</Text>
              <AppIcon name="chevronRight" size={20} color={theme.muted} />
            </Pressable>
          ))}
        </ScrollView>
        )
      ) : screen === 'serviceOptions' && pickedService ? (
        pickedService.service_variant.length === 0 ? (
          <EmptyState
            icon="gridView"
            title={t('service.noVariants')}
            subtitle={t('service.noVariantsHint')}
          />
        ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {pickedService.service_variant.map((variant) => (
            <Pressable
              key={variant.id}
              style={[styles.pickerRow, { borderBottomColor: theme.border }]}
              onPress={() => handleAddService(pickedService, variant)}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerRowText, { color: theme.text }]}>{variant.name}</Text>
                <Text style={[styles.selectedClientEmail, { color: theme.muted }]}>
                  {`${variantDurationMinutes(variant)} ${t('appointment.minutesShort')} · €${variant.price}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Client */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('appointment.client')}</Text>
            {selectedClient ? (
              <View style={[styles.selectedClientRow, { borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedClientName, { color: theme.text }]}>
                    {`${selectedClient.first_name ?? ''} ${selectedClient.last_name ?? ''}`.trim() || selectedClient.email}
                  </Text>
                  <Text style={[styles.selectedClientEmail, { color: theme.muted }]}>{selectedClient.email}</Text>
                </View>
                <Pressable onPress={() => setSelectedClient(null)}>
                  <Text style={[styles.changeLink, { color: theme.tint }]}>{t('appointment.change')}</Text>
                </Pressable>
              </View>
            ) : showNewClientForm ? (
              <View>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder={t('appointment.firstName')}
                  placeholderTextColor={theme.muted}
                  value={newFirstName}
                  onChangeText={setNewFirstName}
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder={t('appointment.lastName')}
                  placeholderTextColor={theme.muted}
                  value={newLastName}
                  onChangeText={setNewLastName}
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder={t('appointment.email')}
                  placeholderTextColor={theme.muted}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowNewClientForm(false)}>
                  <Text style={[styles.changeLink, { color: theme.tint }]}>{t('appointment.searchClientPlaceholder')}</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder={t('appointment.searchClientPlaceholder')}
                  placeholderTextColor={theme.muted}
                  value={clientSearchTerm}
                  onChangeText={handleClientSearchChange}
                />
                {clientSearching ? (
                  <ActivityIndicator style={{ marginTop: 8 }} color={theme.muted} />
                ) : clientSearchTerm.trim().length >= 2 && clientResults.length === 0 ? (
                  <EmptyState
                    compact
                    icon="search"
                    title={t('appointment.noResults')}
                    subtitle={t('appointment.noResultsHint')}
                  />
                ) : (
                  clientResults.map((result) => (
                    <Pressable
                      key={result.id}
                      style={[styles.clientResultRow, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        setSelectedClient(result);
                        setClientResults([]);
                        setClientSearchTerm('');
                      }}>
                      <Text style={[styles.pickerRowText, { color: theme.text }]}>
                        {`${result.first_name ?? ''} ${result.last_name ?? ''}`.trim() || result.email}
                      </Text>
                      <Text style={[styles.selectedClientEmail, { color: theme.muted }]}>{result.email}</Text>
                    </Pressable>
                  ))
                )}
                <Pressable onPress={() => setShowNewClientForm(true)} style={{ marginTop: 8 }}>
                  <Text style={[styles.changeLink, { color: theme.tint }]}>{t('appointment.addNewClient')}</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Staff */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('appointment.defaultStaff')}</Text>
            {staffLoading ? (
              <ActivityIndicator color={theme.muted} />
            ) : staffList.length === 0 ? (
              <EmptyState
                compact
                icon="groups"
                title={t('staff.noStaff')}
                subtitle={t('staff.noStaffHint')}
              />
            ) : (
              <View style={styles.staffRow}>
                {staffList.map((staff) => {
                  const name = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || t('calendar.employee');
                  const isSelected = staffId === staff.id;
                  return (
                    <Pressable
                      key={staff.id}
                      style={[
                        styles.staffChip,
                        { borderColor: theme.border, backgroundColor: theme.surface },
                        isSelected && { backgroundColor: theme.tint, borderColor: theme.tint },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setStaffId(staff.id);
                      }}>
                      <View style={[styles.staffAvatar, { backgroundColor: theme.border }]}>
                        <Text style={[styles.staffAvatarText, { color: theme.text }]}>{getInitialsFromLabel(name)}</Text>
                      </View>
                      <Text style={[styles.staffChipText, { color: isSelected ? theme.onTint : theme.text }]}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Services */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('appointment.services')}</Text>
            {cart.length === 0 ? (
              <EmptyState
                compact
                title={t('appointment.noServicesAdded')}
                subtitle={t('appointment.noServicesAddedHint')}
              />
            ) : (
              cart.map((item, index) => (
                <View key={`${item.serviceId}-${item.serviceVariantId}-${index}`} style={[styles.cartRow, { borderBottomColor: theme.border }]}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(item.color, item.serviceName)] },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerRowText, { color: theme.text }]}>{item.serviceName}</Text>
                    <Text style={[styles.selectedClientEmail, { color: theme.muted }]}>
                      {`${item.variantName} · ${item.durationMinutes} ${t('appointment.minutesShort')} · €${item.price}`}
                    </Text>
                    <View style={styles.staffRow}>
                      {staffList.map((staff) => {
                        const name = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || t('calendar.employee');
                        const isSelected = item.staffId === staff.id;
                        return (
                          <Pressable
                            key={staff.id}
                            style={[
                              styles.staffChip,
                              { borderColor: theme.border, backgroundColor: theme.surface },
                              isSelected && { backgroundColor: theme.tint, borderColor: theme.tint },
                            ]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setCart((prev) =>
                                prev.map((row, rowIndex) => (rowIndex === index ? { ...row, staffId: staff.id } : row))
                              );
                            }}>
                            <Text style={[styles.staffChipText, { color: isSelected ? theme.onTint : theme.text }]}>{name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <Pressable onPress={() => setCart((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                    <AppIcon name="close" size={20} color={theme.muted} />
                  </Pressable>
                </View>
              ))
            )}
            <Pressable
              style={{ marginTop: 8 }}
              onPress={() => {
                if (!staffId) {
                  setErrorMessage(t('appointment.validationMissingFields'));
                  return;
                }
                setScreen('services');
              }}>
              <Text style={[styles.changeLink, { color: theme.tint }]}>{t('appointment.addService')}</Text>
            </Pressable>
          </View>

          {/* Date & time */}
          <View style={styles.section}>
            <View style={styles.dateRow}>
              <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('appointment.starts')}</Text>
              <View style={styles.dateRowPills}>
                {renderDatePill()}
                {renderTimePill()}
              </View>
            </View>
            <View style={styles.dateRow}>
              <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('appointment.ends')}</Text>
              <Text style={[styles.computedEndText, { color: theme.muted }]}>{formatTimeForInput(endDate)}</Text>
            </View>
            <Text style={[styles.endsHint, { color: theme.muted }]}>{t('appointment.endsComputedHint')}</Text>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('appointment.notes')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { borderColor: theme.border, color: theme.text }]}
              placeholder={t('appointment.notesPlaceholder')}
              placeholderTextColor={theme.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </ScrollView>
      )}

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
            <Pressable style={[styles.pickerSheet, { backgroundColor: theme.surface }]} onPress={(event) => event.stopPropagation()}>
              <View style={styles.pickerDoneRow}>
                <Pressable
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}>
                  <Text style={[styles.pickerDoneText, { color: theme.tint }]}>{t('appointment.done')}</Text>
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
    fontSize: 16,
    fontWeight: '700',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  errorBannerText: {
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
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noResultsText: {
    fontSize: 14,
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedClientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedClientEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  clientResultRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  pickerRowText: {
    fontSize: 15,
    fontWeight: '500',
  },
  staffRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  },
  staffAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  staffChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
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
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  computedEndText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endsHint: {
    fontSize: 12,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerSheet: {
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
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
});
