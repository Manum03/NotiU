
import { LinearGradient } from 'expo-linear-gradient';
import { Lucide } from '@react-native-vector-icons/lucide';

import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const calendarDays = [
  '26', '27', '28', '29', '30', '31', '1',
  '2', '3', '4', '5', '6', '7', '8',
  '9', '10', '11', '12', '13', '14', '15',
  '16', '17', '18', '19', '20', '21', '22',
  '23', '24', '25', '26', '27', '28', '29',
  '30', '1', '2', '3', '4', '5', '6',
];

const activities = [
  {
    subject: 'TALLER DE PROGRAMACIÓN',
    date: 'Hoy',
    status: 'EN CURSO',
    color: '#AA0330',
  },
  {
    subject: 'ESTADÍSTICA',
    date: '16 Oct',
    status: 'PENDIENTE',
    color: '#9C484F',
  },
  {
    subject: 'CÁTEDRA',
    date: '26 Oct',
    status: 'PENDIENTE',
    color: '#9C484F',
  },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/logonotiU.png')}
            style={styles.mascot}
            resizeMode="contain"
          />

          <View style={styles.greetingContainer}>
            <Text style={styles.date}>
              LUNES, 02 DE NOVIEMBRE
            </Text>

            <Text style={styles.greeting}>
              ¡HOLA, USUARIO!
            </Text>

            <Text style={styles.description}>
              Un pequeño paso te acerca cada vez
              {'\n'}más a tus metas.
            </Text>
          </View>

          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton}>
              <Lucide name="bell" size={23} color="#AA0330" />
            </Pressable>

            <Pressable style={styles.iconButton}>
              <Lucide name="user-round" size={23} color="#E9DDD3" />
            </Pressable>
          </View>
        </View>

        {/* RESUMEN */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Lucide name="circle-check" size={29} color="#AA0330" />

            <Text style={styles.summaryNumber}>3</Text>

            <Text style={styles.summaryLabel}>
              tareas
              {'\n'}pendientes
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Lucide name="files" size={29} color="#AA0330" />

            <Text style={styles.summaryNumber}>2</Text>

            <Text style={styles.summaryLabel}>
              próximas
              {'\n'}entregas
            </Text>
          </View>
        </View>

        {/* CALENDARIO */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CALENDARIO</Text>

            <Text style={styles.sectionLink}>Ver calendario →</Text>
          </View>

          <View style={styles.monthHeader}>
            <Lucide name="chevron-left" size={22} color="#E9DDD3" />
            <Text style={styles.monthText}>NOVIEMBRE</Text>
            <Lucide name="chevron-right" size={22} color="#E9DDD3" />
          </View>

          <View style={styles.weekDays}>
            {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(
              (day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              )
            )}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              const isSelected = index === 7;
              const isOutsideMonth = index < 6 || index > 36;
              const hasActivity = [11, 20, 33].includes(index);

              return (
                <View key={`${day}-${index}`} style={styles.calendarCell}>
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.selectedDay,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.selectedDayText,
                        isOutsideMonth && styles.outsideDay,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>

                  {hasActivity && <View style={styles.activityDot} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* PRÓXIMAS ACTIVIDADES */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              PRÓXIMAS ACTIVIDADES
            </Text>
            <Text style={styles.sectionLink}>Ver todas →</Text>
          </View>

          {activities.map((activity, index) => (
            <View key={activity.subject}>
              <View style={styles.activityRow}>
                <View
                  style={[
                    styles.activityBullet,
                    { backgroundColor: activity.color },
                  ]}
                />

                <View style={styles.activityInfo}>
                  <Text style={styles.activitySubject}>
                    {activity.subject}
                  </Text>
                  <Text style={styles.activityDate}>
                    {activity.date}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    activity.status === 'EN CURSO'
                      ? styles.inProgressBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {activity.status}
                  </Text>
                </View>
              </View>

              {index !== activities.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </View>
          ))}
        </View>

        {/* TAREAS DE HOY */}
        <View style={styles.twoColumns}>
          <View style={styles.smallCard}>
            <Text style={styles.sectionTitle}>TAREAS DE HOY</Text>
            <Text style={styles.smallDate}>Nov 2, 2026.</Text>

            <View style={styles.pagination}>
              <Lucide name="chevron-left" size={16} color="#AA0330" />
              <Text style={styles.pageNumber}>1</Text>
              <Text style={styles.activePage}>2</Text>
              <Text style={styles.pageNumber}>3</Text>
              <Lucide name="chevron-right" size={16} color="#AA0330" />
            </View>
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.sectionTitle}>REALIZADAS</Text>

            <View style={styles.taskLine}>
              <View style={styles.emptyCircle} />
              <Text style={styles.taskText}>
                Hacer el taller de programación.
              </Text>
            </View>

            <View style={styles.taskLine}>
              <View style={styles.filledCircle} />
              <Text style={styles.taskText}>
                Traer materiales para la próxima clase.
              </Text>
            </View>
          </View>
        </View>

        {/* PROGRESO */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TU PROGRESO</Text>
            <Text style={styles.sectionLink}>Esta semana⌄</Text>
          </View>

          <View style={styles.progressContent}>
            <View style={styles.progressCircle}>
              <View style={styles.progressInner}>
                <Text style={styles.progressNumber}>40%</Text>
              </View>
            </View>

            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>
                TAREAS
                {'\n'}COMPLETADAS
              </Text>
              <Text style={styles.progressDescription}>2 de 5</Text>
              <Text style={styles.progressMessage}>
                ¡Vas bien, sigue así!
              </Text>
            </View>
          </View>
        </View>

        {/* CONEXIONES */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>CONEXIONES</Text>
          <Text style={styles.connectionDescription}>
            ¡Elige con qué plataforma quieres conectarte!
          </Text>

          <View style={styles.connectionGrid}>
            {['Correo', 'Classroom', 'Universidad', 'Teams'].map(
              (platform) => (
                <View key={platform} style={styles.connectionItem}>
                  <View style={styles.connectionCircle} />
                  <Text style={styles.connectionText}>{platform}</Text>
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* BARRA DE NAVEGACIÓN */}
      <View style={styles.bottomBar}>
        <View style={styles.navItem}>
          <Lucide name="lightbulb" size={21} color="#260A13" />
        </View>

        <View style={styles.navItem}>
          <Lucide name="notebook-pen" size={21} color="#260A13" />
        </View>

        <View style={styles.activeNavItem}>
          <Lucide name="house" size={23} color="#E9DDD3" />
        </View>

        <View style={styles.navItem}>
          <Lucide name="book-open" size={21} color="#260A13" />
        </View>

        <View style={styles.navItem}>
          <Lucide name="user-round" size={21} color="#260A13" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10060A',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 55,
    paddingBottom: 115,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 115,
    marginBottom: 35,
  },

  mascot: {
    width: 85,
    height: 100,
  },

  greetingContainer: {
    flex: 1,
    marginLeft: 10,
  },

  date: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 12,
    color: '#E9DDD3',
    marginBottom: 7,
  },

  greeting: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 25,
    color: '#E9DDD3',
  },

  description: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 11,
    color: '#E9DDD3',
    marginTop: 5,
    lineHeight: 17,
  },

  headerIcons: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    marginLeft: 8,
  },

  iconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    minHeight: 65,
    backgroundColor: '#260A13',
    borderWidth: 1,
    borderColor: '#800427',
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 7,
  },

  summaryNumber: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 29,
    color: '#E9DDD3',
  },

  summaryLabel: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9,
    color: '#E9DDD3',
  },

  sectionCard: {
    backgroundColor: '#260A13',
    borderWidth: 1,
    borderColor: '#800427',
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 17,
    color: '#E9DDD3',
  },

  sectionLink: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9,
    color: '#AA0330',
  },

  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    marginBottom: 18,
  },

  monthText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: '#E9DDD3',
  },

  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },

  weekDay: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 10,
    color: '#C9B8B1',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedDay: {
    backgroundColor: '#AA0330',
  },

  dayText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9,
    color: '#E9DDD3',
  },

  selectedDayText: {
    color: '#FFFFFF',
  },

  outsideDay: {
    color: '#80666C',
  },

  activityDot: {
    position: 'absolute',
    bottom: 1,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#AA0330',
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },

  activityBullet: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },

  activityInfo: {
    flex: 1,
  },

  activitySubject: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 11,
    color: '#E9DDD3',
  },

  activityDate: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9,
    color: '#C9B8B1',
  },

  statusBadge: {
    width: 90,
    borderRadius: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },

  inProgressBadge: {
    backgroundColor: '#800427',
  },

  pendingBadge: {
    backgroundColor: '#4E021A',
    borderWidth: 1,
    borderColor: '#9C484F',
  },

  statusText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 10,
    color: '#E9DDD3',
  },

  rowDivider: {
    height: 1,
    backgroundColor: '#4E021A',
  },

  twoColumns: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },

  smallCard: {
    flex: 1,
    backgroundColor: '#260A13',
    borderWidth: 1,
    borderColor: '#800427',
    borderRadius: 13,
    padding: 11,
    minHeight: 125,
  },

  smallDate: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9,
    color: '#C9B8B1',
    marginTop: -5,
    marginBottom: 13,
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },

  pageNumber: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9,
    color: '#C9B8B1',
    borderWidth: 1,
    borderColor: '#4E021A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  activePage: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9,
    color: '#FFFFFF',
    backgroundColor: '#AA0330',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  taskLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
  },

  emptyCircle: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#AA0330',
    marginTop: 2,
  },

  filledCircle: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#AA0330',
    marginTop: 2,
  },

  taskText: {
    flex: 1,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 9,
    color: '#E9DDD3',
    lineHeight: 13,
  },

  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 15,
  },

  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#AA0330',
    borderWidth: 16,
    borderColor: '#E9DDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4E021A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressNumber: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 23,
    color: '#E9DDD3',
  },

  progressInfo: {
    flex: 1,
    marginLeft: 15,
  },

  progressTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 19,
    color: '#E9DDD3',
  },

  progressDescription: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
    color: '#E9DDD3',
    marginTop: 5,
  },

  progressMessage: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 10,
    color: '#C9B8B1',
    marginTop: 18,
  },

  connectionDescription: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 10,
    color: '#C9B8B1',
    marginTop: 5,
    marginBottom: 10,
  },

  connectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderColor: '#4E021A',
  },

  connectionItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
  },

  connectionCircle: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#AA0330',
  },

  connectionText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 10,
    color: '#E9DDD3',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#800427',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
  },

  navItem: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeNavItem: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#AA0330',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
