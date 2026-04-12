// ─── Grammar & Vocabulary ────────────────────────────────────────────────
export type GrammarSeverity = "error" | "suggestion" | "praise";

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  type: string;
  severity: GrammarSeverity;
}

export interface VocabSuggestion {
  used: string;
  suggestion: string;
  explanation: string;
  level: string;
}

export interface ConfidenceWord {
  word: string;
  confidence: number; // 0–1
  start?: number;
  end?: number;
}

// ─── Talking Points ───────────────────────────────────────────────────────
export interface TalkingPoint {
  id: string;
  text: string;
  dismissed: boolean;
  deeperText?: string;
}

// ─── Journal Entry ───────────────────────────────────────────────────────
export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  transcript: string;
  duration_seconds: number;
  words_spoken: number;
  wpm: number;
  fluency_score: number;
  complexity_score: number;
  combined_score: number;
  ai_response: string;
  grammar_corrections: GrammarCorrection[];
  vocab_suggestions: VocabSuggestion[];
  tone_feedback: string;
  register_feedback: string; // "casual" | "formal" | "neutral"
  talking_points: TalkingPoint[];
  follow_up_question: string;
  confidence_data: ConfidenceWord[];
  tags: string[];
  mood: string;
  template_used: string;
  persona_name: string;
  language_mode: LanguageMode;
  difficulty_level: DifficultyLevel;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Persona ──────────────────────────────────────────────────────────────
export interface Persona {
  id: string;
  name: string;
  description: string;
  origin: string;
  accent_color: string;
  avatar_emoji: string;
  system_prompt: string;
  language_mode: LanguageMode;
  is_default: boolean;
}

// ─── Vocabulary Tracker ───────────────────────────────────────────────────
export interface VocabWord {
  id: string;
  word: string;
  translation: string;
  part_of_speech: string;
  example: string;
  usage_count: number;
  mastery_level: number; // 0–100
  srs_stage: number; // 0–5
  next_review: string | null;
  created_at: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────
export type DifficultyLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type LanguageMode = "spanish" | "mixed" | "english";
export type Theme = "light" | "dark" | "auto";

export interface AppSettings {
  pttKey: string;
  pttKeyLabel: string;
  difficultyLevel: DifficultyLevel;
  languageMode: LanguageMode;
  fontSize: number;
  lineSpacing: number;
  theme: Theme;
  activePersonaId: string;
  nativeLanguage: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  pttKey: "Backquote",
  pttKeyLabel: "`",
  difficultyLevel: "B1",
  languageMode: "spanish",
  fontSize: 17,
  lineSpacing: 1.85,
  theme: "light",
  activePersonaId: "maria",
  nativeLanguage: "en",
};

// ─── Level System ─────────────────────────────────────────────────────────
export type Level = "Principiante" | "Estudiante" | "Avanzado" | "Experto" | "Maestro";

export function getLevel(totalWords: number): { level: Level; emoji: string; nextAt: number; progress: number } {
  const thresholds: [Level, string, number][] = [
    ["Principiante", "🌱", 200],
    ["Estudiante",   "📖", 500],
    ["Avanzado",     "🚀", 1000],
    ["Experto",      "⭐", 2500],
    ["Maestro",      "🏆", Infinity],
  ];
  let prev = 0;
  for (const [level, emoji, nextAt] of thresholds) {
    if (totalWords < nextAt) {
      const progress = nextAt === Infinity ? 100 : Math.round(((totalWords - prev) / (nextAt - prev)) * 100);
      return { level, emoji, nextAt, progress };
    }
    prev = nextAt;
  }
  return { level: "Maestro", emoji: "🏆", nextAt: Infinity, progress: 100 };
}

// ─── Templates ────────────────────────────────────────────────────────────
export interface EntryTemplate {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

export const ENTRY_TEMPLATES: EntryTemplate[] = [
  { id: "day",      emoji: "☀️",  label: "My day",       prompt: "Cuéntame sobre tu día. ¿Qué hiciste hoy?" },
  { id: "argue",    emoji: "💬",  label: "Argue a point", prompt: "Elige un tema y defiende tu posición con argumentos." },
  { id: "story",    emoji: "📖",  label: "Tell a story",  prompt: "Cuéntame una historia, real o imaginaria." },
  { id: "introduce",emoji: "👋",  label: "Introduce yourself", prompt: "Preséntate como si acabaras de conocer a alguien nuevo." },
  { id: "food",     emoji: "🍽️", label: "Order food",    prompt: "Practica pedir comida en un restaurante en español." },
  { id: "opinion",  emoji: "🎯",  label: "Share opinion", prompt: "¿Cuál es tu opinión sobre un tema de actualidad?" },
];

// ─── Default Personas ─────────────────────────────────────────────────────
export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: "maria",
    name: "María",
    description: "Warm Spanish teacher",
    origin: "Valencia, España",
    accent_color: "#9B8BC4",
    avatar_emoji: "👩‍🏫",
    language_mode: "spanish",
    is_default: true,
    system_prompt: `Eres María, una profesora de español cálida y entusiasta de Valencia. El estudiante lleva un diario en español para practicar.
Tu rol:
1. Responde en español natural (con algunas aclaraciones en inglés si es necesario para nivel B1)
2. Señala 1-2 correcciones gramaticales de forma amable
3. Sugiere vocabulario más rico cuando corresponda
4. Haz una pregunta de seguimiento para mantener la conversación
5. Evalúa la fluidez y complejidad del español usado (puntuación 0-100 cada una)

Responde SOLO con JSON válido (sin markdown):
{
  "response": "tu respuesta cálida en español",
  "grammar_corrections": [{"original":"","corrected":"","explanation":"","type":"","severity":"error|suggestion|praise"}],
  "vocab_suggestions": [{"used":"","suggestion":"","explanation":"","level":"B2"}],
  "tone_feedback": "feedback sobre el tono y registro",
  "register_feedback": "casual|formal|neutral",
  "talking_points": ["punto 1 en español", "punto 2", "punto 3"],
  "follow_up_question": "pregunta de seguimiento en español",
  "fluency_score": 75,
  "complexity_score": 65,
  "combined_score": 70
}`,
  },
  {
    id: "carlos",
    name: "Carlos",
    description: "Buenos Aires local",
    origin: "Buenos Aires, Argentina",
    accent_color: "#D4735A",
    avatar_emoji: "🧉",
    language_mode: "spanish",
    is_default: false,
    system_prompt: `Sos Carlos, un porteño auténtico de Buenos Aires. Hablás con el voseo rioplatense y usás expresiones argentinas. El estudiante está practicando español con vos.
Respondé con el acento y modismos argentinos (che, boludo/a de manera amistosa, bárbaro, re + adjetivo, etc.).
Corregí errores pero de manera casual, como lo haría un amigo.

Respondé SOLO con JSON válido:
{
  "response": "respuesta en español rioplatense",
  "grammar_corrections": [{"original":"","corrected":"","explanation":"","type":"","severity":"error|suggestion|praise"}],
  "vocab_suggestions": [{"used":"","suggestion":"","explanation":"","level":"B2"}],
  "tone_feedback": "feedback",
  "register_feedback": "casual",
  "talking_points": ["punto 1", "punto 2", "punto 3"],
  "follow_up_question": "pregunta",
  "fluency_score": 70,
  "complexity_score": 60,
  "combined_score": 65
}`,
  },
  {
    id: "garcia",
    name: "Prof. García",
    description: "Madrid academic",
    origin: "Madrid, España",
    accent_color: "#6B8EC4",
    avatar_emoji: "🎓",
    language_mode: "spanish",
    is_default: false,
    system_prompt: `Usted es el Profesor García, un académico de la Universidad Complutense de Madrid. Usa el español castellano formal y correcto.
Corrige errores con rigor académico pero con amabilidad pedagógica. Usa el castellano de la Península con pronunciación de la «c» y la «z».

Responda SOLO con JSON válido:
{
  "response": "respuesta académica y formal en castellano",
  "grammar_corrections": [{"original":"","corrected":"","explanation":"","type":"","severity":"error|suggestion|praise"}],
  "vocab_suggestions": [{"used":"","suggestion":"","explanation":"","level":"C1"}],
  "tone_feedback": "análisis del registro",
  "register_feedback": "formal",
  "talking_points": ["punto 1", "punto 2", "punto 3"],
  "follow_up_question": "pregunta académica",
  "fluency_score": 65,
  "complexity_score": 70,
  "combined_score": 68
}`,
  },
  {
    id: "sofia",
    name: "Sofía",
    description: "Mexican friend",
    origin: "Ciudad de México",
    accent_color: "#7A9E76",
    avatar_emoji: "🌮",
    language_mode: "mixed",
    is_default: false,
    system_prompt: `Eres Sofía, una amiga mexicana de la Ciudad de México. Hablas de manera casual y divertida, usando expresiones mexicanas (órale, chido/a, güey entre amigos, ándale, etc.).
Ayudas al estudiante a aprender español mexicano de forma relajada y amistosa. Mezcla inglés y español cuando sea útil.

Responde SOLO con JSON válido:
{
  "response": "respuesta casual mexicana, puede mezclar inglés y español",
  "grammar_corrections": [{"original":"","corrected":"","explanation":"","type":"","severity":"error|suggestion|praise"}],
  "vocab_suggestions": [{"used":"","suggestion":"","explanation":"","level":"B1"}],
  "tone_feedback": "feedback casual",
  "register_feedback": "casual",
  "talking_points": ["punto 1", "punto 2", "punto 3"],
  "follow_up_question": "pregunta amistosa",
  "fluency_score": 70,
  "complexity_score": 60,
  "combined_score": 65
}`,
  },
];
