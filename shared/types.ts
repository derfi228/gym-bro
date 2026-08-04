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
  sex: Sex;
  /** см */
  heightCm: number;
  /** кг */
  weightKg: number;
  ageYears: number;
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
  | "biceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "calves";

export interface Muscle {
  id: MuscleId;
  /** Название для интерфейса */
  name: string;
}

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

/**
 * Схема тела на конкретную дату — то, что рисуется на «человеке».
 * Строится из фото пользователя + записанных тренировок.
 */
export interface BodyMap {
  userId: string;
  /** ISO-дата начала недели */
  weekStart: string;
  loads: MuscleLoad[];
  /** URL фото в Supabase storage, если пользователь его загрузил */
  photoUrl?: string;
}

/* ── Упражнения ───────────────────────────────────────────────────────────── */

export type Difficulty = "low" | "medium" | "high";

export interface Exercise {
  id: string;
  name: string;
  /** Основная прорабатываемая мышца */
  primary: MuscleId;
  /** Дополнительно вовлечённые мышцы */
  secondary: MuscleId[];
  /** Эффективность для primary-мышцы, 0..100 */
  effectiveness: number;
  /** Сложность техники */
  difficulty: Difficulty;
  equipment: Equipment;
  /** Короткое пояснение: за счёт чего работает / на что смотреть */
  note?: string;
}

export type Equipment = "barbell" | "dumbbell" | "machine" | "bodyweight" | "cable";

/* ── Тренировки и программы ───────────────────────────────────────────────── */

export interface ExerciseSet {
  reps: number;
  /** кг; отсутствует для упражнений с собственным весом */
  weightKg?: number;
  /** Выполненный подход или ещё запланированный */
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: ExerciseSet[];
  /** Пауза между подходами, сек — приложение отсчитывает её само */
  restSec: number;
}

export interface Workout {
  id: string;
  userId: string;
  /** ISO-дата */
  date: string;
  exercises: WorkoutExercise[];
  /** Фактическая длительность, мин */
  durationMin?: number;
  programId?: string;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  /** Под сколько минут собрана программа */
  targetDurationMin: number;
  level: TrainingLevel;
  exercises: WorkoutExercise[];
  /** Программа сгенерирована ИИ-помощником, а не выбрана из готовых */
  aiGenerated: boolean;
}

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

/* ── Абонемент ────────────────────────────────────────────────────────────── */

export type SubscriptionPlan = "free" | "gymbro";

export type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled";

/**
 * Доступ к платным функциям. План "gymbro" открывает ИИ-помощника.
 */
export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** ISO-даты */
  startedAt: string;
  expiresAt?: string;
}
