/**
 * Общие типы данных для сайта (web) и приложения (mobile).
 *
 * По конвенции проекта модель данных меняется ТОЛЬКО здесь,
 * синхронно для обеих платформ.
 */

/* ── Пользователь ─────────────────────────────────────────────────────────── */

export type Sex = "male" | "female";

export interface UserProfile {
  id: string;
  name: string;
  /** Поля ниже необязательны: профиль заводится пустым вместе с аккаунтом */
  sex?: Sex;
  /** см */
  heightCm?: number;
  /** кг */
  weightKg?: number;
  /**
   * Год рождения, а не возраст: возраст, записанный однажды, через год
   * становится неверным, а пересчитывать его по дате записи негде.
   */
  birthYear?: number;
  /** Опыт тренировок — влияет на подбор программ */
  level: TrainingLevel;
  createdAt: string;
}

export type TrainingLevel = "novice" | "intermediate" | "advanced";

/* ── Мышцы и анализ тела ──────────────────────────────────────────────────── */

export type MuscleId =
  | "traps"
  | "delts"
  | "chest"
  | "back"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

/** На какой проекции схемы видна мышца */
export type BodyView = "front" | "back";

/**
 * Недельная нагрузка на мышцу: сколько рабочих подходов сделано
 * относительно целевого объёма, рассчитанного от роста/веса/возраста.
 */
export interface MuscleLoad {
  muscleId: MuscleId;
  setsDone: number;
  setsTarget: number;
  /** setsDone / setsTarget; > 1 — риск перетренированности */
  ratio: number;
}

/* ── Упражнения ───────────────────────────────────────────────────────────── */

export type Difficulty = "low" | "medium" | "high";

/**
 * Насколько цифра эффективности подкреплена данными.
 * - emg: ЭМГ-активация в % от лучшего упражнения того же исследования
 * - ranking: исследование дало порядок, но не публиковало проценты
 * - estimate: исследования нет, значение экспертное
 *
 * Важно: ЭМГ показывает острую активацию, а не прирост мышцы.
 * Это ориентир при выборе упражнения, а не прогноз гипертрофии.
 */
export type EvidenceLevel = "emg" | "ranking" | "estimate";

export interface StudySource {
  id: string;
  /** Короткая подпись для интерфейса */
  label: string;
  /** Что именно измеряли */
  note: string;
}

/**
 * Насколько мышца вовлечена в упражнение, 0..1.
 * Используется для подсветки на схеме тела: чем выше, тем ярче.
 */
export type Involvement = Partial<Record<MuscleId, number>>;

export interface Exercise {
  id: string;
  name: string;
  /** Основная прорабатываемая мышца */
  primary: MuscleId;
  /** Дополнительно вовлечённые мышцы */
  secondary: MuscleId[];
  /** Вовлечённость по группам, включая primary */
  involvement: Involvement;
  /** Техника и на что смотреть */
  description: string;
  /** ЭМГ-активация целевой мышцы, % от лучшего в исследовании. null — чисел нет */
  emgPercent: number | null;
  /** Место в рейтинге исследования, если проценты не публиковались */
  rank?: number;
  evidence: EvidenceLevel;
  sourceId: string;
  /** Сложность техники */
  difficulty: Difficulty;
  equipment: Equipment;
  /** Короткое пояснение: за счёт чего работает / на что смотреть */
  note?: string;
}

/** Личные веса пользователя в упражнении */
export interface ExerciseWeights {
  exerciseId: string;
  /** Пиковый вес — разовый максимум, кг */
  peakKg?: number;
  /** Рабочий вес, кг */
  workingKg?: number;
}

/* ── Готовые методики ─────────────────────────────────────────────────────── */

/** Один тренировочный день методики */
export interface SplitDay {
  name: string;
  exerciseIds: string[];
}

export interface TrainingSplit {
  id: string;
  name: string;
  /** Из каких тренировок состоит неделя */
  days: SplitDay[];
  /** Как часто каждая группа получает нагрузку за неделю */
  frequencyPerWeek: number;
  daysPerWeek: number;
  /** Подходов на группу в неделю */
  weeklySetsPerMuscle: string;
  repRange: string;
  level: TrainingLevel;
  /** Что об этой методике говорят исследования */
  evidenceNote: string;
  /** Оценка 0..100: насколько методика соответствует данным по объёму и частоте */
  evidenceScore: number;
  sourceId: string;
}

export type Equipment =
  "barbell" | "dumbbell" | "machine" | "bodyweight" | "cable";

/* ── Цели и ИИ-помощник ───────────────────────────────────────────────────── */

export type GoalKind = "lift" | "weight";

/**
 * Персональная цель: «пожать 100 кг до конца лета», «сбросить 5 кг».
 * Помощник оценивает реалистичность и подгоняет программу.
 */
export interface Goal {
  id: string;
  userId: string;
  kind: GoalKind;
  /** Для kind: "lift" — упражнение, в котором нужен результат */
  exerciseId?: string;
  targetValue: number;
  /** ISO-дата дедлайна */
  deadline: string;
  verdict: GoalVerdict;
}

export interface GoalVerdict {
  /** Достижима ли цель к дедлайну по текущей динамике */
  realistic: boolean;
  /** Объяснение вердикта для пользователя */
  reason: string;
  /** Реалистичное значение к дедлайну, если цель завышена */
  suggestedValue?: number;
}

/* ── Челленджи ────────────────────────────────────────────────────────────── */

export interface Challenge {
  id: string;
  title: string;
  description: string;
  /** ISO-дата начала недели, на которую выдан челлендж */
  weekStart: string;
  goalCount: number;
  progress: number;
  /** Челлендж можно проходить вдвоём с другом */
  withFriend: boolean;
  friendId?: string;
  /** Серия недель подряд — «огонёк» */
  streakWeeks: number;
}
