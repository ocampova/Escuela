// Pulso: catálogo de ingredientes y recetas.
// Módulo compartido por el navegador y el servidor (validación de recetas).
// Las cantidades son ORIENTATIVAS, por persona adulta, siguiendo el método del plato
// (½ plato de vegetales, ¼ proteína, ¼ almidón). No son una prescripción calórica.

export const MEALS = [
  { id: 'desayuno', label: 'Desayuno', defaultTime: '07:00' },
  { id: 'almuerzo', label: 'Almuerzo', defaultTime: '12:30' },
  { id: 'cena', label: 'Cena', defaultTime: '18:30' },
];

export const ALLERGENS = [
  { id: 'huevo', label: 'Huevo' },
  { id: 'pescado', label: 'Pescado' },
  { id: 'mariscos', label: 'Mariscos' },
  { id: 'mani', label: 'Maní' },
  { id: 'frutos_secos', label: 'Frutos secos' },
  { id: 'soya', label: 'Soya' },
  { id: 'sesamo', label: 'Sésamo (ajonjolí)' },
  { id: 'gluten', label: 'Gluten (trigo, cebada, centeno)' },
  { id: 'lacteos', label: 'Leche y lácteos' },
  { id: 'maiz', label: 'Maíz' },
];

// Preferencias (no alergias). Todas las recetas de Pulso ya las respetan.
export const PREFERENCES = [
  { id: 'sin_lacteos', label: 'Evitar lácteos' },
  { id: 'sin_gluten', label: 'Evitar gluten' },
  { id: 'sin_embutidos', label: 'Evitar embutidos' },
  { id: 'sin_frituras', label: 'Evitar frituras' },
  { id: 'sin_azucaradas', label: 'Evitar bebidas azucaradas' },
  { id: 'sin_ultraprocesados', label: 'Evitar ultraprocesados' },
  { id: 'sin_salsas', label: 'Evitar salsas preparadas' },
];

// Categorías de compra, en el orden en que se recorre una feria o supermercado.
export const CATEGORIES = [
  { id: 'verduras', label: 'Verduras y hierbas' },
  { id: 'tuberculos', label: 'Tubérculos y almidones' },
  { id: 'frutas', label: 'Frutas' },
  { id: 'proteinas', label: 'Carnes, pollo y pescado' },
  { id: 'huevos', label: 'Huevos' },
  { id: 'granos', label: 'Granos y tortillas' },
  { id: 'despensa', label: 'Despensa y condimentos' },
];

// base: unidad en la que se suma. buy: cómo se compra.
// toBuy: factor para convertir la cantidad de la receta (en su estado) a cantidad de compra.
//   p. ej. arroz cocido -> arroz seco: 0.4
// conv: explicación de la conversión aproximada mostrada al usuario.
export const INGREDIENTS = {
  arroz: { name: 'Arroz', cat: 'granos', base: 'g', buyState: 'seco', toBuy: { cocido: 0.4, seco: 1 }, conv: '1 taza de arroz cocido (≈160 g) sale de ≈⅓ taza en seco (≈65 g). Rinde unas 2,5 veces su peso.' },
  frijoles: { name: 'Frijoles negros', cat: 'granos', base: 'g', buyState: 'seco', toBuy: { cocido: 0.4, seco: 1 }, conv: '1 taza de frijoles cocidos (≈170 g) sale de ≈⅓ taza en seco (≈65 g). Si los comprás cocidos en bolsa, revisá que no tengan azúcar ni grasa añadida.' },
  avena: { name: 'Avena en hojuelas (certificada sin gluten si la evitás)', cat: 'granos', base: 'g', buyState: 'seco', toBuy: { seco: 1 }, conv: '½ taza de avena seca ≈ 40 g.' },
  tortilla: { name: 'Tortillas de maíz', cat: 'granos', base: 'u', unit: 'tortilla', buyState: 'unidad', toBuy: { unidad: 1 }, conv: 'Elegí tortillas con solo maíz, cal y agua.', contains: ['maiz'] },
  pechuga: { name: 'Pechuga de pollo sin piel', cat: 'proteinas', base: 'g', buyState: 'crudo', toBuy: { crudo: 1, cocido: 1.33 }, conv: 'El pollo pierde ≈25% de su peso al cocinarse: 120 g crudos ≈ 90 g cocidos.' },
  pescado: { name: 'Filete de pescado blanco (tilapia, dorado o corvina)', cat: 'proteinas', base: 'g', buyState: 'crudo', toBuy: { crudo: 1, cocido: 1.25 }, conv: 'El pescado pierde ≈20% al cocinarse: 140 g crudos ≈ 110 g cocidos.', contains: ['pescado'] },
  res: { name: 'Carne de res magra (posta o lomo, sin grasa visible)', cat: 'proteinas', base: 'g', buyState: 'crudo', toBuy: { crudo: 1, cocido: 1.35 }, conv: 'La carne magra pierde ≈25–30% al cocinarse.' },
  molida: { name: 'Carne molida magra (pedí posta molida)', cat: 'proteinas', base: 'g', buyState: 'crudo', toBuy: { crudo: 1 }, conv: 'Pedir que muelan posta sin grasa evita la carne molida con alto contenido de grasa.' },
  atun: { name: 'Atún en agua (lata)', cat: 'proteinas', base: 'g', buyState: 'escurrido', toBuy: { escurrido: 1 }, pack: { size: 120, unit: 'lata' }, conv: 'Una lata común rinde ≈120 g escurridos. Elegí atún en agua, sin salsas.', contains: ['pescado'] },
  huevo: { name: 'Huevos', cat: 'huevos', base: 'u', unit: 'huevo', buyState: 'unidad', toBuy: { unidad: 1 }, contains: ['huevo'] },
  aguacate: { name: 'Aguacate', cat: 'frutas', base: 'u', unit: 'aguacate', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1, conv: 'Un aguacate mediano rinde 4 porciones de ¼. Comprá algunos maduros y otros sazones.' },
  tomate: { name: 'Tomate', cat: 'verduras', base: 'u', unit: 'tomate', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  cebolla: { name: 'Cebolla', cat: 'verduras', base: 'u', unit: 'cebolla', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  chile: { name: 'Chile dulce', cat: 'verduras', base: 'u', unit: 'chile', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  culantro: { name: 'Culantro', cat: 'verduras', base: 'u', unit: 'rollo', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1, conv: 'Un rollo alcanza para 6–8 preparaciones. Se conserva mejor envuelto en papel húmedo.' },
  ajo: { name: 'Ajo', cat: 'verduras', base: 'u', unit: 'diente', buyState: 'unidad', toBuy: { unidad: 1 }, pack: { size: 10, unit: 'cabeza' }, conv: 'Una cabeza de ajo tiene ≈10 dientes.' },
  limon: { name: 'Limón ácido', cat: 'verduras', base: 'u', unit: 'limón', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  espinaca: { name: 'Espinaca', cat: 'verduras', base: 'g', buyState: 'fresco', toBuy: { fresco: 1 }, conv: '1 taza de hojas crudas ≈ 30 g; se reduce mucho al cocinarse.' },
  repollo: { name: 'Repollo', cat: 'verduras', base: 'g', buyState: 'fresco', toBuy: { fresco: 1 }, conv: 'Un repollo mediano pesa ≈1 kg; ¼ de repollo rinde unas 4 porciones de ensalada.' },
  lechuga: { name: 'Lechuga', cat: 'verduras', base: 'g', buyState: 'fresco', toBuy: { fresco: 1 }, conv: 'Una lechuga mediana ≈ 300 g.' },
  zanahoria: { name: 'Zanahoria', cat: 'verduras', base: 'u', unit: 'zanahoria', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  pepino: { name: 'Pepino', cat: 'verduras', base: 'u', unit: 'pepino', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  brocoli: { name: 'Brócoli', cat: 'verduras', base: 'g', buyState: 'fresco', toBuy: { fresco: 1 }, conv: 'Una cabeza mediana ≈ 400 g; 1 taza de arbolitos ≈ 90 g.' },
  vainica: { name: 'Vainica', cat: 'verduras', base: 'g', buyState: 'fresco', toBuy: { fresco: 1 } },
  chayote: { name: 'Chayote', cat: 'verduras', base: 'u', unit: 'chayote', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  zucchini: { name: 'Zucchini o ayote tierno', cat: 'verduras', base: 'u', unit: 'unidad', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  elote: { name: 'Elote', cat: 'tuberculos', base: 'u', unit: 'elote', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1, contains: ['maiz'] },
  papa: { name: 'Papa', cat: 'tuberculos', base: 'g', buyState: 'crudo', toBuy: { crudo: 1 }, conv: 'Una papa mediana ≈ 150 g cruda.' },
  camote: { name: 'Camote', cat: 'tuberculos', base: 'g', buyState: 'crudo', toBuy: { crudo: 1 }, conv: 'Un camote pequeño ≈ 150 g crudo.' },
  yuca: { name: 'Yuca', cat: 'tuberculos', base: 'g', buyState: 'crudo', toBuy: { crudo: 1 }, conv: 'Pesá la yuca con cáscara: la cáscara es ≈15–20% del peso. También hay yuca pelada congelada sin aditivos.' },
  ayote: { name: 'Ayote sazón', cat: 'tuberculos', base: 'g', buyState: 'crudo', toBuy: { crudo: 1 }, conv: 'Se vende por trozo; un trozo de ½ kg alcanza para 2 sopas.' },
  platano: { name: 'Plátano maduro', cat: 'tuberculos', base: 'u', unit: 'plátano', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  banano: { name: 'Banano', cat: 'frutas', base: 'u', unit: 'banano', buyState: 'unidad', toBuy: { unidad: 1 }, round: 1 },
  papaya: { name: 'Papaya', cat: 'frutas', base: 'g', buyState: 'fresco', toBuy: { fresco: 1 }, conv: '1 taza en cubos ≈ 150 g. Una papaya mediana rinde ≈ 1 kg de pulpa.' },
  pina: { name: 'Piña', cat: 'frutas', base: 'g', buyState: 'fresco', toBuy: { fresco: 1 }, conv: '1 taza en trozos ≈ 160 g. Una piña mediana rinde ≈ 900 g de pulpa.' },
  aceite: { name: 'Aceite de oliva o canola', cat: 'despensa', base: 'ml', buyState: 'líquido', toBuy: { 'líquido': 1 }, conv: '1 cucharadita = 5 ml; 1 cucharada = 15 ml. Una botella de 500 ml dura varias semanas.' },
  sal: { name: 'Sal', cat: 'despensa', base: 'gusto' },
  pimienta: { name: 'Pimienta negra', cat: 'despensa', base: 'gusto' },
  comino: { name: 'Comino', cat: 'despensa', base: 'gusto' },
  oregano: { name: 'Orégano seco', cat: 'despensa', base: 'gusto' },
  pimenton: { name: 'Pimentón (paprika)', cat: 'despensa', base: 'gusto' },
  canela: { name: 'Canela en polvo o en raja', cat: 'despensa', base: 'gusto' },
  tomillo: { name: 'Tomillo seco', cat: 'despensa', base: 'gusto' },
};

const i = (id, qty, state, home, note) => ({ id, qty, state, home, note });
const g = (id) => ({ id, qty: null, state: null, home: 'al gusto' });

export const RECIPES = [
  // ---------- DESAYUNOS ----------
  {
    id: 'gallo-pinto',
    name: 'Gallo pinto con huevo y aguacate',
    meals: ['desayuno'],
    minutes: 15,
    summary: 'El clásico, con arroz y frijoles ya cocidos, sin salsas preparadas y con más verdura.',
    plate: 'Proteína: huevo y frijoles · Almidón: arroz · Verdura: chile, cebolla y tomate',
    ingredients: [
      i('arroz', 80, 'cocido', '½ taza'),
      i('frijoles', 90, 'cocido', '½ taza'),
      i('huevo', 2, 'unidad', '2 unidades'),
      i('aguacate', 0.25, 'unidad', '¼ de aguacate'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('chile', 0.25, 'unidad', '¼ de chile dulce'),
      i('tomate', 0.5, 'unidad', '½ tomate, en rodajas'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('aceite', 5, 'líquido', '1 cucharadita'),
      g('comino'), g('sal'),
    ],
    steps: [
      'Picá finamente la cebolla, el chile dulce y el ajo.',
      'Calentá el aceite en un sartén antiadherente a fuego medio y sofreí la cebolla, el chile y el ajo 3 minutos, sin dorar.',
      'Agregá los frijoles con un poco de su caldo y una pizca de comino. Cociná 2 minutos.',
      'Incorporá el arroz y mezclá con movimientos envolventes hasta que tome color y esté caliente (3–4 minutos).',
      'Apagá el fuego y añadí el culantro picado.',
      'En el mismo sartén, prepará los huevos revueltos o a la plancha sin aceite extra.',
      'Serví con el aguacate y el tomate en rodajas.',
    ],
    alternatives: [
      { when: 'huevo', text: 'Sustituí los huevos por 60 g de pechuga de pollo cocida y desmenuzada, o aumentá los frijoles a ¾ taza.' },
      { when: 'maiz', text: 'Esta receta no lleva maíz.' },
    ],
    batch: [
      'Cociná 500 g de frijoles secos el domingo (remojo de 8 horas y 25–30 minutos en olla de presión): rinden para gallo pinto, casados y ensaladas de toda la semana.',
      'Prepará el arroz en tanda y dejalo enfriar extendido antes de guardarlo: el gallo pinto queda mejor con arroz del día anterior.',
    ],
    storage: [
      'Arroz y frijoles cocidos: refrigerados en recipientes cerrados hasta 3–4 días.',
      'Frijoles cocidos: se congelan en porciones de 1 taza hasta 3 meses.',
      'Enfriá y refrigerá el arroz cocido dentro de las 2 horas siguientes a cocinarlo.',
    ],
  },
  {
    id: 'revueltos-camote',
    name: 'Huevos revueltos con espinaca, camote asado y papaya',
    meals: ['desayuno'],
    minutes: 30,
    summary: 'Camote al horno en lugar de pan, con huevos y espinaca. Si el camote ya está asado, son 10 minutos.',
    plate: 'Proteína: huevo · Almidón: camote · Verdura y fruta: espinaca, tomate y papaya',
    ingredients: [
      i('huevo', 2, 'unidad', '2 unidades'),
      i('espinaca', 30, 'fresco', '1 taza de hojas'),
      i('tomate', 0.5, 'unidad', '½ tomate'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('camote', 150, 'crudo', '1 camote pequeño'),
      i('papaya', 150, 'fresco', '1 taza en cubos'),
      i('aceite', 5, 'líquido', '1 cucharadita'),
      g('sal'), g('pimienta'),
    ],
    steps: [
      'Precalentá el horno a 200 °C. Lavá el camote, cortalo en rodajas de 1 cm con cáscara y untalo con la mitad del aceite.',
      'Horneá 20–25 minutos, dándole vuelta a la mitad, hasta que esté suave por dentro.',
      'Picá la cebolla y el tomate. Sofreí la cebolla en el resto del aceite 2 minutos.',
      'Agregá la espinaca y el tomate y cociná 1 minuto, hasta que la espinaca se reduzca.',
      'Batí los huevos con sal y pimienta, vertelos en el sartén y revolvé a fuego bajo hasta que cuajen.',
      'Serví con el camote y la papaya aparte.',
    ],
    alternatives: [
      { when: 'huevo', text: 'Reemplazá los huevos por ½ taza de frijoles cocidos salteados con la espinaca, o por 60 g de pollo cocido desmenuzado.' },
    ],
    batch: [
      'Asá 3 o 4 camotes juntos: duran para varios desayunos y almuerzos.',
      'Cortá la papaya entera en cubos y guardala en un recipiente cerrado.',
    ],
    storage: [
      'Camote asado: refrigerado hasta 4 días; se recalienta en sartén o microondas.',
      'Papaya cortada: refrigerada hasta 3 días.',
    ],
  },
  {
    id: 'tortillas-frijoles-huevo',
    name: 'Tortillas con frijoles molidos, huevo y pico de gallo',
    meals: ['desayuno'],
    minutes: 15,
    summary: 'Tortillas calientes en comal, frijoles molidos caseros y un pico de gallo fresco.',
    plate: 'Proteína: huevo y frijoles · Almidón: tortilla · Verdura: pico de gallo',
    ingredients: [
      i('tortilla', 2, 'unidad', '2 tortillas'),
      i('frijoles', 90, 'cocido', '½ taza'),
      i('huevo', 2, 'unidad', '2 unidades'),
      i('tomate', 0.5, 'unidad', '½ tomate'),
      i('cebolla', 0.15, 'unidad', '2 cucharadas picada'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('limon', 0.5, 'unidad', '½ limón'),
      i('aguacate', 0.25, 'unidad', '¼ de aguacate'),
      g('sal'),
    ],
    steps: [
      'Prepará el pico de gallo: picá el tomate, la cebolla y el culantro, y mezclalos con el jugo de limón y una pizca de sal.',
      'Molé los frijoles cocidos con un tenedor o licuadora, con 2–3 cucharadas de su caldo. Calentalos en una olla pequeña 3 minutos.',
      'Cociná los huevos a la plancha o revueltos en un sartén antiadherente.',
      'Calentá las tortillas en el comal, 1 minuto por lado.',
      'Untá los frijoles en las tortillas y serví con el huevo, el pico de gallo y el aguacate.',
    ],
    alternatives: [
      { when: 'huevo', text: 'Sustituí el huevo por 60 g de pollo cocido desmenuzado o por ¼ taza más de frijoles.' },
      { when: 'maiz', text: 'Cambiá las tortillas por 120 g de papa o camote cocidos.' },
    ],
    batch: [
      'Molé una tanda de frijoles para 3 días y guardala en un frasco.',
      'El pico de gallo se puede preparar para 2 días si se guarda sin sal y se sazona al servir.',
    ],
    storage: [
      'Frijoles molidos: refrigerados hasta 3–4 días.',
      'Tortillas: refrigeradas en su bolsa cerrada; también se pueden congelar separadas con papel.',
    ],
  },
  {
    id: 'avena-banano',
    name: 'Avena cocida con banano y canela, con huevos duros',
    meals: ['desayuno'],
    minutes: 12,
    summary: 'Avena en agua, endulzada solo con fruta, y una proteína al lado para que el desayuno sostenga.',
    plate: 'Proteína: huevo · Almidón: avena · Fruta: banano',
    ingredients: [
      i('avena', 40, 'seco', '½ taza en seco'),
      i('banano', 1, 'unidad', '1 banano maduro'),
      i('huevo', 2, 'unidad', '2 unidades, duros'),
      g('canela'), g('sal'),
    ],
    steps: [
      'Poné los huevos en una olla con agua fría. Cuando hierva, contá 10 minutos y pasalos a agua fría.',
      'En otra olla, calentá 1 taza de agua (250 ml) con una raja de canela y una pizca de sal.',
      'Cuando hierva, agregá la avena y cociná a fuego bajo 5 minutos, revolviendo.',
      'Majá la mitad del banano e incorporalo a la avena para endulzarla. Cortá el resto en rodajas para servir encima.',
      'Serví con los huevos duros pelados.',
    ],
    alternatives: [
      { when: 'gluten', text: 'La avena común puede contener trazas de trigo. Si evitás el gluten, usá avena certificada sin gluten.' },
      { when: 'huevo', text: 'Acompañá con ½ taza de frijoles cocidos o 60 g de pollo desmenuzado en lugar de los huevos.' },
    ],
    batch: [
      'Cociná 6 huevos duros a la vez: se conservan con cáscara en la refrigeradora.',
    ],
    storage: [
      'Huevos duros con cáscara: refrigerados hasta 7 días.',
      'Avena cocida: refrigerada hasta 3 días; se recalienta con un poco de agua.',
    ],
  },
  {
    id: 'torta-huevo-zucchini',
    name: 'Torta de huevo con zucchini y papa, con piña',
    meals: ['desayuno'],
    minutes: 25,
    summary: 'Una torta al sartén con papa cocida, sin freír, y fruta fresca.',
    plate: 'Proteína: huevo · Almidón: papa · Verdura y fruta: zucchini, cebolla y piña',
    ingredients: [
      i('huevo', 2, 'unidad', '2 unidades'),
      i('zucchini', 0.5, 'unidad', '½ zucchini o ayote tierno'),
      i('papa', 120, 'crudo', '1 papa pequeña'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('pina', 120, 'fresco', '¾ taza en trozos'),
      i('aceite', 5, 'líquido', '1 cucharadita'),
      g('sal'), g('pimienta'),
    ],
    steps: [
      'Cortá la papa en cubos pequeños y cocinala en agua con sal 8–10 minutos, hasta que esté suave. Escurrila.',
      'Rallá el zucchini y picá la cebolla.',
      'Calentá el aceite en un sartén antiadherente pequeño y salteá la cebolla y el zucchini 3 minutos.',
      'Agregá la papa y los huevos batidos con sal y pimienta. Tapá y cociná a fuego bajo 6–8 minutos, hasta que cuaje.',
      'Dale vuelta con ayuda de un plato y cociná 1 minuto más. Serví con la piña.',
    ],
    alternatives: [
      { when: 'huevo', text: 'Prepará un salteado de papa, zucchini y ½ taza de frijoles cocidos, o agregá 60 g de pollo cocido.' },
    ],
    batch: [
      'Cociná papas en cubos para 3 días y guardalas escurridas.',
    ],
    storage: [
      'Papa cocida: refrigerada hasta 3–4 días.',
      'Piña cortada: refrigerada hasta 3 días.',
    ],
  },

  // ---------- ALMUERZOS Y CENAS ----------
  {
    id: 'casado-pollo',
    name: 'Casado de pollo a la plancha con plátano al horno',
    meals: ['almuerzo', 'cena'],
    minutes: 35,
    summary: 'El casado de siempre, con el plátano horneado en lugar de frito y más ensalada.',
    plate: 'Proteína: pollo y frijoles · Almidón: arroz y plátano · Verdura: ensalada de repollo',
    ingredients: [
      i('pechuga', 120, 'crudo', '1 filete mediano (≈ 90 g cocido)'),
      i('arroz', 80, 'cocido', '½ taza'),
      i('frijoles', 90, 'cocido', '½ taza'),
      i('platano', 0.33, 'unidad', '⅓ de plátano maduro'),
      i('repollo', 60, 'fresco', '1 taza picado'),
      i('zanahoria', 0.5, 'unidad', '½ zanahoria rallada'),
      i('tomate', 0.5, 'unidad', '½ tomate'),
      i('limon', 0.5, 'unidad', '½ limón'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('aceite', 5, 'líquido', '1 cucharadita'),
      g('oregano'), g('sal'), g('pimienta'),
    ],
    steps: [
      'Mariná el pollo con el ajo machacado, orégano, jugo de ½ limón, sal y pimienta al menos 15 minutos.',
      'Precalentá el horno a 200 °C. Cortá el plátano en rodajas diagonales y hornealo sobre papel 15–20 minutos, dándole vuelta a la mitad.',
      'Cociná el pollo en una plancha caliente con el aceite, 5–6 minutos por lado, hasta que el centro no esté rosado (74 °C si tenés termómetro).',
      'Mezclá el repollo, la zanahoria y el tomate con jugo de limón y sal.',
      'Calentá el arroz y los frijoles.',
      'Serví: medio plato de ensalada, un cuarto de pollo y un cuarto de arroz, frijoles y plátano.',
    ],
    alternatives: [
      { when: 'huevo', text: 'Esta receta no lleva huevo.' },
      { when: 'pescado', text: 'Esta receta no lleva pescado.' },
    ],
    batch: [
      'Marina 4–5 pechugas a la vez y guardalas crudas en porciones en el congelador.',
      'Dejá el repollo picado listo para 3 días en un recipiente seco; aliñalo al servir.',
    ],
    storage: [
      'Pollo cocido: refrigerado hasta 3–4 días.',
      'Pollo crudo marinado: refrigerado máximo 2 días, o congelado hasta 3 meses.',
    ],
  },
  {
    id: 'pescado-ajillo',
    name: 'Pescado al ajillo al horno con papa y brócoli',
    meals: ['almuerzo', 'cena'],
    minutes: 30,
    summary: 'Todo en una bandeja: pescado blanco, papa y brócoli con ajo y limón.',
    plate: 'Proteína: pescado · Almidón: papa · Verdura: brócoli y zanahoria',
    ingredients: [
      i('pescado', 140, 'crudo', '1 filete (≈ 110 g cocido)'),
      i('papa', 150, 'crudo', '1 papa mediana'),
      i('brocoli', 100, 'fresco', '1 taza de arbolitos'),
      i('zanahoria', 0.5, 'unidad', '½ zanahoria'),
      i('ajo', 2, 'unidad', '2 dientes'),
      i('limon', 0.5, 'unidad', '½ limón'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('aceite', 10, 'líquido', '2 cucharaditas'),
      g('sal'), g('pimienta'),
    ],
    steps: [
      'Precalentá el horno a 200 °C.',
      'Cortá la papa en gajos y la zanahoria en bastones. Mezclalas con 1 cucharadita de aceite y sal, y hornealas 15 minutos.',
      'Picá el ajo y mezclalo con el resto del aceite, el jugo de limón, el culantro y pimienta.',
      'Sacá la bandeja, agregá el brócoli y el pescado, y bañá el pescado con la mezcla de ajo.',
      'Horneá 12–15 minutos más, hasta que el pescado se separe fácilmente con un tenedor.',
    ],
    alternatives: [
      { when: 'pescado', text: 'Usá 120 g de pechuga de pollo en filete delgado; horneála 18–20 minutos.' },
    ],
    batch: [
      'Lavá y cortá el brócoli de toda la semana el día que lo comprás; guardalo seco en una bolsa con papel.',
    ],
    storage: [
      'Pescado cocido: refrigerado hasta 2–3 días.',
      'Pescado crudo: usalo en 1–2 días o congelalo el día de la compra.',
    ],
  },
  {
    id: 'olla-carne',
    name: 'Olla de carne liviana',
    meals: ['almuerzo', 'cena'],
    minutes: 90,
    summary: 'La sopa tica de siempre, con carne magra, mucha verdura y una porción medida de yuca y elote.',
    plate: 'Proteína: carne magra · Almidón: yuca y elote · Verdura: chayote, ayote y zanahoria',
    ingredients: [
      i('res', 120, 'crudo', '1 trozo mediano, en cubos'),
      i('yuca', 80, 'crudo', '1 trozo de 5 cm'),
      i('elote', 0.5, 'unidad', '½ elote'),
      i('chayote', 0.5, 'unidad', '½ chayote'),
      i('ayote', 100, 'crudo', '1 trozo pequeño'),
      i('zanahoria', 0.5, 'unidad', '½ zanahoria'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('culantro', 0.15, 'unidad', '3 cucharadas picado'),
      g('sal'), g('pimienta'),
    ],
    steps: [
      'Cortá la carne en cubos y retirá la grasa visible.',
      'En una olla grande, cubrí la carne con 1,5 litros de agua por cada 4 porciones; agregá cebolla, ajo y la mitad del culantro.',
      'Cociná a fuego bajo 60 minutos, o 25 minutos en olla de presión, hasta que la carne esté suave. Retirá la espuma.',
      'Agregá la yuca y el elote en trozos; cociná 10 minutos.',
      'Agregá el chayote, el ayote y la zanahoria; cociná 10–12 minutos más.',
      'Ajustá la sal y terminá con el resto del culantro.',
    ],
    alternatives: [
      { when: 'maiz', text: 'Omití el elote y aumentá la yuca a 120 g.' },
    ],
    batch: [
      'Esta receta rinde mejor en tanda de 4 porciones: almuerzo de hoy y cenas de los próximos días.',
      'Si enfriás el caldo en la refrigeradora, la grasa sube y se puede retirar con una cuchara.',
    ],
    storage: [
      'Refrigerada hasta 3–4 días.',
      'El caldo con carne se congela hasta 3 meses; las verduras pierden textura al congelarse.',
    ],
  },
  {
    id: 'arroz-pollo',
    name: 'Arroz con pollo casero y ensalada',
    meals: ['almuerzo', 'cena'],
    minutes: 40,
    summary: 'Sazonado con verdura, comino y pimentón, sin cubitos ni salsas preparadas.',
    plate: 'Proteína: pollo · Almidón: arroz · Verdura: vainica, zanahoria, chile y ensalada',
    ingredients: [
      i('arroz', 40, 'seco', '3 cucharadas en seco (≈ ½ taza cocido)'),
      i('pechuga', 110, 'crudo', '1 filete pequeño'),
      i('vainica', 50, 'fresco', '½ taza picada'),
      i('zanahoria', 0.5, 'unidad', '½ zanahoria'),
      i('chile', 0.25, 'unidad', '¼ de chile dulce'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('lechuga', 50, 'fresco', '1 taza'),
      i('tomate', 0.5, 'unidad', '½ tomate'),
      i('aceite', 5, 'líquido', '1 cucharadita'),
      g('comino'), g('pimenton'), g('sal'),
    ],
    steps: [
      'Cociná la pechuga en agua con cebolla, ajo y sal 15–18 minutos. Desmenuzala y guardá el caldo.',
      'En una olla, sofreí en el aceite la cebolla, el chile y el ajo picados 3 minutos.',
      'Agregá el arroz y revolvé 1 minuto. Sazoná con comino y pimentón.',
      'Añadí el doble de caldo que de arroz (por ejemplo, ⅔ taza de caldo para ⅓ taza de arroz), la zanahoria y la vainica picadas.',
      'Tapá y cociná a fuego bajo 18 minutos. Incorporá el pollo y el culantro y dejá reposar 5 minutos tapado.',
      'Serví con la lechuga y el tomate; que la ensalada ocupe la mitad del plato.',
    ],
    alternatives: [
      { when: 'pescado', text: 'Esta receta no lleva pescado.' },
    ],
    batch: [
      'Cociná y desmenuzá 1 kg de pechuga el domingo: sirve para este arroz, tacos y sopa de ayote.',
      'Congelá el caldo en cubeteras para sazonar otras preparaciones.',
    ],
    storage: [
      'Arroz con pollo: refrigerado hasta 3 días.',
      'Pollo desmenuzado: refrigerado hasta 3–4 días o congelado hasta 3 meses.',
    ],
  },
  {
    id: 'picadillo-papa',
    name: 'Picadillo de papa con carne molida y ensalada de pepino',
    meals: ['almuerzo', 'cena'],
    minutes: 30,
    summary: 'Picadillo tico con posta molida y una ensalada fresca para equilibrar el plato.',
    plate: 'Proteína: carne molida magra · Almidón: papa · Verdura: chile, pepino y tomate',
    ingredients: [
      i('molida', 100, 'crudo', '⅓ de taza bien llena'),
      i('papa', 150, 'crudo', '1 papa mediana'),
      i('chile', 0.25, 'unidad', '¼ de chile dulce'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('pepino', 0.5, 'unidad', '½ pepino'),
      i('tomate', 0.5, 'unidad', '½ tomate'),
      i('limon', 0.5, 'unidad', '½ limón'),
      g('comino'), g('sal'), g('pimienta'),
    ],
    steps: [
      'Pelá la papa y cortala en cubos de 1 cm. Cocinala en agua con sal 6–8 minutos; debe quedar firme. Escurrila.',
      'En un sartén sin aceite, dorá la carne molida a fuego medio-alto 5 minutos, desmenuzándola. Si suelta grasa, retirala con papel.',
      'Agregá cebolla, chile y ajo picados; cociná 3 minutos. Sazoná con comino, sal y pimienta.',
      'Incorporá la papa y un chorrito de agua; cociná 5 minutos para que se mezclen los sabores. Terminá con culantro.',
      'Prepará la ensalada con pepino, tomate, limón y sal.',
    ],
    alternatives: [
      { when: 'huevo', text: 'Esta receta no lleva huevo.' },
    ],
    batch: [
      'Duplicá la receta: el picadillo sirve como relleno de tortillas para otra comida.',
    ],
    storage: [
      'Picadillo: refrigerado hasta 3 días; congelado hasta 2 meses.',
      'Carne molida cruda: usala en 1–2 días o congelala.',
    ],
  },
  {
    id: 'pollo-tomate-camote',
    name: 'Pollo en salsa de tomate natural con camote y zucchini',
    meals: ['almuerzo', 'cena'],
    minutes: 35,
    summary: 'Una salsa de tomate hecha en casa, sin frascos ni azúcar añadida.',
    plate: 'Proteína: pollo · Almidón: camote · Verdura: tomate, chile y zucchini',
    ingredients: [
      i('pechuga', 120, 'crudo', '1 filete mediano'),
      i('tomate', 2, 'unidad', '2 tomates maduros'),
      i('chile', 0.25, 'unidad', '¼ de chile dulce'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('camote', 150, 'crudo', '1 camote pequeño'),
      i('zucchini', 0.5, 'unidad', '½ zucchini'),
      i('aceite', 5, 'líquido', '1 cucharadita'),
      g('oregano'), g('sal'), g('pimienta'),
    ],
    steps: [
      'Cociná el camote en trozos en agua 12–15 minutos, o asalo si ya tenés el horno encendido.',
      'Licuá los tomates con el ajo y ½ taza de agua.',
      'Cortá el pollo en tiras y doralo en el aceite 4 minutos.',
      'Agregá cebolla y chile en tiras y cociná 2 minutos. Vertí el tomate licuado y el orégano.',
      'Cociná a fuego bajo 12 minutos. Agregá el zucchini en medias lunas los últimos 5 minutos.',
      'Ajustá la sal y serví con el camote.',
    ],
    alternatives: [
      { when: 'pescado', text: 'Esta receta no lleva pescado; también se puede preparar con filete de pescado (8 minutos en la salsa).' },
    ],
    batch: [
      'Prepará el triple de salsa de tomate y congelala en porciones de 1 taza.',
    ],
    storage: [
      'Pollo en salsa: refrigerado hasta 3–4 días.',
      'Salsa de tomate casera: refrigerada 5 días o congelada 3 meses.',
    ],
  },
  {
    id: 'ensalada-atun',
    name: 'Ensalada de atún, frijoles y aguacate',
    meals: ['almuerzo', 'cena'],
    minutes: 10,
    summary: 'Sin cocinar: ideal para noches con poco tiempo.',
    plate: 'Proteína: atún y frijoles · Almidón: frijoles y tortilla · Verdura: tomate, pepino y cebolla',
    ingredients: [
      i('atun', 100, 'escurrido', '¾ de lata escurrida'),
      i('frijoles', 90, 'cocido', '½ taza'),
      i('aguacate', 0.25, 'unidad', '¼ de aguacate'),
      i('tomate', 0.5, 'unidad', '½ tomate'),
      i('pepino', 0.5, 'unidad', '½ pepino'),
      i('cebolla', 0.15, 'unidad', '2 cucharadas picada'),
      i('limon', 1, 'unidad', '1 limón'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('tortilla', 1, 'unidad', '1 tortilla tostada en comal'),
      i('aceite', 5, 'líquido', '1 cucharadita'),
      g('sal'), g('pimienta'),
    ],
    steps: [
      'Escurrí bien el atún y enjuagá los frijoles si estaban en su caldo.',
      'Picá el tomate, el pepino, la cebolla y el culantro.',
      'Mezclá todo con el jugo de limón, el aceite, sal y pimienta.',
      'Agregá el aguacate en cubos al final para que no se deshaga.',
      'Tostá la tortilla en el comal hasta que esté crujiente y serví al lado.',
    ],
    alternatives: [
      { when: 'pescado', text: 'Cambiá el atún por 90 g de pollo cocido desmenuzado o por 2 huevos duros.' },
      { when: 'maiz', text: 'Omití la tortilla y agregá 100 g de papa cocida.' },
    ],
    batch: [
      'Dejá la verdura picada (sin tomate) lista para 2 días.',
    ],
    storage: [
      'Ensalada armada: refrigerada hasta 1 día; el aguacate se oscurece.',
      'Atún abierto: pasalo a un recipiente de vidrio y usalo en 1–2 días.',
    ],
  },
  {
    id: 'sopa-ayote',
    name: 'Crema de ayote sin lácteos con pollo desmenuzado',
    meals: ['almuerzo', 'cena'],
    minutes: 35,
    summary: 'Cremosa por el propio ayote licuado, sin leche ni crema.',
    plate: 'Proteína: pollo · Almidón: ayote y tortilla · Verdura: zanahoria, cebolla y ensalada',
    ingredients: [
      i('ayote', 250, 'crudo', '1 trozo mediano, sin cáscara'),
      i('pechuga', 100, 'crudo', '1 filete pequeño'),
      i('zanahoria', 0.5, 'unidad', '½ zanahoria'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('lechuga', 50, 'fresco', '1 taza'),
      i('tortilla', 1, 'unidad', '1 tortilla'),
      g('tomillo'), g('sal'), g('pimienta'),
    ],
    steps: [
      'Cociná la pechuga en 3 tazas de agua con sal 15–18 minutos. Retirala, desmenuzala y guardá el caldo.',
      'En ese caldo, cociná el ayote en cubos, la zanahoria, la cebolla y el ajo 15 minutos, hasta que estén suaves.',
      'Licuá con cuidado (dejá salir el vapor) hasta obtener una crema. Ajustá con más caldo si la querés más líquida.',
      'Volvé a calentar con tomillo, sal y pimienta.',
      'Serví con el pollo y el culantro encima, una ensalada de lechuga y la tortilla.',
    ],
    alternatives: [
      { when: 'maiz', text: 'Omití la tortilla y agregá 100 g de papa cocida a la crema.' },
    ],
    batch: [
      'La crema se congela muy bien: prepará 4 porciones y congelá 2.',
    ],
    storage: [
      'Crema refrigerada hasta 4 días; congelada hasta 3 meses.',
    ],
  },
  {
    id: 'tacos-pollo',
    name: 'Tortillas al comal con pollo desmenuzado y repollo',
    meals: ['almuerzo', 'cena'],
    minutes: 20,
    summary: 'Tacos caseros sin freír: tortilla tibia, pollo sazonado y mucha verdura crujiente.',
    plate: 'Proteína: pollo · Almidón: tortilla · Verdura: repollo, tomate y cebolla',
    ingredients: [
      i('pechuga', 100, 'crudo', '1 filete pequeño (≈ ¾ taza desmenuzado)'),
      i('tortilla', 2, 'unidad', '2 tortillas'),
      i('repollo', 60, 'fresco', '1 taza picado fino'),
      i('tomate', 0.5, 'unidad', '½ tomate'),
      i('cebolla', 0.15, 'unidad', '2 cucharadas picada'),
      i('limon', 0.5, 'unidad', '½ limón'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('aguacate', 0.25, 'unidad', '¼ de aguacate'),
      g('comino'), g('pimenton'), g('sal'),
    ],
    steps: [
      'Si no tenés pollo listo, cociná la pechuga en agua con sal 15–18 minutos y desmenuzala.',
      'Calentá el pollo en un sartén con 2 cucharadas de agua, comino y pimentón, 3 minutos.',
      'Mezclá el repollo con limón y sal. Picá el tomate y la cebolla con el culantro.',
      'Calentá las tortillas en el comal.',
      'Armá cada tortilla con pollo, repollo, tomate y aguacate en tiras.',
    ],
    alternatives: [
      { when: 'maiz', text: 'Serví el relleno sobre hojas grandes de lechuga y agregá 100 g de camote asado.' },
    ],
    batch: [
      'Usá el pollo desmenuzado de la tanda del domingo.',
    ],
    storage: [
      'Pollo desmenuzado sazonado: refrigerado hasta 3–4 días.',
      'Repollo picado sin aliñar: refrigerado hasta 4 días.',
    ],
  },
  {
    id: 'pescado-papillote',
    name: 'Pescado en papillote con vegetales y yuca',
    meals: ['almuerzo', 'cena'],
    minutes: 35,
    summary: 'Pescado cocido al vapor en su propio paquete con chile, cebolla y zucchini.',
    plate: 'Proteína: pescado · Almidón: yuca · Verdura: zucchini, chile, cebolla y tomate',
    ingredients: [
      i('pescado', 140, 'crudo', '1 filete'),
      i('yuca', 120, 'crudo', '1 trozo de 7 cm'),
      i('zucchini', 0.5, 'unidad', '½ zucchini'),
      i('chile', 0.25, 'unidad', '¼ de chile dulce'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('tomate', 0.5, 'unidad', '½ tomate'),
      i('limon', 0.5, 'unidad', '½ limón'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('aceite', 5, 'líquido', '1 cucharadita'),
      g('sal'), g('pimienta'), g('oregano'),
    ],
    steps: [
      'Pelá la yuca, retirá la vena central y cocinala en agua con sal 20–25 minutos hasta que esté suave.',
      'Precalentá el horno a 200 °C. Cortá en tiras finas el zucchini, el chile, la cebolla y el tomate.',
      'Sobre un rectángulo de papel de hornear o aluminio, poné la mitad de la verdura, el pescado encima y el resto de la verdura.',
      'Agregá ajo picado, jugo de limón, aceite, sal, pimienta y orégano. Cerrá el paquete doblando los bordes.',
      'Horneá 15–18 minutos. Abrí con cuidado: sale vapor caliente.',
      'Serví con la yuca.',
    ],
    alternatives: [
      { when: 'pescado', text: 'Usá un filete delgado de pechuga de pollo (120 g) y horneá 22–25 minutos.' },
    ],
    batch: [
      'Cociná yuca para 2–3 comidas y congelala en trozos ya cocidos.',
    ],
    storage: [
      'Yuca cocida: refrigerada 3 días o congelada 3 meses.',
      'Pescado cocido: refrigerado hasta 2–3 días.',
    ],
  },
  {
    id: 'picadillo-chayote',
    name: 'Picadillo de chayote con carne molida y tortillas',
    meals: ['almuerzo', 'cena'],
    minutes: 25,
    summary: 'Mucho chayote, poca grasa y tortillas al comal.',
    plate: 'Proteína: carne molida magra · Almidón: tortilla · Verdura: chayote, chile y cebolla',
    ingredients: [
      i('chayote', 1, 'unidad', '1 chayote mediano'),
      i('molida', 90, 'crudo', '⅓ de taza'),
      i('cebolla', 0.25, 'unidad', '¼ de cebolla'),
      i('chile', 0.25, 'unidad', '¼ de chile dulce'),
      i('ajo', 1, 'unidad', '1 diente'),
      i('culantro', 0.1, 'unidad', '2 cucharadas picado'),
      i('tortilla', 2, 'unidad', '2 tortillas'),
      g('comino'), g('sal'), g('pimienta'),
    ],
    steps: [
      'Pelá el chayote, retirá la semilla y cortalo en cubos pequeños.',
      'Dorá la carne molida en un sartén sin aceite 5 minutos; retirá la grasa que suelte.',
      'Agregá cebolla, chile y ajo picados; cociná 2 minutos.',
      'Agregá el chayote, comino, sal y pimienta. Tapá y cociná a fuego bajo 10–12 minutos; el chayote suelta su propio líquido.',
      'Destapá los últimos minutos para que se seque un poco y terminá con culantro.',
      'Serví con las tortillas calientes.',
    ],
    alternatives: [
      { when: 'maiz', text: 'Cambiá las tortillas por ½ taza de arroz cocido.' },
    ],
    batch: [
      'El picadillo de chayote rinde para 2 comidas; recalentalo en sartén para que no quede aguado.',
    ],
    storage: [
      'Refrigerado hasta 3 días.',
    ],
  },
];

export const RECIPE_IDS = new Set(RECIPES.map((r) => r.id));
export const recipeById = (id) => RECIPES.find((r) => r.id === id) || null;

// Alergenos presentes en una receta (derivados de sus ingredientes).
export function recipeAllergens(recipe) {
  const set = new Set();
  for (const ing of recipe.ingredients) {
    const def = INGREDIENTS[ing.id];
    if (def && def.contains) def.contains.forEach((a) => set.add(a));
  }
  return [...set];
}
