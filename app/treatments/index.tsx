import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ManagedTreatment, fetchAllTreatments, reorderTreatments, updateTreatment } from '@/lib/api/treatments';
import { COLOR_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';

export default function TreatmentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [treatments, setTreatments] = React.useState<ManagedTreatment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAllTreatments(companyId);
      setTreatments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('treatment.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleMove = React.useCallback(
    async (index: number, direction: -1 | 1) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= treatments.length) return;

      const reordered = [...treatments];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      setTreatments(reordered);

      try {
        await reorderTreatments(reordered.map((item) => item.id));
      } catch {
        setError(t('treatment.failedToReorder'));
        load();
      }
    },
    [treatments, load, t]
  );

  const handleToggleActive = React.useCallback(
    async (treatment: ManagedTreatment) => {
      const nextActive = !treatment.is_active;
      setTreatments((prev) => prev.map((item) => (item.id === treatment.id ? { ...item, is_active: nextActive } : item)));
      try {
        await updateTreatment(treatment.id, { isActive: nextActive });
      } catch {
        setError(t('treatment.failedToSave'));
        load();
      }
    },
    [load, t]
  );

  const showNoCompanyState = !loading && !companyId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: true, title: t('treatment.title') }} />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : showNoCompanyState ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{t('calendar.noCompany')}</Text>
        </View>
      ) : (
        <FlatList
          data={treatments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>{t('treatment.noTreatments')}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const eventColor = mapTreatmentColorToEventColor(item.color, item.name);
            const optionsCount = item.price_option?.length ?? 0;
            return (
              <View style={styles.row}>
                <View style={styles.reorderCol}>
                  <Pressable
                    style={styles.reorderButton}
                    disabled={index === 0}
                    onPress={() => handleMove(index, -1)}>
                    <AppIcon name="arrowUp" size={20} color={index === 0 ? theme.border : theme.text} />
                  </Pressable>
                  <Pressable
                    style={styles.reorderButton}
                    disabled={index === treatments.length - 1}
                    onPress={() => handleMove(index, 1)}>
                    <AppIcon
                      name="arrowDown"
                      size={20}
                      color={index === treatments.length - 1 ? theme.border : theme.text}
                    />
                  </Pressable>
                </View>

                <Pressable
                  style={styles.rowContent}
                  onPress={() => router.push({ pathname: '/treatments/[id]', params: { id: item.id } })}>
                  <View style={[styles.colorDot, { backgroundColor: COLOR_MAP[eventColor] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, !item.is_active && styles.rowNameInactive]}>{item.name}</Text>
                    <Text style={styles.rowSubtitle}>
                      {optionsCount === 1
                        ? t('treatment.oneOption')
                        : t('treatment.optionsCount', { count: optionsCount })}
                    </Text>
                  </View>
                  <AppIcon name="chevronRight" size={22} color={theme.muted} />
                </Pressable>

                <Pressable
                  style={[styles.activeBadge, item.is_active ? styles.activeBadgeOn : styles.activeBadgeOff]}
                  onPress={() => handleToggleActive(item)}>
                  <Text style={[styles.activeBadgeText, item.is_active ? styles.activeBadgeTextOn : styles.activeBadgeTextOff]}>
                    {item.is_active ? t('treatment.active') : t('treatment.inactive')}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {!showNoCompanyState ? (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/treatments/new')}>
          <AppIcon name="add" size={26} color={theme.text} />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
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
      paddingTop: 60,
    },
    stateText: {
      fontSize: 15,
      color: theme.muted,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    reorderCol: {
      width: 28,
    },
    reorderButton: {
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowNameInactive: {
      color: theme.muted,
    },
    rowSubtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    activeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
    },
    activeBadgeOn: {
      backgroundColor: '#D1FAE5',
      borderColor: '#D1FAE5',
    },
    activeBadgeOff: {
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    activeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    activeBadgeTextOn: {
      color: '#064E3B',
    },
    activeBadgeTextOff: {
      color: theme.muted,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.text,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
  });
