import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { StaffAvatar } from '@/components/staff-avatar';
import { useAuth } from '@/contexts/auth-context';
import { fetchAllStaff, Staff } from '@/lib/api/staff';

function staffName(staff: Staff, fallback: string) {
  return `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || fallback;
}

export default function StaffListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();

  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAllStaff(companyId);
      setStaff(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const showNoCompanyState = !loading && !companyId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('staff.title')}</Text>
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
      ) : showNoCompanyState ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{t('calendar.noCompany')}</Text>
        </View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>{t('staff.noStaff')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = staffName(item, t('calendar.employee'));
            const subtitle = [item.role, item.specialization].filter(Boolean).join(' · ');
            return (
              <Pressable style={styles.row} onPress={() => router.push({ pathname: '/staff/[id]', params: { id: item.id } })}>
                <StaffAvatar imagePath={item.image_path} name={name} size={40} backgroundColor="#e7e7e7" fontSize={14} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{name}</Text>
                  {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#c6c6c6" />
              </Pressable>
            );
          }}
        />
      )}

      {!showNoCompanyState ? (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/staff/new')}>
          <MaterialIcons name="add" size={26} color="#1b1b1b" />
        </TouchableOpacity>
      ) : null}
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
    paddingTop: 60,
  },
  stateText: {
    fontSize: 15,
    color: '#8b8b8b',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#8b8b8b',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1b1b1b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});
