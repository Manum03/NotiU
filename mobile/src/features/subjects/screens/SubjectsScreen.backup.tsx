import BottomNavigation from '../../home/components/BottomNavigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Lucide } from '@react-native-vector-icons/lucide';

import { apiRequest } from '../../../services/api/api';
import { getSession } from '../../../services/storage/authStorage';

type SubjectStatus = 'cursando' | 'aprobada' | 'pendiente';

type SubjectPriority = 'alta' | 'media' | 'baja' | 'sin_fecha';

type ActivityType =
  | 'tarea'
  | 'trabajo'
  | 'examen'
  | 'proyecto'
  | 'lectura'
  | 'otro';

type Subject = {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  status: SubjectStatus;
  priority: SubjectPriority;
  teacher: string;
  color: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  activityType: ActivityType | null;
  reminder: {
    enabled: boolean;
    dateTime?: string;
  };
  notes: string;
  progress: number;
  currentAverage: number;
};

type SubjectsResponse = {
  data: Subject[];
  total: number;
};

const COLORS = {
  background: '#10060A',
  card: '#260A13',
  wine: '#800427',
  brightWine: '#AA0330',
  text: '#E9DDD3',
  muted: '#C9B8B1',
  soft: '#80666C',
  border: '#572033',
  orange: '#EE6520',
  green: '#20A879',
  yellow: '#EEE620',
  white: '#FFFFFF',
};

type SubjectsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Subjects'
>;

export default function SubjectsScreen({ navigation, route }: SubjectsScreenProps) {

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todas' | SubjectStatus>('todas');
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

      const response = await apiRequest<SubjectsResponse>(
        '/subjects',
        {
          method: 'GET',
          token: session.token,
        },
      );

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

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch =
      subject.name.toLowerCase().includes(search.toLowerCase()) ||
      subject.code.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'todas' || subject.status === filter;

    return matchesSearch && matchesFilter;
  });

  const getStatusLabel = (status: SubjectStatus) => {
    switch (status) {
      case 'cursando':
        return 'EN CURSO';
      case 'aprobada':
        return 'APROBADA';
      case 'pendiente':
        return 'PENDIENTE';
    }
  };

  const getStatusColor = (status: SubjectStatus) => {
    switch (status) {
      case 'cursando':
        return COLORS.orange;
      case 'aprobada':
        return COLORS.green;
      case 'pendiente':
        return COLORS.yellow;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              ORGANIZA TU VIDA ACADÉMICA
            </Text>
            <Text style={styles.title}>MIS MATERIAS</Text>
            <Text style={styles.subtitle}>
              Todo tu semestre en un solo lugar.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Lucide name="book-open" size={27} color={COLORS.text} />
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{subjects.length}</Text>
            <Text style={styles.summaryLabel}>MATERIAS</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {subjects.filter(s => s.status === 'cursando').length}
            </Text>
            <Text style={styles.summaryLabel}>EN CURSO</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {subjects.reduce((total, s) => total + s.credits, 0)}
            </Text>
            <Text style={styles.summaryLabel}>CRÉDITOS</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Lucide name="search" size={19} color={COLORS.soft} />

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar materia o código..."
            placeholderTextColor={COLORS.soft}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {[
            { label: 'Todas', value: 'todas' },
            { label: 'En curso', value: 'cursando' },
            { label: 'Pendientes', value: 'pendiente' },
            { label: 'Aprobadas', value: 'aprobada' },
          ].map(option => (
            <Pressable
              key={option.value}
              onPress={() => setFilter(option.value as typeof filter)}
              style={[
                styles.filterButton,
                filter === option.value && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === option.value && styles.filterTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TU SEMESTRE</Text>
          <Text style={styles.resultCount}>
            {filteredSubjects.length} materias
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.brightWine}
            style={styles.loader}
          />
        ) : error ? (
          <View style={styles.emptyState}>
            <Lucide name="alert-circle" size={32} color={COLORS.orange} />
            <Text style={styles.emptyTitle}>
              No pudimos cargar las materias
            </Text>
            <Text style={styles.emptyText}>{error}</Text>

            <Pressable style={styles.retryButton} onPress={loadSubjects}>
              <Text style={styles.retryText}>VOLVER A INTENTAR</Text>
            </Pressable>
          </View>
        ) : filteredSubjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Lucide name="book-open" size={34} color={COLORS.soft} />
            <Text style={styles.emptyTitle}>
              {subjects.length === 0
                ? 'Todavía no tienes materias'
                : 'No encontramos resultados'}
            </Text>
            <Text style={styles.emptyText}>
              {subjects.length === 0
                ? 'Cuando registres tus materias aparecerán aquí.'
                : 'Prueba con otro nombre o cambia los filtros.'}
            </Text>
          </View>
        ) : (
          filteredSubjects.map(subject => (
            <View
  key={subject.id}
  style={[
    styles.subjectCard,
    {
      backgroundColor:
        subject.status === 'cursando'
          ? '#310B19'
          : subject.status === 'pendiente'
          ? '#481D2B'
          : '#302B2D',
    },
  ]}
>
              <View
                style={[
                  styles.subjectAccent,
                  {
                    backgroundColor:
                      subject.color || COLORS.brightWine,
                  },
                ]}
              />

              <View style={styles.subjectContent}>
                <View style={styles.subjectTop}>
                  <Text style={styles.subjectCode}>
                    {subject.code}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getStatusColor(subject.status) + '20',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            getStatusColor(subject.status),
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: getStatusColor(subject.status),
                        },
                      ]}
                    >
                      {getStatusLabel(subject.status)}
                    </Text>
                  </View>
                  </View>

                  <View
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor:
                        (subject.priority === 'alta'
                          ? '#EE6520'
                          : subject.priority === 'media'
                          ? '#D6B52A'
                          : subject.priority === 'baja'
                          ? '#20A879'
                          : '#9876C5') + '25',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color:
                          subject.priority === 'alta'
                            ? '#EE6520'
                            : subject.priority === 'media'
                            ? '#D6B52A'
                            : subject.priority === 'baja'
                            ? '#20A879'
                            : '#9876C5',
                      }}
                    >
                      {subject.priority === 'alta'
                        ? 'PRIORIDAD ALTA'
                        : subject.priority === 'media'
                        ? 'PRIORIDAD MEDIA'
                        : subject.priority === 'baja'
                        ? 'PRIORIDAD BAJA'
                        : 'SIN FECHA'}
                    </Text>
                  </View>

                  <Text style={styles.subjectName}>
                    {subject.name}
                  </Text>

                  <Text style={styles.teacher}>
                    {subject.teacher || 'Docente por asignar'}
                  </Text>

                  <View style={{ marginTop: 14, marginBottom: 14 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 7,
                      }}
                    >
                      <Text style={styles.averageLabel}>
                        PROGRESO
                      </Text>

                      <Text style={styles.infoText}>
                        {Math.min(100, Math.max(0, subject.progress ?? 0))}%
                      </Text>
                    </View>

                    <View
                      style={{
                        height: 7,
                        backgroundColor: '#572033',
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, subject.progress ?? 0))}%`,
                          backgroundColor: COLORS.brightWine,
                          borderRadius: 10,
                        }}
                      />
                    </View>
                  </View>

                                    {/* Fecha de entrega */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Lucide
                      name="calendar"
                      size={14}
                      color={COLORS.muted}
                    />

                    <Text
                      style={[
                        styles.infoText,
                        { marginLeft: 7 },
                      ]}
                    >
                      {subject.dueDate
                        ? `Entrega: ${new Date(
                            subject.dueDate,
                          ).toLocaleDateString('es-CO')}${
                            subject.dueTime
                              ? ` - ${subject.dueTime}`
                              : ''
                          }`
                        : 'Sin fecha de entrega'}
                    </Text>
                  </View>

                  {/* Tipo de actividad */}
                  {subject.activityType && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Lucide
                        name="clipboard-list"
                        size={14}
                        color={COLORS.muted}
                      />

                      <Text
                        style={[
                          styles.infoText,
                          { marginLeft: 7 },
                        ]}
                      >
                        {subject.activityType === 'tarea'
                          ? 'Tarea'
                          : subject.activityType === 'trabajo'
                          ? 'Trabajo'
                          : subject.activityType === 'examen'
                          ? 'Examen'
                          : subject.activityType === 'proyecto'
                          ? 'Proyecto'
                          : subject.activityType === 'lectura'
                          ? 'Lectura'
                          : 'Otro'}
                      </Text>
                    </View>
                  )}

                  {/* Recordatorio */}
                  {subject.reminder?.enabled && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Lucide
                        name="bell"
                        size={14}
                        color={COLORS.brightWine}
                      />

                      <Text
                        style={[
                          styles.infoText,
                          {
                            marginLeft: 7,
                            color: COLORS.brightWine,
                          },
                        ]}
                      >
                        Recordatorio activado
                      </Text>
                    </View>
                  )}

                  {/* Información inferior */}
                  <View style={styles.subjectFooter}>
                    <View style={styles.infoItem}>
                      <Lucide
                        name="layers"
                        size={14}
                        color={COLORS.muted}
                      />
                      <Text style={styles.infoText}>
                        Semestre {subject.semester}
                      </Text>
                    </View>

                    <View style={styles.infoItem}>
                      <Lucide
                        name="award"
                        size={14}
                        color={COLORS.muted}
                      />
                      <Text style={styles.infoText}>
                        {subject.credits} créditos
                      </Text>
                    </View>
                  </View>

                <View style={styles.averageContainer}>
                  <Text style={styles.averageLabel}>
                    PROMEDIO ACTUAL
                  </Text>
                  <Text style={styles.averageValue}>
                    {subject.currentAverage.toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        style={styles.refreshButton}
        onPress={() => {
          setRefreshing(true);
          loadSubjects();
        }}
        disabled={loading || refreshing}
      >
        {refreshing ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Lucide
            name="refresh-cw"
            size={19}
            color={COLORS.white}
          />
        )}

        <Text style={styles.refreshText}>
          ACTUALIZAR MATERIAS
        </Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  eyebrow: {
    color: COLORS.orange,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 19,
    paddingVertical: 19,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 23,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 5,
  },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: COLORS.border,
  },
  searchContainer: {
    height: 49,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    marginLeft: 10,
  },
  filters: {
    gap: 9,
    paddingBottom: 25,
  },
  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.wine,
    borderColor: COLORS.brightWine,
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  resultCount: {
    color: COLORS.soft,
    fontSize: 11,
  },
  subjectCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  subjectAccent: {
    width: 5,
  },
  subjectContent: {
    flex: 1,
    padding: 16,
  },
  subjectTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectCode: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
  },
  subjectName: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 5,
  },
  teacher: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 17,
  },
  subjectFooter: {
    flexDirection: 'row',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 13,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: COLORS.muted,
    fontSize: 10,
  },
  averageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: '#10060A',
    padding: 10,
    borderRadius: 9,
  },
  averageLabel: {
    color: COLORS.soft,
    fontSize: 9,
    letterSpacing: 1,
  },
  averageValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  loader: {
    marginTop: 50,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 5,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: COLORS.wine,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 17,
  },
  retryText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    left: 22,
    right: 22,
    height: 49,
    borderRadius: 14,
    backgroundColor: COLORS.wine,
    borderWidth: 1,
    borderColor: COLORS.brightWine,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  refreshText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
