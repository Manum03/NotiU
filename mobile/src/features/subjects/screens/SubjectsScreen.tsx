import HeaderActions from '../../../components/HeaderActions';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lucide } from '@react-native-vector-icons/lucide';

import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { FONTS } from '../../../core/theme/fonts';
import BottomNavigation from '../../home/components/BottomNavigation';
import { apiRequest } from '../../../services/api/api';
import { getSession } from '../../../services/storage/authStorage';
import SubjectCard from '../components/SubjectCard';
import SubjectFilters, {
  PriorityFilter,
  StatusFilter,
} from '../components/SubjectFilters';
import { COLORS, Subject, SubjectsResponse } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Subjects'>;

export default function SubjectsScreen({ navigation }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todas');
  const [priority, setPriority] = useState<PriorityFilter>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSubjects = useCallback(async () => {
    try {
      setError('');

      const session = await getSession();

      if (!session?.token) {
        throw new Error('No se encontró una sesión activa.');
      }

      const response = await apiRequest<SubjectsResponse>('/subjects', {
        method: 'GET',
        token: session.token,
      });

      setSubjects(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar las materias.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [loadSubjects]),
  );

  const filtered = subjects.filter(subject => {
    const query = search.toLowerCase();

    const matchesSearch =
      subject.name.toLowerCase().includes(query) ||
      subject.code.toLowerCase().includes(query);

    const matchesStatus =
      status === 'todas' || subject.status === status;

    const matchesPriority =
      priority === null || subject.priority === priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const activeFilterCount =
    (status !== 'todas' ? 1 : 0) +
    (priority !== null ? 1 : 0);

  const activeReminders = subjects.filter(
    subject =>
      subject.reminder.enabled && subject.status !== 'aprobada',
  ).length;

  const averageProgress = subjects.length
    ? Math.round(
        subjects.reduce(
          (sum, subject) => sum + (subject.progress ?? 0),
          0,
        ) / subjects.length,
      )
    : 0;

  const clearFilters = () => {
    setStatus('todas');
    setPriority(null);
  };

  const openAddSubject = () => {
    navigation.navigate('AddSubject');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSubjects();
            }}
            tintColor={COLORS.brightWine}
            colors={[COLORS.brightWine]}
          />
        }
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <View style={styles.titleBar} />

              <Text style={styles.title}>
                MIS <Text style={styles.titleAccent}>MATERIAS</Text>
              </Text>
            </View>

            <Text style={styles.subtitle}>
              Organiza, da seguimiento y cumple tus metas.
            </Text>
          </View>

          <View style={styles.headerActionsPosition}>
            
            <HeaderActions />
          
          </View>
        
        </View>

        {/* Buscador y filtros */}
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Lucide
              name="search"
              size={17}
              color={COLORS.brightWine}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Buscar materia..."
              placeholderTextColor={COLORS.soft}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <Pressable
            style={styles.filterButton}
            onPress={() => setFiltersOpen(open => !open)}
          >
            <Lucide
              name="funnel"
              size={16}
              color={COLORS.brightWine}
            />

            <Text style={styles.filterText}>Filtrar</Text>

            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {activeFilterCount}
                </Text>
              </View>
            )}

            <Lucide
              name={filtersOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.brightWine}
            />
          </Pressable>
        </View>

        {filtersOpen && (
          <SubjectFilters
            subjects={subjects}
            status={status}
            priority={priority}
            onStatusChange={setStatus}
            onPriorityChange={setPriority}
            onClear={clearFilters}
          />
        )}

        
               {/* Resumen académico */}
        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>
              RESUMEN ACADÉMICO
            </Text>

            <Lucide
              name="trending-up"
              size={19}
              color={COLORS.brightWine}
            />
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Lucide
                  name="book-open"
                  size={19}
                  color="#aa0330"
                />
              </View>

              <Text style={styles.statNumber}>
                {subjects.length}
              </Text>

              <Text style={styles.statLabel}>
                MATERIAS
              </Text>

          
            </View>

            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Lucide
                  name="bell"
                  size={19}
                  color="#aa0330"
                />
              </View>

              <Text style={styles.statNumber}>
                {activeReminders}
              </Text>

              <Text style={styles.statLabel}>
                RECORDATORIOS
              </Text>

              
            </View>

            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Lucide
                  name="trending-up"
                  size={19}
                  color="#aa0330"
                />
              </View>

              <Text style={styles.statNumber}>
                {averageProgress}%
              </Text>

              <Text style={styles.statLabel}>
                AVANCE
              </Text>

              
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, Math.min(100, averageProgress))}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Lista de materias */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            TUS MATERIAS
          </Text>

          <Pressable
            style={styles.addButton}
            onPress={openAddSubject}
          >
            <Lucide
              name="plus"
              size={14}
              color={COLORS.white}
            />

            <Text style={styles.addText}>
              AÑADIR MATERIA
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.brightWine}
            style={{ marginTop: 50 }}
          />
        ) : error ? (
          <View style={styles.empty}>
            <Lucide
              name="alert-circle"
              size={32}
              color={COLORS.orange}
            />

            <Text style={styles.emptyTitle}>
              No pudimos cargar las materias
            </Text>

            <Text style={styles.emptyText}>
              {error}
            </Text>

            <Pressable
              style={styles.retry}
              onPress={loadSubjects}
            >
              <Text style={styles.retryText}>
                VOLVER A INTENTAR
              </Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Lucide
              name="book-open"
              size={34}
              color={COLORS.soft}
            />

            <Text style={styles.emptyTitle}>
              {subjects.length === 0
                ? 'Todavía no tienes materias'
                : 'No encontramos resultados'}
            </Text>

            <Text style={styles.emptyText}>
              {subjects.length === 0
                ? 'Toca "Añadir materia" para registrar la primera.'
                : 'Prueba con otro nombre o cambia los filtros.'}
            </Text>
          </View>
        ) : (
          filtered.map(subject => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onPress={() =>
                navigation.navigate('SubjectDetail', { subject })
              }
            />
          ))
        )}
      </ScrollView>

      {/* Navegación inferior */}
      <BottomNavigation
        activeScreen="Subjects"
        onHome={() => navigation.navigate('Home')}
        onSubjects={() => navigation.navigate('Subjects')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerActionsPosition: {
  transform: [{ translateY: 70 }],
},
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  headerText: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  titleBar: {
    width: 3,
    height: 26,
    backgroundColor: COLORS.brightWine,
  },

  title: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 30,
    letterSpacing: 1,
  },

  titleAccent: {
    color: COLORS.brightWine,
  },

  subtitle: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 6,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.brightWine,
    backgroundColor: COLORS.darkWine,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 13,
    padding: 0,
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.brightWine,
    backgroundColor: COLORS.darkWine,
  },

  filterText: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13,
  },

  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.brightWine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: COLORS.white,
    fontFamily: FONTS.title,
    fontSize: 12,
  },
  
  summarySection: {
    marginTop: 2,
    marginBottom: 18,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 3,
  },

  summaryTitle: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 17,
    letterSpacing: 1,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#210A13',
    borderWidth: 1,
    borderColor: '#572033',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 5,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },

  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#451025',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  statNumber: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 25,
  },

  statLabel: {
    color: '#aa0330',
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    textAlign: 'center',
  },

  progressTrack: {
    height: 4,
    backgroundColor: '#451025',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 9,
    marginHorizontal: 3,
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.brightWine,
    borderRadius: 10,
  },

  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#572033',
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  listTitle: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 24,
    letterSpacing: 1,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.wine,
  },

  addText: {
    color: COLORS.white,
    fontFamily: FONTS.title,
    fontSize: 13,
    letterSpacing: 1,
  },

  empty: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 22,
    marginTop: 14,
    textAlign: 'center',
  },

  emptyText: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },

  retry: {
    backgroundColor: COLORS.wine,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 17,
  },

  retryText: {
    color: COLORS.text,
    fontFamily: FONTS.title,
    fontSize: 15,
    letterSpacing: 1,
  },
});
