// Prueba de punta a punta de la API de NotiU.
// Usa el emulador REAL de Firebase Auth + una Firestore falsa en memoria + red simulada
// (Moodle y Expo), así no necesita credenciales ni Java.
// Ejecutar:  npm run test:e2e
import { readFileSync } from "node:fs";
import path from "node:path";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { fakeDb, fakeStore } from "./fake-firestore";

const RUN = Date.now();
const SRC = path.join(__dirname, "..", "src");
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_OAUTH_CLIENT_ID;
process.env.JOBS_ENABLED = "false";


// Reemplaza config/firebase antes de que cualquier módulo lo importe
process.env.ADMIN_EMAILS = `admin${RUN}@notiu.com`;
const fbApp = initializeApp({ projectId: "demo-notiu" });
const fbPath = require.resolve(`${SRC}/config/firebase`);
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true, exports: { db: fakeDb, firebaseAuth: getAuth(fbApp) } } as any;

// Red simulada: calendario de Moodle (IP pública de ejemplo) + API de push de Expo
let ics = readFileSync(path.join(__dirname, "fixtures", "moodle.ics"), "utf8");
const pushes: any[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(input instanceof URL ? input : input.url ?? input);
  if (url.includes("93.184.215.14")) {
    if (url.includes("authtoken=revoked")) return new Response("forbidden", { status: 403 });
    return new Response(ics, { status: 200, headers: { "content-type": "text/calendar" } });
  }
  if (url.includes("exp.host")) {
    const body = JSON.parse(init.body);
    const msgs = Array.isArray(body) ? body : [body];
    pushes.push(...msgs);
    return new Response(JSON.stringify({ data: msgs.map(() => ({ status: "ok", id: "r1" })) }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input, init);
}) as any;

let pass = 0, failCount = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) { pass++; console.log("  ✓", name); } else { failCount++; console.log("  ✗", name, extra ?? ""); }
};

const signUp = async (email: string) => {
  const r = await realFetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "secreta123", returnSecureToken: true, displayName: email.split("@")[0] }),
  });
  const j: any = await r.json();
  if (!j.idToken) {
    const r2 = await realFetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "secreta123", returnSecureToken: true }) });
    return ((await r2.json()) as any).idToken as string;
  }
  return j.idToken as string;
};

(async () => {
  const { app } = require(`${SRC}/app`);
  const { reminderService } = require(`${SRC}/services/reminder.service`);
  const server = app.listen(3999);
  const base = "http://127.0.0.1:3999/api";
  // Correos únicos por corrida: el emulador conserva usuarios mientras está encendido
  const run = RUN;
  const token = await signUp(`ana${run}@uni.edu.co`);
  const adminToken = await signUp(`admin${run}@notiu.com`);
  const api = async (method: string, path: string, body?: unknown, tok: string | null = token) => {
    const r = await realFetch(base + path, { method, headers: { "content-type": "application/json", ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: (await r.json().catch(() => null)) as any };
  };

  console.log("Auth");
  check("health", (await api("GET", "/health", undefined, null)).status === 200);
  check("sin token -> 401", (await api("GET", "/tasks", undefined, null)).status === 401);
  check("token inválido -> 401", (await api("GET", "/tasks", undefined, "basura")).status === 401);
  const me = await api("GET", "/auth/me");
  check("me crea usuario student", me.status === 200 && me.body.role === "student" && me.body.email === `ana${run}@uni.edu.co`, me.body);
  check("users como student -> 403", (await api("GET", "/auth/users")).status === 403);
  const adminMe = await api("GET", "/auth/me", undefined, adminToken);
  check("ADMIN_EMAILS da rol admin", adminMe.body.role === "admin", adminMe.body);
  check("users como admin -> 200", (await api("GET", "/auth/users", undefined, adminToken)).status === 200);
  check("rutas viejas de login ya no existen", (await api("POST", "/auth/login", {})).status === 404);

  console.log("Dispositivos");
  check("token no-Expo -> 400", (await api("POST", "/devices", { token: "abc", platform: "android" })).status === 400);
  check("registrar Expo token", (await api("POST", "/devices", { token: "ExponentPushToken[test123]", platform: "android" })).status === 201);
  const t = await api("POST", "/notifications/test");
  check("push de prueba llega a Expo", t.body.devices === 1 && pushes.length === 1, t.body);

  console.log("Moodle");
  const integ0 = await api("GET", "/integrations");
  check("lista 2 integraciones desconectadas", integ0.body.data.length === 2 && integ0.body.data.every((i: any) => !i.connected));
  check("URL a localhost -> 400", (await api("PUT", "/integrations/moodle", { icalUrl: "http://localhost/cal.ics" })).status === 400);
  check("URL privada -> 400", (await api("PUT", "/integrations/moodle", { icalUrl: "https://192.168.1.5/cal.ics" })).status === 400);
  const url = "https://93.184.215.14/calendar/export_execute.php?userid=7&authtoken=abc&preset_what=all&preset_time=recentupcoming";
  pushes.length = 0;
  const conn = await api("PUT", "/integrations/moodle", { icalUrl: url });
  check("conectar Moodle", conn.status === 200 && conn.body.sync.created === 3, conn.body);
  check("no expone el secreto", !JSON.stringify(conn.body).includes("authtoken"));
  const stored = [...fakeStore.entries()].find(([p]) => p.startsWith("integrations/"))![1];
  check("URL guardada cifrada", stored.secret.startsWith("v1:") && !stored.secret.includes("authtoken"));
  check("1.ª sync: un solo push de resumen", pushes.length === 1 && pushes[0].title.includes("Moodle conectado"), pushes);

  const tasks = await api("GET", "/tasks");
  const titles = tasks.body.tasks.map((x: any) => x.title);
  check("3 tareas ordenadas por fecha", tasks.body.total === 3 && titles[0] === "Quiz 2", titles);
  const tallerT = tasks.body.tasks.find((x: any) => x.title.startsWith("Taller 3"));
  check("fecha en hora de Colombia (dueDate/dueTime)", tallerT.dueDate === "2026-11-24" && tallerT.dueTime === "23:59" && tallerT.source === "MOODLE" && tallerT.courseName === "CONSTRUCCION-SW", tallerT);
  const festivo = tasks.body.tasks.find((x: any) => x.title === "Festivo");
  check("evento de día completo sin hora", festivo.dueDate === "2026-12-01" && festivo.dueTime === null, festivo);
  check("contrato del equipo (status, priority, subtasks, progress)", tallerT.status === "pendiente" && ["alta", "media", "baja"].includes(tallerT.priority) && Array.isArray(tallerT.subtasks) && tallerT.progress === 0, tallerT);
  const reminders0 = [...fakeStore.keys()].filter((k) => k.startsWith("reminders/"));
  check("recordatorios programados (24h y 2h por tarea futura)", reminders0.length === 6, reminders0.length);

  console.log("Re-sync con cambios");
  ics = ics.replace("DTSTART:20261125T045900Z\nDTEND:20261125T045900Z", "DTSTART:20261127T045900Z\nDTEND:20261127T045900Z")
    .replace("END:VCALENDAR", "BEGIN:VEVENT\nUID:2000@moodle.uni.edu.co\nSUMMARY:Proyecto final is due\nDTSTAMP:20261119T000000Z\nDTSTART:20261205T045900Z\nCATEGORIES:CONSTRUCCION-SW\nEND:VEVENT\nEND:VCALENDAR");
  check("sync manual con cooldown -> 429", (await api("POST", "/integrations/moodle/sync")).status === 429);
  const ip = [...fakeStore.keys()].find((k) => k.startsWith("integrations/"))!;
  fakeStore.get(ip)!.lastSyncAt = new Date(Date.now() - 120_000);
  pushes.length = 0;
  const s2 = await api("POST", "/integrations/moodle/sync");
  check("sync detecta 1 nueva y 1 cambio de fecha", s2.body.created === 1 && s2.body.updated === 1 && s2.body.notified === 2, s2.body);
  check("pushes: nueva tarea + cambio de fecha", pushes.some((p) => p.title.startsWith("📚 Nueva tarea: Proyecto final")) && pushes.some((p) => p.title.startsWith("📅 Cambió la fecha: Taller 3")), pushes.map((p) => p.title));
  fakeStore.get(ip)!.lastSyncAt = new Date(Date.now() - 120_000);
  const s3 = await api("POST", "/integrations/moodle/sync");
  check("sync sin cambios no notifica", s3.body.updated === 0 && s3.body.created === 0 && s3.body.notified === 0, s3.body);

  console.log("Notificaciones");
  const n = await api("GET", "/notifications");
  check("historial con 3 y unreadCount 3", n.body.data.length === 3 && n.body.meta.unreadCount === 3, n.body.meta);
  const r1 = await api("PATCH", `/notifications/${n.body.data[0].id}/read`);
  check("marcar una como leída", r1.body.isRead === true);
  check("filtro read=false", (await api("GET", "/notifications?read=false")).body.data.length === 2);
  check("read-all", (await api("POST", "/notifications/read-all")).body.updated === 2);

  console.log("Recordatorios");
  const taller = (await api("GET", "/tasks?search=taller")).body.tasks[0];
  check("cambio de fecha aplicado", taller.dueDate === "2026-11-26", taller.dueDate);
  pushes.length = 0;
  const sent = await reminderService.processDue(new Date(new Date(taller.dueAt).getTime() - 100 * 60_000));
  check("job envía recordatorios vencidos", sent >= 1 && pushes.some((p) => p.title === `⏰ ${taller.title}`), { sent, titles: pushes.map((p) => p.title) });
  console.log("    ej.:", pushes.find((p) => p.title.includes("Taller"))?.body);
  const remBefore = [...fakeStore.keys()].filter((k) => k.startsWith("reminders/") && k.includes(taller.id)).length;
  check("en importadas se puede cambiar prioridad y subtareas", (await api("PATCH", `/tasks/${taller.id}`, { priority: "alta", subtasks: [{ title: "Diagrama" }, { title: "Código", completed: true }] })).body.task.progress === 50);
  const done = await api("PATCH", `/tasks/${taller.id}/complete`);
  const remAfter = [...fakeStore.keys()].filter((k) => k.startsWith("reminders/") && k.includes(taller.id)).length;
  check("completar tarea cancela sus recordatorios", done.body.task.status === "realizada" && done.body.task.progress === 50 && remAfter === 0, { remBefore, remAfter });
  check("tarea importada no permite editar título", (await api("PATCH", `/tasks/${taller.id}`, { title: "x" })).status === 400);
  check("filtro status=realizada", (await api("GET", "/tasks?status=realizada")).body.total === 1);
  check("filtro source=moodle", (await api("GET", "/tasks?source=moodle")).body.total === 4);
  check("status inválido -> 400", (await api("GET", "/tasks?status=completed")).status === 400);

  console.log("Tareas manuales y ajustes");
  const man = await api("POST", "/tasks", { title: "Leer capítulo 4", type: "recordatorio", priority: "alta", dueDate: "2026-12-10", dueTime: "08:00", subtasks: [{ title: "Resumen" }] });
  check("crear tarea manual", man.status === 201 && man.body.message === "Tarea creada correctamente" && man.body.task.source === "MANUAL" && man.body.task.subtasks[0].id, man.body);
  check("dueAt calculado en hora de Colombia", man.body.task.dueAt === "2026-12-10T13:00:00.000Z", man.body.task.dueAt);
  check("validación de fecha", (await api("POST", "/tasks", { title: "x", dueDate: "mañana" })).status === 400);
  check("validación de hora", (await api("POST", "/tasks", { title: "x", dueDate: "2026-12-10", dueTime: "25:00" })).status === 400);
  check("materia inexistente -> 404", (await api("POST", "/tasks", { title: "x", subjectId: "no-existe" })).status === 404);
  check("defaults type/priority", (await api("POST", "/tasks", { title: "Nota rápida" })).body.task.priority === "media");
  check("detalle de tarea { task }", (await api("GET", `/tasks/${man.body.task.id}`)).body.task.id === man.body.task.id);
  check("editar tarea manual", (await api("PATCH", `/tasks/${man.body.task.id}`, { title: "Leer cap. 4 y 5" })).body.task.title === "Leer cap. 4 y 5");
  const st = await api("PATCH", "/settings", { reminders: { offsetsMinutes: [60, 2880, 60] } });
  check("ajustar recordatorios (sin duplicados, ordenados)", JSON.stringify(st.body.settings.reminders.offsetsMinutes) === "[2880,60]", st.body);
  const manRem = [...fakeStore.values()].filter((d) => d.taskId === man.body.task.id).map((d) => d.offsetMinutes).sort();
  check("reprograma con los nuevos tiempos", JSON.stringify(manRem) === "[2880,60]", manRem);
  check("offsets inválidos -> 400", (await api("PATCH", "/settings", { reminders: { offsetsMinutes: [1] } })).status === 400);
  console.log("Archivar y restaurar");
  const arch = await api("PATCH", `/tasks/${man.body.task.id}/archive`);
  const archRem = [...fakeStore.values()].filter((d) => d.taskId === man.body.task.id).length;
  check("archivar cancela recordatorios", arch.body.task.isArchived === true && archRem === 0, { arch: arch.body, archRem });
  check("archivada no sale en la lista normal", !(await api("GET", "/tasks")).body.tasks.some((t: any) => t.id === man.body.task.id));
  check("archived=true lista las archivadas", (await api("GET", "/tasks?archived=true")).body.tasks.some((t: any) => t.id === man.body.task.id));
  check("archivar dos veces -> 409", (await api("PATCH", `/tasks/${man.body.task.id}/archive`)).status === 409);
  const rest = await api("PATCH", `/tasks/${man.body.task.id}/restore`);
  const restRem = [...fakeStore.values()].filter((d) => d.taskId === man.body.task.id).length;
  check("restaurar reprograma recordatorios", rest.body.task.isArchived === false && restRem === 2, { restRem });
  check("archived inválido -> 400", (await api("GET", "/tasks?archived=quizas")).status === 400);
  check("eliminar tarea manual", (await api("DELETE", `/tasks/${man.body.task.id}`)).status === 200);

  console.log("Módulos anteriores con UID");
  check("profile", (await api("GET", "/profile")).status === 200);
  check("peers (ahora async)", (await api("GET", "/peers")).status === 200);
  const adminId = adminMe.body.id;
  check("solicitud de conexión con UID", (await api("POST", "/connections/requests", { targetUserId: adminId })).status === 201);
  check("subjects", (await api("POST", "/subjects", { name: "Construcción de Software", code: "CS-401", credits: 3, semester: 4, teacher: "Diego", color: "#AA0330", schedule: [] })).status === 201);

  // ---------- Módulos migrados de memoria a Firestore ----------
  const anaId = me.body.id;
  const betoToken = await signUp(`beto${run}@uni.edu.co`);
  const asAdmin = (method: string, path: string, body?: unknown) => api(method, path, body, adminToken);
  const asBeto = (method: string, path: string, body?: unknown) => api(method, path, body, betoToken);
  const inStore = (prefix: string) => [...fakeStore.keys()].filter((k) => k.startsWith(prefix));

  console.log("Materias y notas (Firestore)");
  const subj = await api("POST", "/subjects", { name: "Cálculo", code: "MAT-101", credits: 4, semester: 4, schedule: [{ day: "Lunes", startTime: "08:00", endTime: "10:00", room: "B-201" }] });
  const subjId = subj.body.subject?.id;
  check("crear materia -> 201 y queda en users/{uid}/subjects", subj.status === 201 && inStore(`users/${anaId}/subjects/${subjId}`).length === 1, subj.body);
  check("código duplicado en el semestre -> 409", (await api("POST", "/subjects", { name: "Otra", code: "mat-101", credits: 3, semester: 4 })).status === 409);
  const g1 = await api("POST", `/subjects/${subjId}/grades`, { title: "Parcial 1", score: 4, weight: 40, corte: 1 });
  check("crear nota -> 201", g1.status === 201, g1.body);
  check("porcentajes > 100% -> 400", (await api("POST", `/subjects/${subjId}/grades`, { title: "Final", score: 3, weight: 70 })).status === 400);
  const detail = await api("GET", `/subjects/${subjId}`);
  check("detalle con resumen de notas", detail.body.gradesSummary?.count === 1 && detail.body.gradesSummary.weightedAverage === 4 && detail.body.room === "B-201", detail.body);
  const listS = await api("GET", "/subjects?semester=4");
  check("lista de materias con promedio", listS.body.data.find((s: any) => s.id === subjId)?.currentAverage === 4, listS.body);
  check("consolidado de notas con nombre de materia", (await api("GET", "/grades")).body.data.some((g: any) => g.subjectName === "Cálculo"));
  const gradeId = g1.body.grade.id;
  const pg = await api("PATCH", `/grades/${gradeId}`, { weight: 50, corte: null });
  check("editar nota (quita el corte)", pg.status === 200 && pg.body.grade.weight === 50 && pg.body.grade.corte === undefined, pg.body);
  check("progreso de la materia", (await api("GET", `/subjects/${subjId}/progress`)).body.evaluatedPercentage === 50);
  check("promedio general (PGA)", (await api("GET", "/grades/average")).body.pga === 4);
  check("materia de otro usuario -> 404", (await asAdmin("GET", `/subjects/${subjId}`)).status === 404);
  check("nota de otro usuario -> 404", (await asAdmin("PATCH", `/grades/${gradeId}`, { score: 1 })).status === 404);
  check("tarea con materia ajena -> 404", (await asAdmin("POST", "/tasks", { title: "x", type: "tarea", priority: "media", subjectId: subjId })).status === 404);

  console.log("Apuntes (Firestore)");
  const note = await api("POST", "/notes", { title: "Derivadas", content: "Regla de la cadena", subjectId: subjId, tags: ["Cálculo"] });
  const noteId = note.body.note?.id;
  check("crear apunte con materia -> 201", note.status === 201 && note.body.note.subjectId === subjId, note.body);
  check("editar apunte ajeno -> 403", (await asAdmin("PATCH", `/notes/${noteId}`, { title: "hack" })).status === 403);
  check("apunte inexistente -> 404", (await api("PATCH", "/notes/00000000-0000-4000-8000-000000000000", { title: "x" })).status === 404);
  check("fijar apunte", (await api("PATCH", `/notes/${noteId}`, { isPinned: true })).status === 200);
  check("listar y buscar apuntes", (await api("GET", "/notes?search=cadena")).body.meta.total === 1);

  console.log("Borrado en cascada");
  const delS = await api("DELETE", `/subjects/${subjId}`);
  check("borrar materia borra sus notas", delS.status === 200 && delS.body.deletedGrades === 1 && inStore(`users/${anaId}/grades/`).length === 0, delS.body);
  check("el apunte queda sin materia", (await api("GET", "/notes")).body.data.find((n: any) => n.id === noteId)?.subjectId === null);
  check("la materia ya no existe -> 404", (await api("GET", `/subjects/${subjId}`)).status === 404);
  check("borrar apunte", (await api("DELETE", `/notes/${noteId}`)).status === 200 && inStore(`notes/${noteId}`).length === 0);

  console.log("Perfil (Firestore)");
  const pp = await api("PATCH", "/profile", { name: "Ana María", career: "Ingeniería de Sistemas", semester: 4, bio: "Hola" });
  check("actualizar perfil y nombre", pp.status === 200 && pp.body.profile.career === "Ingeniería de Sistemas" && pp.body.profile.name === "Ana María", pp.body);
  check("el nombre también cambia en /auth/me", (await api("GET", "/auth/me")).body.name === "Ana María");
  const pb = await api("PATCH", "/profile", { bio: "" });
  check("bio vacía la borra", pb.status === 200 && pb.body.profile.bio === undefined && fakeStore.get(`profiles/${anaId}`)?.bio === null, pb.body);
  check("perfil sin documento usa valores por defecto", (await asBeto("GET", "/profile")).body.semester === 1);

  console.log("Conexiones (Firestore)");
  const pend = await asAdmin("GET", "/connections");
  const req0 = pend.body.pendingRequests.find((r: any) => r.peer.id === anaId);
  check("solicitud recibida con datos del perfil", req0?.direction === "received" && req0.peer.career === "Ingeniería de Sistemas", pend.body);
  check("solicitud duplicada -> 409", (await api("POST", "/connections/requests", { targetUserId: adminId })).status === 409);
  check("solo el destinatario responde -> 403", (await api("PATCH", `/connections/requests/${req0.requestId}`, { action: "accept" })).status === 403);
  check("aceptar solicitud", (await asAdmin("PATCH", `/connections/requests/${req0.requestId}`, { action: "accept" })).body.status === "accepted");
  check("guarda participants para array-contains", JSON.stringify(fakeStore.get(`connections/${req0.requestId}`)?.participants) === JSON.stringify([anaId, adminId]));
  check("estadística de conexiones del perfil", (await api("GET", "/profile")).body.stats.connections === 1);
  const peers = await asBeto("GET", "/peers");
  check("peers muestra el estado de conexión", peers.status === 200 && peers.body.data.some((p: any) => p.id === anaId && p.connectionStatus === "none"), peers.body);
  check("eliminar conexión", (await api("DELETE", `/connections/${req0.requestId}`)).status === 200 && (await api("GET", "/connections")).body.connections.length === 0);

  console.log("Grupos de estudio (Firestore)");
  const grp = await api("POST", "/study-groups", { name: "Cálculo en grupo", subjectName: "Cálculo", description: "Repaso de parciales", maxMembers: 2 });
  const groupId = grp.body.group?.id;
  check("crear grupo", grp.status === 201 && grp.body.group.membersCount === 1, grp.body);
  check("unirse al grupo", (await asAdmin("POST", `/study-groups/${groupId}/join`)).body.membersCount === 2);
  check("unirse dos veces -> 409", (await asAdmin("POST", `/study-groups/${groupId}/join`)).status === 409);
  check("cupo lleno -> 400", (await asBeto("POST", `/study-groups/${groupId}/join`)).status === 400);
  check("mis grupos con array-contains", (await asAdmin("GET", "/study-groups?onlyMine=true")).body.data.length === 1 && (await asBeto("GET", "/study-groups?onlyMine=true")).body.data.length === 0);
  const gd = await asBeto("GET", `/study-groups/${groupId}`);
  check("detalle con nombres de los miembros", gd.body.members.length === 2 && gd.body.members.some((m: any) => m.name === "Ana María"), gd.body);
  await api("DELETE", `/study-groups/${groupId}/leave`);
  check("sale el admin: el rol pasa al siguiente", (await asBeto("GET", `/study-groups/${groupId}`)).body.members[0].role === "admin");
  await asAdmin("DELETE", `/study-groups/${groupId}/leave`);
  check("grupo vacío se elimina", (await asBeto("GET", `/study-groups/${groupId}`)).status === 404);

  console.log("Tips (Firestore)");
  const tipsList = await api("GET", "/tips");
  check("catálogo sembrado en tips/", tipsList.body.total === 5 && inStore("tips/").length === 5, tipsList.body);
  const tipId = tipsList.body.data[0].id;
  check("guardar tip", (await api("POST", `/tips/${tipId}/save`)).status === 201 && inStore(`users/${anaId}/savedTips/${tipId}`).length === 1);
  check("guardar dos veces -> 409", (await api("POST", `/tips/${tipId}/save`)).status === 409);
  check("solo guardados", (await api("GET", "/tips?savedOnly=true")).body.total === 1 && (await asBeto("GET", "/tips?savedOnly=true")).body.total === 0);
  check("detalle marca isSaved", (await api("GET", `/tips/${tipId}`)).body.isSaved === true);
  check("etiquetas", (await api("GET", "/tips/tags")).body.tags.length > 0);
  check("quitar de guardados", (await api("DELETE", `/tips/${tipId}/save`)).status === 200);
  check("quitar otra vez -> 404", (await api("DELETE", `/tips/${tipId}/save`)).status === 404);

  console.log("Reconexión y desconexión");
  fakeStore.get(ip)!.lastSyncAt = new Date(Date.now() - 120_000);
  const { integrationService } = require(`${SRC}/services/integration.service`);
  const { encrypt } = require(`${SRC}/utils/crypto`);
  fakeStore.get(ip)!.secret = encrypt(url.replace("authtoken=abc", "authtoken=revoked"));
  const bad = await api("POST", "/integrations/moodle/sync");
  const integ1 = (await api("GET", "/integrations")).body.data.find((i: any) => i.provider === "moodle");
  check("token revocado -> needs_reauth", bad.status === 400 && integ1.status === "needs_reauth", { bad: bad.body, integ1 });
  const job = await integrationService.syncAllActive();
  check("el job salta las que necesitan reconexión", job.ok === 0 && job.failed === 0, job);
  const del = await api("DELETE", "/integrations/moodle");
  check("desconectar borra solo las importadas", del.body.deletedTasks === 4 && (await api("GET", "/tasks")).body.tasks.every((t: any) => t.source === "MANUAL"), del.body);
  check("classroom sin config -> 400 claro", (await api("POST", "/integrations/classroom", { serverAuthCode: "4/abc" })).status === 400);

  console.log(`\n${pass} ok, ${failCount} fallos`);
  server.close();
  process.exit(failCount ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
