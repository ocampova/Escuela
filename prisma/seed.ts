/**
 * Datos de DEMOSTRACIÓN. Todas las personas, cédulas y montos son ficticios.
 * Las fechas se calculan a partir de hoy para que el prototipo siempre tenga
 * actividad reciente y próxima.
 */
import { PrismaClient, AttendanceStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "demo1234";

let seed = 7;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

/** Fecha a `offset` días de hoy, a la hora indicada en Costa Rica (UTC-6). */
function day(offset: number, hour = 0, minute = 0) {
  const base = new Date(Date.now() - 6 * 3600_000); // "ahora" en Costa Rica
  base.setUTCDate(base.getUTCDate() + offset);
  const key = base.toISOString().slice(0, 10);
  return new Date(`${key}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-06:00`);
}

/** Mueve un desplazamiento de sábado/domingo al viernes anterior o lunes siguiente. */
function weekday(offset: number) {
  const dow = day(offset, 12).getUTCDay();
  return dow === 6 ? offset - 1 : dow === 0 ? offset + 1 : offset;
}

const PRESCHOOL_MATERIALS = [
  "1 caja plástica transparente rotulada, para los materiales de Artes Plásticas",
  "1 caja de pinturas (Pintolán) y delantal",
  "3 pinceles gruesos",
  "4 láminas de papel periódico blanco",
  "2 resmas de 500 hojas bond",
  "2 paquetes de hojas duras (opalina blanca)",
  "1 paquete de papel de colores variados",
  "3 unidades de plastilina Play-Doh",
  "2 gomas en barra grandes (Pritt), 1 en la cartuchera",
  "1 goma líquida pequeña",
  "2 pinturas acrílicas de 250 ml (cualquier color)",
  "1 caja de lápices de color de 12 unidades",
  "1 caja de lápices de grafito #2",
  "1 caja de marcadores acrílicos, rotulados con el nombre",
  "Maquinilla con depósito y borrador, rotulados con el nombre",
  "1 libro de cuentos infantiles",
  "1 ábaco contador",
  "1 cartuchera",
  "2 fólderes plásticos emplasticados y rotulados con el nombre (inglés y español)",
  "Tijeras de punta redonda",
  "Libro de lectura «Cheito 2 Primeras Lecturas» (solo Preparatoria)",
  "2 cuadernos grandes de 100 hojas, cosidos, emplasticados y rotulados: rojo para lectoescritura, amarillo para matemáticas (solo Preparatoria)",
  "Instrumento solicitado por la docente de música, se vende en la institución (solo Preparatoria)",
  "Bulto para llevar y traer artículos personales",
  "Pasta dental, cepillo de dientes y pañito, rotulados con el nombre",
  "2 Lysol grandes",
  "1 paquete grande de toallas húmedas",
  "1 colonia Mennen",
].join("\n");

// PNG de 1×1 px como comprobante de demostración
const DEMO_RECEIPT = new Uint8Array(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
);

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

async function main() {
  await prisma.$transaction([
    prisma.paymentReport.deleteMany(),
    prisma.applicantDocument.deleteMany(),
    prisma.applicant.deleteMany(),
    prisma.authToken.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.charge.deleteMany(),
    prisma.feeConcept.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.announcementRead.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.event.deleteMany(),
    prisma.authorizedPickup.deleteMany(),
    prisma.studentGuardian.deleteMany(),
    prisma.student.deleteMany(),
    prisma.section.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.level.deleteMany(),
    prisma.schoolYear.deleteMany(),
    prisma.user.deleteMany(),
    prisma.school.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  const year = now.getFullYear();

  const school = await prisma.school.create({
    data: {
      name: "San Cayetano School",
      shortName: "SCS",
      city: "Grecia, Costa Rica",
      email: "scayetanoschool@gmail.com",
      // Cuenta de DEMOSTRACIÓN. La cuenta real se configura en Configuración › Pagos.
      bankName: "Banco de Costa Rica (BCR)",
      bankAccountHolder: "Cuenta de demostración",
      bankHolderId: "0-0000-0000",
      bankIban: "CR00 0000 0000 0000 0000 00",
      paymentNote: "Reporte cada depósito en la plataforma indicando la fecha y el nombre completo del estudiante.",
    },
  });

  const user = (role: "ADMIN" | "STAFF" | "TEACHER" | "GUARDIAN", name: string, email: string, phone?: string) =>
    prisma.user.create({ data: { schoolId: school.id, role, name, email, phone, passwordHash } });

  const directora = await user("ADMIN", "Laura Méndez Solís", "directora@demo.scs.cr", "8800-1001");
  await user("STAFF", "Andrea Quesada Rojas", "secretaria@demo.scs.cr", "8800-1002");
  const tMariela = await user("TEACHER", "Mariela Vargas Alfaro", "mvargas@demo.scs.cr");
  const tSofia = await user("TEACHER", "Sofía Chaves Mora", "schaves@demo.scs.cr");
  const tDaniel = await user("TEACHER", "Daniel Araya Castro", "daraya@demo.scs.cr");
  const tNatalia = await user("TEACHER", "Natalia Jiménez Ulate", "njimenez@demo.scs.cr");

  const sy = await prisma.schoolYear.create({
    data: {
      schoolId: school.id,
      name: `Curso lectivo ${year}`,
      startsOn: new Date(Date.UTC(year, 1, 2)),
      endsOn: new Date(Date.UTC(year, 11, 11)),
      active: true,
    },
  });

  // Datos públicos de los folletos 2027 de la escuela
  const pre = await prisma.level.create({
    data: {
      schoolId: school.id,
      name: "Preescolar",
      order: 1,
      schedule: "Lunes a viernes de 8:00 a. m. a 12:30 p. m.",
      phone: "2444-0484 / 8885-0761",
      address: "100 m noroeste del Templo Católico de Santa Gertrudis Norte, Grecia.",
      materials: PRESCHOOL_MATERIALS,
    },
  });
  const pri = await prisma.level.create({
    data: {
      schoolId: school.id,
      name: "Primaria",
      order: 2,
      schedule: "Lunes a jueves de 7:30 a. m. a 2:45 p. m.\nViernes de 7:30 a. m. a 1:50 p. m.",
      phone: "2444-2323 / 8643-0452",
      address: "De la Estación de Servicio Santa Lucía, en Santa Gertrudis Norte, 200 m norte y 500 m oeste, Grecia.",
    },
  });
  // gInter = Kinder, gTrans = Preparatoria
  const gInter = await prisma.grade.create({ data: { levelId: pre.id, name: "Kinder", order: 1 } });
  const gTrans = await prisma.grade.create({ data: { levelId: pre.id, name: "Preparatoria", order: 2 } });
  const gPrimero = await prisma.grade.create({ data: { levelId: pri.id, name: "Primer grado", order: 1 } });
  for (const [i, name] of ["Segundo grado", "Tercer grado", "Cuarto grado", "Quinto grado", "Sexto grado"].entries()) {
    await prisma.grade.create({ data: { levelId: pri.id, name, order: i + 2 } });
  }

  const section = (gradeId: string, name: string, color: string, teacherId: string) =>
    prisma.section.create({ data: { gradeId, schoolYearId: sy.id, name, color, teacherId } });
  const sInter = await section(gInter.id, "A", "orange", tMariela.id);
  const sTransA = await section(gTrans.id, "A", "green", tSofia.id);
  const sTransB = await section(gTrans.id, "B", "blue", tNatalia.id);
  const sPrimero = await section(gPrimero.id, "A", "orange", tDaniel.id);

  // Familias ficticias: [apellidos, encargados, hijos]
  type Kid = { first: string; section: string; birthYear: number; allergies?: string };
  const families: { last: string; guardians: [string, string, string][]; kids: Kid[]; demo?: boolean }[] = [
    {
      last: "Rodríguez Campos",
      demo: true,
      guardians: [
        ["Carolina Campos Herrera", "familia@demo.scs.cr", "Madre"],
        ["Esteban Rodríguez Brenes", "erodriguez@demo.scs.cr", "Padre"],
      ],
      kids: [
        { first: "Mateo", section: sTransA.id, birthYear: year - 6, allergies: "Maní" },
        { first: "Valeria", section: sPrimero.id, birthYear: year - 7 },
      ],
    },
    { last: "Alvarado Soto", guardians: [["Paola Soto Méndez", "psoto@demo.scs.cr", "Madre"]], kids: [{ first: "Emma", section: sTransA.id, birthYear: year - 6 }] },
    { last: "Murillo Zúñiga", guardians: [["Jorge Murillo Arce", "jmurillo@demo.scs.cr", "Padre"]], kids: [{ first: "Santiago", section: sTransA.id, birthYear: year - 6 }] },
    { last: "Salas Picado", guardians: [["Marcela Picado Ruiz", "mpicado@demo.scs.cr", "Madre"]], kids: [{ first: "Isabella", section: sTransA.id, birthYear: year - 6, allergies: "Lactosa" }] },
    { last: "Fallas Monge", guardians: [["Diego Fallas León", "dfallas@demo.scs.cr", "Padre"]], kids: [{ first: "Thiago", section: sTransA.id, birthYear: year - 6 }, { first: "Lucía", section: sInter.id, birthYear: year - 4 }] },
    { last: "Cordero Víquez", guardians: [["Rebeca Víquez Sáenz", "rviquez@demo.scs.cr", "Madre"]], kids: [{ first: "Sofía", section: sTransB.id, birthYear: year - 6 }] },
    { last: "Badilla Porras", guardians: [["Kevin Badilla Mora", "kbadilla@demo.scs.cr", "Padre"]], kids: [{ first: "Gael", section: sTransB.id, birthYear: year - 6 }] },
    { last: "Esquivel Rojas", guardians: [["Natalia Rojas Cubero", "nrojas@demo.scs.cr", "Madre"]], kids: [{ first: "Mía", section: sTransB.id, birthYear: year - 6 }] },
    { last: "Hidalgo Calvo", guardians: [["Ana Calvo Segura", "acalvo@demo.scs.cr", "Madre"]], kids: [{ first: "Sebastián", section: sTransB.id, birthYear: year - 6 }] },
    { last: "Ramírez Elizondo", guardians: [["Luis Ramírez Torres", "lramirez@demo.scs.cr", "Padre"]], kids: [{ first: "Amanda", section: sInter.id, birthYear: year - 4 }] },
    { last: "Vega Barquero", guardians: [["Silvia Barquero Núñez", "sbarquero@demo.scs.cr", "Madre"]], kids: [{ first: "Joaquín", section: sInter.id, birthYear: year - 4 }] },
    { last: "Castro Navarro", guardians: [["Felipe Castro Ortiz", "fcastro@demo.scs.cr", "Padre"]], kids: [{ first: "Camila", section: sInter.id, birthYear: year - 4 }] },
    { last: "Mora Sibaja", guardians: [["Daniela Sibaja Vindas", "dsibaja@demo.scs.cr", "Madre"]], kids: [{ first: "Benjamín", section: sPrimero.id, birthYear: year - 7 }] },
    { last: "León Arias", guardians: [["Roberto León Pérez", "rleon@demo.scs.cr", "Padre"]], kids: [{ first: "Victoria", section: sPrimero.id, birthYear: year - 7 }] },
    { last: "Solano Ugalde", guardians: [["Mónica Ugalde Ramos", "mugalde@demo.scs.cr", "Madre"]], kids: [{ first: "Martín", section: sPrimero.id, birthYear: year - 7, allergies: "Penicilina" }] },
  ];

  const allStudents: { id: string; owing: boolean; demo: boolean }[] = [];
  const guardianUsers: string[] = [];
  let cedula = 118340000;
  for (const [fi, fam] of families.entries()) {
    const gUsers = [];
    for (const [gi, [name, email]] of fam.guardians.entries()) {
      const u = await user("GUARDIAN", name, email, `8${String(700 + fi * 3 + gi).padStart(3, "0")}-${String(2000 + fi * 7 + gi * 311).slice(-4)}`);
      gUsers.push(u);
      guardianUsers.push(u.id);
    }
    for (const kid of fam.kids) {
      cedula += 137;
      const student = await prisma.student.create({
        data: {
          sectionId: kid.section,
          firstName: kid.first,
          lastName: fam.last,
          idNumber: `1-${String(cedula).slice(0, 4)}-${String(cedula).slice(4, 8)}`,
          birthDate: new Date(Date.UTC(kid.birthYear, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27))),
          bloodType: ["O+", "A+", "B+", "O-", "A-"][Math.floor(rand() * 5)],
          allergies: kid.allergies ?? null,
          guardians: {
            create: gUsers.map((u, i) => ({ userId: u.id, relationship: fam.guardians[i][2], isPrimary: i === 0 })),
          },
          pickups: {
            create: [
              { name: fam.guardians[0][0], idNumber: `1-${1000 + fi}-${2000 + fi * 3}`, relationship: fam.guardians[0][2] },
              { name: `Abuela ${fam.last.split(" ")[0]}`, idNumber: `2-${1500 + fi}-${3000 + fi * 5}`, relationship: "Abuela" },
            ],
          },
        },
      });
      allStudents.push({ id: student.id, owing: fi === 3 || fi === 9 || fi === 12, demo: !!fam.demo });
    }
  }

  // Asistencia: últimos 15 días hábiles (incluye hoy si es día hábil)
  const studentRows = await prisma.student.findMany({ include: { section: true } });
  const teacherBySection = new Map([[sInter.id, tMariela.id], [sTransA.id, tSofia.id], [sTransB.id, tNatalia.id], [sPrimero.id, tDaniel.id]]);
  for (let off = -21; off <= 0; off++) {
    const d = day(off, 12);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    // Hoy: Preparatoria B todavía no ha pasado lista (estado útil para la demo)
    for (const s of studentRows) {
      if (off === 0 && s.sectionId === sTransB.id) continue;
      const r = rand();
      const status: AttendanceStatus = r < 0.86 ? "PRESENT" : r < 0.92 ? "LATE" : r < 0.97 ? "ABSENT" : "EXCUSED";
      await prisma.attendance.create({
        data: {
          studentId: s.id,
          date: new Date(d.toISOString().slice(0, 10) + "T00:00:00.000Z"),
          status,
          note: status === "EXCUSED" ? "Cita médica" : null,
          recordedById: teacherBySection.get(s.sectionId),
        },
      });
    }
  }

  // Cobros (precios 2027 de la escuela)
  const conceptos = {
    matricula: await prisma.feeConcept.create({ data: { schoolId: school.id, name: "Matrícula", defaultAmount: 150000, earlyAmount: 120000, earlyMonths: [8, 9], dueNote: "Descuento en agosto y setiembre." } }),
    mensualidadPre: await prisma.feeConcept.create({ data: { schoolId: school.id, name: "Mensualidad", defaultAmount: 148000, recurring: true, levelId: pre.id } }),
    mensualidadPri: await prisma.feeConcept.create({ data: { schoolId: school.id, name: "Mensualidad", defaultAmount: 192000, recurring: true, levelId: pri.id } }),
    materialesPre: await prisma.feeConcept.create({ data: { schoolId: school.id, name: "Materiales", defaultAmount: 40000, levelId: pre.id, dueNote: "Antes del 15 de diciembre." } }),
    materialesPri: await prisma.feeConcept.create({ data: { schoolId: school.id, name: "Materiales", defaultAmount: 50000, levelId: pri.id, dueNote: "Antes del 15 de diciembre." } }),
    robotica: await prisma.feeConcept.create({ data: { schoolId: school.id, name: "Paquete de robótica Tecnikids", defaultAmount: 85, currency: "USD", levelId: pri.id, dueNote: "Se cancela en diciembre." } }),
  };
  const preSections = new Set([sInter.id, sTransA.id, sTransB.id]);
  const studentSection = new Map((await prisma.student.findMany({ select: { id: true, sectionId: true } })).map((x) => [x.id, x.sectionId]));

  const lastMonth = Math.min(now.getMonth(), 11); // 0-based, mensualidades de feb..mes actual
  const methods: PaymentMethod[] = ["DEPOSIT", "TRANSFER", "TRANSFER", "SINPE", "DEPOSIT"];
  for (const st of allStudents) {
    const isPre = preSections.has(studentSection.get(st.id)!);
    const monthly = isPre ? conceptos.mensualidadPre : conceptos.mensualidadPri;
    const mats = isPre ? conceptos.materialesPre : conceptos.materialesPri;
    const charges = [
      { conceptId: conceptos.matricula.id, description: "Matrícula", period: `${year}`, amount: 150000, dueDate: new Date(Date.UTC(year, 0, 20)) },
      { conceptId: mats.id, description: "Materiales del curso", period: `${year}`, amount: mats.defaultAmount, dueDate: new Date(Date.UTC(year, 1, 15)) },
    ];
    for (let m = 1; m <= Math.max(lastMonth, 1); m++) {
      charges.push({
        conceptId: monthly.id,
        description: `Mensualidad ${MONTHS[m]}`,
        period: `${year}-${String(m + 1).padStart(2, "0")}`,
        amount: monthly.defaultAmount,
        dueDate: new Date(Date.UTC(year, m, 10)),
      });
    }
    for (const c of charges) await prisma.charge.create({ data: { studentId: st.id, ...c } });

    // Próximos cobros del curso siguiente (vencen en diciembre)
    await prisma.charge.create({
      data: { studentId: st.id, conceptId: mats.id, description: `Materiales ${year + 1}`, period: `${year + 1}`, amount: mats.defaultAmount, dueDate: new Date(Date.UTC(year, 11, 15)) },
    });
    if (!isPre) {
      await prisma.charge.create({
        data: { studentId: st.id, conceptId: conceptos.robotica.id, description: `Robótica Tecnikids ${year + 1}`, period: `${year + 1}`, amount: 85, currency: "USD", dueDate: new Date(Date.UTC(year, 11, 15)) },
      });
    }

    // Pagos: todo pagado excepto el mes actual (familia demo) o los dos últimos (morosos)
    const unpaid = st.owing ? 2 : st.demo ? 1 : now.getDate() > 10 ? 0 : 1;
    const paidCharges = charges.slice(0, charges.length - unpaid);
    for (const c of paidCharges) {
      const paid = new Date(c.dueDate);
      paid.setUTCDate(paid.getUTCDate() - Math.floor(rand() * 6));
      const method = methods[Math.floor(rand() * methods.length)];
      await prisma.payment.create({
        data: {
          studentId: st.id,
          amount: c.amount,
          method,
          reference: method === "CASH" ? null : `${method === "SINPE" ? "SP" : "BCR"}${Math.floor(10000000 + rand() * 89999999)}`,
          paidAt: paid,
          note: c.description,
        },
      });
    }
  }

  // Avisos
  const ann = async (
    title: string,
    body: string,
    daysAgo: number,
    audience: "SCHOOL" | "LEVEL" | "SECTION",
    target: { levelId?: string; sectionId?: string },
    authorId: string,
    readRate: number,
  ) => {
    const a = await prisma.announcement.create({
      data: {
        schoolId: school.id,
        authorId,
        title,
        body,
        audience,
        levelId: target.levelId,
        sectionId: target.sectionId,
        createdAt: day(-daysAgo, 7 + (daysAgo % 5), 15),
      },
    });
    for (const g of guardianUsers) {
      if (rand() < readRate) {
        await prisma.announcementRead.create({
          data: { announcementId: a.id, userId: g, readAt: day(-daysAgo + 1, 18), acknowledgedAt: day(-daysAgo + 1, 18, 5) },
        });
      }
    }
    return a;
  };

  await ann(
    "Matrícula 2027: proceso y fechas",
    "Estimadas familias:\n\nLes recordamos que el proceso de matrícula para el próximo curso lectivo inicia el 1 de diciembre. Las familias actuales tienen prioridad hasta el 15 de diciembre.\n\nRequisitos: formulario actualizado, constancia de vacunas al día y estar al día con las mensualidades.\n\nCualquier consulta, con gusto les atiende Secretaría.",
    12,
    "SCHOOL",
    {},
    directora.id,
    0.9,
  );
  await ann(
    "Gira educativa al Museo de los Niños",
    "La sección de Primer grado visitará el Museo de los Niños el próximo viernes. Saldremos a las 7:30 a.m. y regresaremos a la 1:00 p.m.\n\nCosto: ₡6 000 (incluye transporte y entrada). Enviar merienda y botella de agua.\n\nPor favor confirmen con «Enterado» para autorizar la participación.",
    3,
    "SECTION",
    { sectionId: sPrimero.id },
    tDaniel.id,
    0.55,
  );
  await ann(
    "Semana de la lectura en Preescolar",
    "Del lunes al viernes de la próxima semana celebraremos la Semana de la lectura. Cada niño puede traer su cuento favorito el día que le corresponda; enviaremos el rol por la agenda.\n\nEl viernes tendremos un cuentacuentos invitado.",
    2,
    "LEVEL",
    { levelId: pre.id },
    directora.id,
    0.45,
  );
  await ann(
    "Uniforme de educación física",
    "A partir del próximo lunes, los días de educación física (martes y jueves) los niños deben venir con el uniforme deportivo y tenis. Por favor marcar todas las prendas con el nombre.",
    6,
    "SCHOOL",
    {},
    directora.id,
    0.8,
  );
  await ann(
    "Preparatoria A: materiales para el proyecto de reciclaje",
    "Para el proyecto «Cuidamos nuestro planeta» necesitamos que cada niño traiga el miércoles: 2 tubos de papel higiénico, 1 caja de cereal vacía y tapas plásticas limpias.\n\n¡Muchas gracias!",
    1,
    "SECTION",
    { sectionId: sTransA.id },
    tSofia.id,
    0.3,
  );

  // Eventos
  const ev = (title: string, offset: number, opts: Partial<{ hour: number; allDay: boolean; kind: string; description: string; audience: "SCHOOL" | "LEVEL" | "SECTION"; levelId: string; sectionId: string; endHour: number }> = {}) =>
    prisma.event.create({
      data: {
        schoolId: school.id,
        title,
        description: opts.description,
        startsAt: day(weekday(offset), opts.hour ?? 0),
        endsAt: opts.endHour ? day(weekday(offset), opts.endHour) : null,
        allDay: opts.allDay ?? opts.hour === undefined,
        kind: opts.kind ?? "evento",
        audience: opts.audience ?? "SCHOOL",
        levelId: opts.levelId,
        sectionId: opts.sectionId,
      },
    });
  await ev("Reunión de padres de Preparatoria", 2, { hour: 17, endHour: 18, kind: "reunion", audience: "LEVEL", levelId: pre.id, description: "Aula de Preparatoria A. Entrega de informes al hogar del periodo." });
  await ev("Gira al Museo de los Niños", 4, { hour: 7, endHour: 13, kind: "gira", audience: "SECTION", sectionId: sPrimero.id });
  await ev("Semana de la lectura", 7, { kind: "actividad", audience: "LEVEL", levelId: pre.id });
  await ev("Vence mensualidad", 10 - now.getDate() > 0 ? 10 - now.getDate() : 30 - now.getDate() + 10, { kind: "pago", description: "Deposite o transfiera y reporte el pago en la plataforma." });
  await ev("Festival de fin de año", 24, { hour: 9, endHour: 12, kind: "evento", description: "Gimnasio de la escuela. Presentaciones de todas las secciones." });
  await ev("Último día de clases", 31, { kind: "feriado" });
  await ev("Consejo de profesores (no hay lecciones)", 14, { kind: "feriado" });

  // Una familia todavía sin activar su cuenta (invitación pendiente)
  await prisma.user.update({ where: { email: "mugalde@demo.scs.cr" }, data: { passwordHash: null } });

  // Solicitudes de matrícula en línea
  const nextYear = String(now.getMonth() >= 6 ? year + 1 : year);
  const apps: [string, string, string, number, string, string, string, "NEW" | "CONTACTED" | "VISIT" | "ACCEPTED", number, string | null][] = [
    ["Emilia", "Araya Quesada", gTrans.id, year - 5, "Gabriela Quesada Solís", "gquesada@demo.scs.cr", "8812-4410", "NEW", 0, "Nos interesa mucho el enfoque bilingüe. ¿Tienen transporte desde Grecia centro?"],
    ["Tomás", "Villalobos Rojas", gInter.id, year - 3, "Andrés Villalobos Mora", "avillalobos@demo.scs.cr", "8723-9051", "NEW", 1, null],
    ["Renata", "Chacón Alfaro", gPrimero.id, year - 6, "María José Alfaro Ruiz", "mjalfaro@demo.scs.cr", "8654-1187", "CONTACTED", 4, null],
    ["Lucas", "Montero Salas", gTrans.id, year - 5, "Priscilla Salas Vega", "psalas@demo.scs.cr", "8899-3020", "VISIT", 6, null],
  ];
  for (const [first, last, gradeId, by, gName, gEmail, gPhone, status, ago, message] of apps) {
    await prisma.applicant.create({
      data: {
        schoolId: school.id,
        gradeId,
        forYear: nextYear,
        status,
        childFirstName: first,
        childLastName: last,
        childBirthDate: new Date(Date.UTC(by, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27))),
        guardianName: gName,
        guardianEmail: gEmail,
        guardianPhone: gPhone,
        relationship: gName.startsWith("Andrés") ? "Padre" : "Madre",
        message,
        staffNotes: status === "VISIT" ? "Visita agendada para el jueves a las 9:00 a. m." : null,
        createdAt: day(-ago, 9),
      },
    });
  }

  // Un pago reportado por la familia demo, pendiente de revisión
  const valeria = allStudents.find((x) => x.demo && preSections.has(studentSection.get(x.id)!) === false)!;
  const carolina = await prisma.user.findUniqueOrThrow({ where: { email: "familia@demo.scs.cr" } });
  await prisma.paymentReport.create({
    data: {
      studentId: valeria.id,
      reportedById: carolina.id,
      amount: 192000,
      method: "TRANSFER",
      reference: "BCR20261109",
      paidAt: day(-1, 12),
      concept: `Mensualidad ${MONTHS[now.getMonth()]}`,
      fileName: "comprobante-demo.png",
      mimeType: "image/png",
      fileData: DEMO_RECEIPT,
      createdAt: day(0, 8),
    },
  });

  console.log(`Seed listo. Contraseña de todas las cuentas: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
