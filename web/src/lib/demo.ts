import type {
  Difficulty,
  Exercise,
  MuscleId,
  MuscleLoad,
} from "@shared/types";

/**
 * Демонстрационные данные для витрины на сайте.
 * Реальные значения приложение считает из профиля и записанных тренировок.
 */

export const muscleNames: Record<MuscleId, string> = {
  traps: "Трапеции",
  delts: "Плечи",
  chest: "Грудь",
  biceps: "Бицепс",
  forearms: "Предплечья",
  abs: "Пресс",
  obliques: "Косые",
  quads: "Квадрицепс",
  calves: "Икры",
};

export const difficultyLabels: Record<Difficulty, string> = {
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
};

export const equipmentLabels = {
  barbell: "Штанга",
  dumbbell: "Гантели",
  machine: "Тренажёр",
  bodyweight: "Свой вес",
  cable: "Блок",
} as const;

/** Недельный объём: сделано подходов из целевого по росту/весу/возрасту */
export const demoLoads: MuscleLoad[] = [
  { muscleId: "chest", setsDone: 12, setsTarget: 14, ratio: 12 / 14 },
  { muscleId: "delts", setsDone: 9, setsTarget: 16, ratio: 9 / 16 },
  { muscleId: "biceps", setsDone: 8, setsTarget: 12, ratio: 8 / 12 },
  { muscleId: "traps", setsDone: 4, setsTarget: 8, ratio: 4 / 8 },
  { muscleId: "forearms", setsDone: 3, setsTarget: 8, ratio: 3 / 8 },
  { muscleId: "abs", setsDone: 6, setsTarget: 12, ratio: 6 / 12 },
  { muscleId: "obliques", setsDone: 2, setsTarget: 8, ratio: 2 / 8 },
  { muscleId: "quads", setsDone: 18, setsTarget: 16, ratio: 18 / 16 },
  { muscleId: "calves", setsDone: 2, setsTarget: 10, ratio: 2 / 10 },
];

export const demoExercises: Exercise[] = [
  // Грудь
  {
    id: "db-incline-press",
    name: "Жим гантелей на наклонной",
    primary: "chest",
    secondary: ["delts"],
    effectiveness: 94,
    difficulty: "medium",
    equipment: "dumbbell",
    note: "Больше растяжения и амплитуды, чем в штанге",
  },
  {
    id: "bb-bench",
    name: "Жим штанги лёжа",
    primary: "chest",
    secondary: ["delts", "traps"],
    effectiveness: 88,
    difficulty: "medium",
    equipment: "barbell",
    note: "База на силу, верх груди недогружен",
  },
  {
    id: "weighted-dips",
    name: "Отжимания на брусьях с весом",
    primary: "chest",
    secondary: ["delts"],
    effectiveness: 82,
    difficulty: "high",
    equipment: "bodyweight",
    note: "Требует стабильных плеч, наклон корпуса вперёд",
  },
  {
    id: "cable-fly",
    name: "Сведения в кроссовере",
    primary: "chest",
    secondary: [],
    effectiveness: 76,
    difficulty: "low",
    equipment: "cable",
    note: "Изоляция, хорошо добивает после базы",
  },
  {
    id: "machine-press",
    name: "Жим в тренажёре",
    primary: "chest",
    secondary: [],
    effectiveness: 64,
    difficulty: "low",
    equipment: "machine",
  },

  // Плечи
  {
    id: "db-shoulder-press",
    name: "Жим гантелей сидя",
    primary: "delts",
    secondary: ["traps"],
    effectiveness: 91,
    difficulty: "medium",
    equipment: "dumbbell",
  },
  {
    id: "lateral-raise",
    name: "Махи гантелей в стороны",
    primary: "delts",
    secondary: [],
    effectiveness: 87,
    difficulty: "low",
    equipment: "dumbbell",
    note: "Средний пучок — именно он делает плечи шире",
  },
  {
    id: "ohp",
    name: "Жим штанги стоя",
    primary: "delts",
    secondary: ["traps", "abs"],
    effectiveness: 83,
    difficulty: "high",
    equipment: "barbell",
    note: "Нужна подвижность плеча и жёсткий корпус",
  },
  {
    id: "rear-delt-fly",
    name: "Махи в наклоне",
    primary: "delts",
    secondary: ["traps"],
    effectiveness: 74,
    difficulty: "low",
    equipment: "dumbbell",
  },

  // Бицепс
  {
    id: "bb-curl",
    name: "Подъём штанги на бицепс",
    primary: "biceps",
    secondary: ["forearms"],
    effectiveness: 89,
    difficulty: "low",
    equipment: "barbell",
  },
  {
    id: "chin-up",
    name: "Подтягивания обратным хватом",
    primary: "biceps",
    secondary: ["forearms"],
    effectiveness: 84,
    difficulty: "medium",
    equipment: "bodyweight",
  },
  {
    id: "preacher-curl",
    name: "Сгибания на скамье Скотта",
    primary: "biceps",
    secondary: [],
    effectiveness: 80,
    difficulty: "low",
    equipment: "dumbbell",
    note: "Читинг исключён — работает только целевая мышца",
  },
  {
    id: "hammer-curl",
    name: "Молотковые сгибания",
    primary: "biceps",
    secondary: ["forearms"],
    effectiveness: 77,
    difficulty: "low",
    equipment: "dumbbell",
  },

  // Пресс
  {
    id: "cable-crunch",
    name: "Скручивания на блоке",
    primary: "abs",
    secondary: ["obliques"],
    effectiveness: 88,
    difficulty: "low",
    equipment: "cable",
    note: "Единственное, где прессу можно добавлять вес",
  },
  {
    id: "hanging-leg-raise",
    name: "Подъём ног в висе",
    primary: "abs",
    secondary: ["forearms"],
    effectiveness: 85,
    difficulty: "high",
    equipment: "bodyweight",
  },
  {
    id: "ab-wheel",
    name: "Ролик для пресса",
    primary: "abs",
    secondary: ["obliques"],
    effectiveness: 81,
    difficulty: "high",
    equipment: "bodyweight",
  },
  {
    id: "plank-weighted",
    name: "Планка с весом",
    primary: "abs",
    secondary: ["obliques"],
    effectiveness: 72,
    difficulty: "medium",
    equipment: "bodyweight",
  },

  // Косые
  {
    id: "cable-woodchop",
    name: "Дровосек на блоке",
    primary: "obliques",
    secondary: ["abs"],
    effectiveness: 84,
    difficulty: "medium",
    equipment: "cable",
  },
  {
    id: "side-plank",
    name: "Боковая планка",
    primary: "obliques",
    secondary: ["abs"],
    effectiveness: 80,
    difficulty: "medium",
    equipment: "bodyweight",
  },
  {
    id: "db-side-bend",
    name: "Наклоны с гантелей",
    primary: "obliques",
    secondary: [],
    effectiveness: 72,
    difficulty: "low",
    equipment: "dumbbell",
  },

  // Квадрицепс
  {
    id: "back-squat",
    name: "Приседания со штангой",
    primary: "quads",
    secondary: ["abs", "calves"],
    effectiveness: 95,
    difficulty: "high",
    equipment: "barbell",
    note: "Самое эффективное, но техника решает всё",
  },
  {
    id: "leg-press",
    name: "Жим ногами",
    primary: "quads",
    secondary: ["calves"],
    effectiveness: 86,
    difficulty: "low",
    equipment: "machine",
    note: "Почти вся польза приседа без нагрузки на спину",
  },
  {
    id: "smith-squat",
    name: "Приседания в Смите",
    primary: "quads",
    secondary: [],
    effectiveness: 79,
    difficulty: "medium",
    equipment: "machine",
  },
  {
    id: "db-lunge",
    name: "Выпады с гантелями",
    primary: "quads",
    secondary: ["calves", "abs"],
    effectiveness: 76,
    difficulty: "medium",
    equipment: "dumbbell",
  },
  {
    id: "leg-extension",
    name: "Разгибания ног",
    primary: "quads",
    secondary: [],
    effectiveness: 71,
    difficulty: "low",
    equipment: "machine",
  },

  // Икры
  {
    id: "standing-calf-raise",
    name: "Подъёмы на носки стоя",
    primary: "calves",
    secondary: [],
    effectiveness: 90,
    difficulty: "low",
    equipment: "machine",
  },
  {
    id: "leg-press-calf",
    name: "Подъёмы на носки в жиме ногами",
    primary: "calves",
    secondary: [],
    effectiveness: 84,
    difficulty: "low",
    equipment: "machine",
  },
  {
    id: "seated-calf-raise",
    name: "Подъёмы на носки сидя",
    primary: "calves",
    secondary: [],
    effectiveness: 78,
    difficulty: "low",
    equipment: "machine",
    note: "Камбаловидная — работает при согнутом колене",
  },

  // Трапеции
  {
    id: "db-shrug",
    name: "Шраги с гантелями",
    primary: "traps",
    secondary: ["forearms"],
    effectiveness: 88,
    difficulty: "low",
    equipment: "dumbbell",
  },
  {
    id: "bb-shrug",
    name: "Шраги со штангой",
    primary: "traps",
    secondary: ["forearms"],
    effectiveness: 85,
    difficulty: "low",
    equipment: "barbell",
  },
  {
    id: "upright-row",
    name: "Тяга к подбородку",
    primary: "traps",
    secondary: ["delts"],
    effectiveness: 70,
    difficulty: "medium",
    equipment: "barbell",
  },

  // Предплечья
  {
    id: "farmers-walk",
    name: "Фермерская прогулка",
    primary: "forearms",
    secondary: ["traps", "abs"],
    effectiveness: 86,
    difficulty: "low",
    equipment: "dumbbell",
  },
  {
    id: "wrist-curl",
    name: "Сгибания в запястьях",
    primary: "forearms",
    secondary: [],
    effectiveness: 82,
    difficulty: "low",
    equipment: "barbell",
  },
  {
    id: "reverse-curl",
    name: "Обратные сгибания",
    primary: "forearms",
    secondary: ["biceps"],
    effectiveness: 74,
    difficulty: "low",
    equipment: "barbell",
  },
];

/** Топ упражнений для мышцы — от самого эффективного к наименее */
export function exercisesFor(muscleId: MuscleId): Exercise[] {
  return demoExercises
    .filter((e) => e.primary === muscleId)
    .sort((a, b) => b.effectiveness - a.effectiveness);
}
