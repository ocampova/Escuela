/**
 * Datos de DEMOSTRACIÓN. Todas las personas, cédulas y montos son ficticios.
 * Las fechas se calculan a partir de hoy para que el prototipo siempre tenga
 * actividad reciente y próxima.
 */
import { PrismaClient, AttendanceStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { deflateSync } from "node:zlib";

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

/** Ilustración PNG simple (sin fotos reales de niños): cielo, sol, colinas y figuras de colores. */
function demoPicture(variant: number, w = 800, h = 600) {
  const palettes = [
    [[253, 238, 230], [217, 88, 31], [59, 143, 49], [31, 127, 184]],
    [[229, 242, 250], [31, 127, 184], [217, 88, 31], [59, 143, 49]],
    [[234, 245, 231], [59, 143, 49], [31, 127, 184], [217, 88, 31]],
  ];
  const [bg, a, b, c] = palettes[variant % 3];
  const raw = Buffer.alloc((w * 3 + 1) * h);
  const sunX = w * (0.2 + 0.15 * (variant % 4)), sunY = h * 0.25, sunR = h * 0.1;
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      let col = bg;
      const hill1 = h * 0.62 + Math.sin(x / (90 + variant * 7) + variant) * 40;
      const hill2 = h * 0.75 + Math.cos(x / 120 + variant * 2) * 30;
      if ((x - sunX) ** 2 + (y - sunY) ** 2 < sunR ** 2) col = a;
      if (y > hill1) col = b;
      if (y > hill2) col = c;
      for (let k = 0; k < 3; k++) {
        const fx = w * (0.3 + k * 0.2), fy = hill2 - 50;
        if (Math.abs(x - fx) < 14 && y > fy && y < hill2) col = [255, 255, 255];
        if ((x - fx) ** 2 + (y - fy + 18) ** 2 < 400) col = [255, 255, 255];
      }
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2];
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (buf: Buffer) => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

const GIRLS = new Set(["Amanda", "Camila", "Emma", "Isabella", "Lucía", "Mía", "Sofía", "Valeria", "Victoria"]);

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
    prisma.homework.deleteMany(),
    prisma.dailyReport.deleteMany(),
    prisma.album.deleteMany(),
    prisma.permissionResponse.deleteMany(),
    prisma.absenceNotice.deleteMany(),
    prisma.pushSubscription.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationRead.deleteMany(),
    prisma.conversation.deleteMany(),
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
      messageHours: "Respondemos de lunes a viernes, de 7:30 a. m. a 3:00 p. m.",
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
          sex: GIRLS.has(kid.first) ? "F" : "M",
          nationality: kid.first === "Thiago" ? "Nicaragüense" : "Costarricense",
          enrolledOn: kid.first === "Gael" ? new Date(Date.UTC(year, 5, 15)) : new Date(Date.UTC(year, 1, 2)),
          ...(kid.first === "Santiago" ? { adaptation: "NON_SIGNIFICANT", adaptationNote: "Más tiempo en pruebas e instrucciones por pasos" } : {}),
          ...(kid.first === "Emma" ? { adaptation: "ACCESS", adaptationNote: "Ubicación al frente por baja visión" } : {}),
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
    "La sección de Primer grado visitará el Museo de los Niños el próximo viernes. Saldremos a las 7:30 a.m. y regresaremos a la 1:00 p.m.\n\nCosto: ₡6 000 (incluye transporte y entrada). Enviar merienda y botella de agua.\n\nPor favor respondan la autorización en la plataforma.",
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

  // Conversaciones de ejemplo
  const mateo = allStudents.find((x) => x.demo && preSections.has(studentSection.get(x.id)!))!;
  const chat = async (studentId: string, guardianEmail: string, channel: "TEACHER" | "OFFICE", lines: [string, string, number, number][], readByStaff: boolean) => {
    const g = await prisma.user.findUniqueOrThrow({ where: { email: guardianEmail } });
    const conv = await prisma.conversation.create({ data: { schoolId: school.id, studentId, guardianId: g.id, channel } });
    let last = new Date();
    for (const [email, body, dayOff, hour] of lines) {
      const sender = await prisma.user.findUniqueOrThrow({ where: { email } });
      last = day(dayOff, hour, 10 + Math.floor(rand() * 40));
      await prisma.message.create({ data: { conversationId: conv.id, senderId: sender.id, body, createdAt: last } });
    }
    await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: last } });
    await prisma.conversationRead.create({ data: { conversationId: conv.id, userId: g.id, lastReadAt: last } });
    if (readByStaff) {
      const staffEmail = channel === "TEACHER" ? "schaves@demo.scs.cr" : "secretaria@demo.scs.cr";
      const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: staffEmail } });
      await prisma.conversationRead.create({ data: { conversationId: conv.id, userId: staffUser.id, lastReadAt: last } });
    }
  };
  await chat(
    mateo.id,
    "familia@demo.scs.cr",
    "TEACHER",
    [
      ["familia@demo.scs.cr", "Buenos días, niña Sofía. Mateo amaneció con un poco de tos, ¿me avisa si lo nota decaído?", -1, 7],
      ["schaves@demo.scs.cr", "¡Buenos días! Claro que sí, estaré pendiente. Hoy participó muy bien en la actividad de reciclaje 😊", -1, 10],
      ["familia@demo.scs.cr", "Muchas gracias. Mañana le mando los tubos de papel para el proyecto.", -1, 18],
    ],
    true,
  );
  await chat(
    allStudents.find((x) => x.owing && preSections.has(studentSection.get(x.id)!))!.id,
    "mpicado@demo.scs.cr",
    "TEACHER",
    [["mpicado@demo.scs.cr", "Hola, niña. Isabella no podrá ir el viernes porque tiene cita en el EBAIS. ¿Me puede enviar lo que vean ese día?", 0, 7]],
    false,
  );
  await chat(
    allStudents.find((x) => x.owing && !preSections.has(studentSection.get(x.id)!))!.id,
    "dsibaja@demo.scs.cr",
    "OFFICE",
    [
      ["dsibaja@demo.scs.cr", "Buenas tardes. ¿Puedo pagar los dos meses atrasados en dos tractos?", -2, 15],
      ["secretaria@demo.scs.cr", "Buenas tardes, doña Daniela. Sí, con gusto. Puede hacer el primer depósito esta semana y el segundo antes del 30. Repórtelos en la plataforma.", -2, 16],
      ["dsibaja@demo.scs.cr", "Perfecto, muchas gracias.", 0, 8],
    ],
    false,
  );

  // La gira pide autorización: algunas familias ya respondieron
  const gira = await prisma.announcement.findFirst({ where: { title: "Gira educativa al Museo de los Niños" } });
  if (gira) {
    await prisma.announcement.update({ where: { id: gira.id }, data: { permissionQuestion: "¿Autoriza a su hijo o hija a participar en la gira al Museo de los Niños?", permissionDeadline: day(weekday(3), 12) } });
    const kids = await prisma.student.findMany({ where: { sectionId: sPrimero.id }, include: { guardians: true }, orderBy: { firstName: "asc" } });
    for (const [i, k] of kids.entries()) {
      if (i === 0 || !k.guardians[0] || k.firstName === "Valeria") continue;
      await prisma.permissionResponse.create({ data: { announcementId: gira.id, studentId: k.id, guardianId: k.guardians[0].userId, answer: i === 2 ? "NO" : "YES", respondedAt: day(-1, 19) } });
    }
  }
  // Una ausencia avisada hoy
  const isa = await prisma.student.findFirst({ where: { firstName: "Isabella" }, include: { guardians: true } });
  if (isa) await prisma.absenceNotice.create({ data: { studentId: isa.id, guardianId: isa.guardians[0].userId, dateFrom: new Date(day(0, 12).toISOString().slice(0, 10)), dateTo: new Date(day(0, 12).toISOString().slice(0, 10)), reason: "Cita médica", note: "Cita en el EBAIS a las 8:00" } });

  // Familias de la demo ya aceptaron el aviso de privacidad (excepto la cuenta sin activar)
  await prisma.user.updateMany({ where: { role: "GUARDIAN", passwordHash: { not: null } }, data: { privacyAcceptedAt: day(-30, 9) } });
  for (const st of await prisma.student.findMany({ select: { id: true } })) {
    await prisma.student.update({ where: { id: st.id }, data: { photoConsent: rand() < 0.85 } });
  }

  // Vida diaria: reportes de Preparatoria A (hoy y días anteriores) y álbumes de fotos
  const prepKids = await prisma.student.findMany({ where: { sectionId: sTransA.id }, include: { pickups: true, guardians: { include: { user: true } } }, orderBy: { firstName: "asc" } });
  const moods = ["contento", "contento", "tranquilo", "contento", "cansado"];
  const meals = ["todo", "todo", "mitad", "todo", "poco"];
  const activities = [
    "Conocimos los colores primarios y pintamos con témperas.",
    "Contamos semillas del 1 al 10 y sembramos frijoles en un vaso.",
    "Cuento de la tortuga y la liebre; dramatizamos la historia.",
  ];
  const dateOnly = (d: Date) => new Date(d.toISOString().slice(0, 10));
  // Los tres últimos días hábiles, sin repetir (en fin de semana "ayer" y "hoy" caen en viernes)
  const lastSchoolDays: number[] = [];
  for (let off = 0; lastSchoolDays.length < 3; off--) {
    const dow = day(off, 12).getUTCDay();
    if (dow !== 0 && dow !== 6) lastSchoolDays.unshift(off);
  }
  for (const [n, off] of lastSchoolDays.entries()) {
    const d = dateOnly(day(off, 12));
    if (d > dateOnly(day(0, 12))) continue;
    for (const [i, k] of prepKids.entries()) {
      const r = (i + n) % 5;
      await prisma.dailyReport.create({
        data: {
          studentId: k.id, day: d, mood: moods[r], meal: meals[r], participation: r === 4 ? "apoyo" : r % 2 ? "buena" : "muy-activa", bathroom: "normal",
          note: k.firstName === "Mateo" && n === 2 ? "Hoy ayudó a repartir los materiales y estaba muy orgulloso. 😊" : null,
          activity: activities[n], authorId: tSofia.id, sentAt: day(off, 11, 30),
        },
      });
    }
  }
  const albums: [string, string, number, number, number][] = [
    [sTransA.id, "Siembra de frijoles", weekday(-1), 6, 0],
    [sTransA.id, "Pintamos con témperas", weekday(-2), 4, 1],
    [sPrimero.id, "Feria de ciencias del aula", weekday(-3), 5, 2],
  ];
  for (const [sectionId, title, off, count, v] of albums) {
    const teacher = sectionId === sTransA.id ? tSofia.id : tDaniel.id;
    await prisma.album.create({
      data: {
        sectionId, title, day: dateOnly(day(off, 12)), authorId: teacher, createdAt: day(off, 13),
        photos: { create: Array.from({ length: count }, (_, i) => { const data = demoPicture(v + i); return { mimeType: "image/png", size: data.length, data, order: i }; }) },
      },
    });
  }

  // Académico: periodos, materias, componentes, notas e informes al hogar
  await prisma.level.update({ where: { id: pre.id }, data: { evaluation: "DESCRIPTIVE" } });
  const termDates: [string, number, number, number, number][] = [
    ["I Trimestre", 1, 2, 4, 8],
    ["II Trimestre", 4, 18, 7, 28],
    ["III Trimestre", 8, 7, 11, 11],
  ];
  const terms = [];
  for (const [i, [name, m1, d1, m2, d2]] of termDates.entries()) {
    terms.push(await prisma.term.create({ data: { schoolYearId: sy.id, name, order: i + 1, startsOn: new Date(Date.UTC(year, m1, d1)), endsOn: new Date(Date.UTC(year, m2, d2)) } }));
  }
  const areas = [];
  for (const [i, name] of ["Socioafectiva", "Psicomotriz", "Cognitiva", "Comunicación y lenguaje"].entries()) {
    areas.push(await prisma.subject.create({ data: { levelId: pre.id, name, order: i } }));
  }
  const subjects = [];
  for (const [i, name] of ["Español", "Matemáticas", "Ciencias", "Estudios Sociales", "Inglés", "Educación Física", "Música", "Artes Plásticas"].entries()) {
    subjects.push(await prisma.subject.create({ data: { levelId: pri.id, name, order: i } }));
  }
  // Valores de ejemplo: la escuela los ajusta al Reglamento de Evaluación vigente
  const comps = [];
  for (const [i, [name, weight]] of ([["Trabajo cotidiano", 50], ["Tareas", 10], ["Pruebas", 30], ["Asistencia", 10]] as [string, number][]).entries()) {
    comps.push(await prisma.gradeComponent.create({ data: { levelId: pri.id, name, weight, order: i } }));
  }
  const primeroKids = await prisma.student.findMany({ where: { sectionId: sPrimero.id }, orderBy: { firstName: "asc" } });
  for (const [ti, term] of terms.entries()) {
    for (const k of primeroKids) {
      const base = 70 + Math.round(rand() * 25);
      for (const sub of subjects) {
        for (const c of comps) {
          if (ti === 2 && c.name !== "Trabajo cotidiano" && c.name !== "Tareas") continue;
          const value = Math.max(55, Math.min(100, c.name === "Asistencia" ? 100 - Math.round(rand() * 10) : base + Math.round((rand() - 0.4) * 16)));
          await prisma.score.create({ data: { studentId: k.id, subjectId: sub.id, termId: term.id, componentId: c.id, value } });
        }
      }
      if (ti < 2) await prisma.termReport.create({ data: { studentId: k.id, termId: term.id, comment: `${k.firstName} muestra buena disposición en clase. Recomendamos reforzar la lectura diaria en casa durante 15 minutos.` } });
    }
    if (ti < 2) await prisma.termPublication.create({ data: { termId: term.id, sectionId: sPrimero.id, publishedAt: day(ti === 0 ? -180 : -75, 15) } });
  }
  const areaComments = [
    "Se relaciona con respeto con sus compañeros y comparte los materiales. Expresa lo que siente con palabras.",
    "Recorta siguiendo líneas rectas y mejora el agarre del lápiz. Disfruta los juegos al aire libre.",
    "Clasifica objetos por color y tamaño, y cuenta hasta 20 con seguridad.",
    "Narra experiencias en orden y reconoce las letras de su nombre.",
  ];
  for (const term of terms.slice(0, 2)) {
    for (const [ki, k] of prepKids.entries()) {
      for (const [ai, a] of areas.entries()) {
        await prisma.areaAssessment.create({ data: { studentId: k.id, subjectId: a.id, termId: term.id, achievement: (ki + ai) % 5 === 4 ? "apoyo" : (ki + ai) % 3 === 0 ? "en-proceso" : "logrado", comment: areaComments[ai] } });
      }
      await prisma.termReport.create({ data: { studentId: k.id, termId: term.id, comment: `Ha sido un periodo de mucho crecimiento para ${k.firstName}. En casa, pueden apoyarle conversando sobre lo que hizo en el día y leyendo cuentos juntos.` } });
    }
    await prisma.termPublication.create({ data: { termId: term.id, sectionId: sTransA.id, publishedAt: day(term.order === 1 ? -180 : -75, 15) } });
  }
  const dateKey = (off: number) => new Date(day(weekday(off), 12).toISOString().slice(0, 10));
  await prisma.homework.createMany({
    data: [
      { sectionId: sPrimero.id, subjectId: subjects[1].id, title: "Página 34 del libro: sumas con decenas", description: "Resolver los ejercicios 1 al 6 con lápiz.", dueDate: dateKey(1), authorId: tDaniel.id },
      { sectionId: sPrimero.id, subjectId: subjects[2].id, title: "Traer una hoja de árbol para la clase de Ciencias", description: null, dueDate: dateKey(2), authorId: tDaniel.id },
      { sectionId: sTransA.id, subjectId: null, title: "Traer un juguete reciclado hecho en familia", description: "Con botellas, cajas o tubos de cartón. Lo presentaremos en clase.", dueDate: dateKey(3), authorId: tSofia.id },
    ],
  });

  console.log(`Seed listo. Contraseña de todas las cuentas: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
