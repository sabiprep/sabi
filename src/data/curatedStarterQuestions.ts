export interface CuratedPracticeQuestion {
  id: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: 'A' | 'B' | 'C' | 'D';
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
}

export const SUBJECT_SHORT_LABELS: Record<string, string> = {
  'English Language': 'English',
  Mathematics: 'Mathematics',
  Physics: 'Physics',
  Chemistry: 'Chemistry',
  Biology: 'Biology',
  Economics: 'Economics',
  Government: 'Government',
  'Literature-in-English': 'Literature',
  Commerce: 'Commerce',
  Geography: 'Geography',
  'Agricultural Science': 'Agric Science',
  'Christian Religious Studies': 'CRS',
  'Islamic Religious Studies': 'IRS',
  'Financial Accounting': 'Accounting',
};

export function getShortSubjectLabel(canonical: string): string {
  return SUBJECT_SHORT_LABELS[canonical] || canonical;
}

export const CURATED_STARTER_QUESTIONS: CuratedPracticeQuestion[] = [
  {
    id: 'SABI-CHM-PT-1',
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    question: 'Which of these elements is a noble gas?',
    options: {
      A: 'Nitrogen',
      B: 'Argon',
      C: 'Chlorine',
      D: 'Oxygen',
    },
    answer: 'B',
    explanationShort:
      'Argon is in Group 18: a full outer shell of 8 electrons, so it hardly reacts.',
    explanationFull:
      'Argon (Ar, atomic number 18) belongs to Group 18 (Group 0) of the periodic table. Because its valence shell already holds 8 electrons (a stable octet), it is chemically inert under normal conditions.',
    explanationPidgin:
      'Argon dey Group 18 — im outer shell full with 8 electrons already, so e no dey rush react with anything.',
  },
  {
    id: 'SABI-CHM-PT-2',
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    question: 'As you move from left to right across Period 3, atomic radius generally:',
    options: {
      A: 'Decreases',
      B: 'Increases',
      C: 'Remains constant',
      D: 'Doubles at Group 14',
    },
    answer: 'A',
    explanationShort:
      'More protons pull the same electron shell tighter toward the nucleus, shrinking the atom.',
    explanationFull:
      'Across a period, electrons are added to the same principal energy level while nuclear charge increases by +1 per step. Stronger electrostatic attraction pulls the outer electrons closer, reducing atomic radius.',
    explanationPidgin:
      'As you waka go right across a period, more protons dey pull the same shell closer to the center, so the atom dey small pass.',
  },
  {
    id: 'SABI-ENG-ANT-1',
    subjectCanonical: 'English Language',
    subjectLabel: 'English',
    topicLabel: 'Antonyms',
    question: 'Choose the word opposite in meaning to "ephemeral" in: Fame is often ephemeral.',
    options: {
      A: 'Brief',
      B: 'Permanent',
      C: 'Fragile',
      D: 'Sudden',
    },
    answer: 'B',
    explanationShort:
      '"Ephemeral" means lasting for a very short time, so its exact opposite is "permanent".',
    explanationFull:
      '"Ephemeral" describes something short-lived or fleeting (like morning dew). "Brief", "fragile", and "sudden" lean similar, while "permanent" means lasting indefinitely.',
    explanationPidgin:
      'Ephemeral mean thing wey no dey last long. The direct opposite na permanent — thing wey dey stay.',
  },
  {
    id: 'SABI-PHY-UNI-1',
    subjectCanonical: 'Physics',
    subjectLabel: 'Physics',
    topicLabel: 'Units',
    question: 'Which of the following is the SI derived unit of electrical resistance?',
    options: {
      A: 'Coulomb',
      B: 'Volt',
      C: 'Ohm',
      D: 'Watt',
    },
    answer: 'C',
    explanationShort:
      'Resistance R = V / I is measured in ohms (Ω), equal to one volt per ampere.',
    explanationFull:
      'By Ohm’s law (R = V / I), electrical resistance is measured in ohms (Ω). Coulomb is charge, Volt is potential difference, and Watt is power.',
    explanationPidgin:
      'Na Ohm (Ω) dem dey use measure electrical resistance — Volt divide by Ampere.',
  },
  {
    id: 'SABI-MTH-LOG-1',
    subjectCanonical: 'Mathematics',
    subjectLabel: 'Mathematics',
    topicLabel: 'Logarithms',
    question: 'Evaluate log₁₀(1000) + log₁₀(0.01).',
    options: {
      A: '5',
      B: '1',
      C: '-1',
      D: '2',
    },
    answer: 'B',
    explanationShort: 'log₁₀(1000) = 3 and log₁₀(0.01) = -2, so 3 + (-2) = 1.',
    explanationFull:
      'Write each term as a power of 10: 1000 = 10³ so log₁₀(1000) = 3, and 0.01 = 10⁻² so log₁₀(0.01) = -2. Adding them gives 3 + (-2) = 1.',
    explanationPidgin:
      '1000 na 10 raise to 3 (so log na 3), 0.01 na 10 raise to minus 2 (so log na -2). 3 plus -2 give you 1.',
  },
  {
    id: 'SABI-CHM-PT-3',
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    question: 'Which halogen is the most electronegative element in the periodic table?',
    options: {
      A: 'Chlorine',
      B: 'Bromine',
      C: 'Iodine',
      D: 'Fluorine',
    },
    answer: 'D',
    explanationShort:
      'Fluorine has a tiny radius and 7 valence electrons, giving it the strongest pull on bonding electrons.',
    explanationFull:
      'Electronegativity increases up a group and across a period toward Group 17. Fluorine sits at the top right of the reactive elements (Pauling value 4.0), making it the most electronegative element.',
    explanationPidgin:
      'Fluorine small well-well and e need just one electron to complete im shell, so na im dey drag electron pass every other element.',
  },
  {
    id: 'SABI-ENG-ANT-2',
    subjectCanonical: 'English Language',
    subjectLabel: 'English',
    topicLabel: 'Antonyms',
    question: 'Choose the word opposite in meaning to "meticulous" in: She kept meticulous records.',
    options: {
      A: 'Careless',
      B: 'Detailed',
      C: 'Thorough',
      D: 'Orderly',
    },
    answer: 'A',
    explanationShort:
      '"Meticulous" means showing extreme care for details; its opposite is "careless".',
    explanationFull:
      'A meticulous person checks every tiny detail carefully. "Detailed", "thorough", and "orderly" are near-synonyms, leaving "careless" as the true antonym.',
    explanationPidgin:
      'Meticulous person dey check every tiny detail sharply. Opposite of dat one na careless.',
  },
  {
    id: 'SABI-PHY-UNI-2',
    subjectCanonical: 'Physics',
    subjectLabel: 'Physics',
    topicLabel: 'Units',
    question: 'Which of these physical quantities is a vector quantity?',
    options: {
      A: 'Mass',
      B: 'Temperature',
      C: 'Displacement',
      D: 'Energy',
    },
    answer: 'C',
    explanationShort:
      'Displacement has both magnitude and a specific direction, making it a vector.',
    explanationFull:
      'Scalar quantities (mass, temperature, energy) have magnitude only. Displacement specifies both how far and in which direction an object moved, so it is a vector.',
    explanationPidgin:
      'Vector get both size and direction. Displacement dey tell you how far you move AND which side you face.',
  },
  {
    id: 'SABI-MTH-LOG-2',
    subjectCanonical: 'Mathematics',
    subjectLabel: 'Mathematics',
    topicLabel: 'Logarithms',
    question: 'If log₂(x) = 5, what is the value of x?',
    options: {
      A: '10',
      B: '25',
      C: '32',
      D: '64',
    },
    answer: 'C',
    explanationShort: 'Convert log₂(x) = 5 to index form: x = 2⁵ = 32.',
    explanationFull:
      'By the definition of a logarithm, log_b(x) = y is equivalent to x = b^y. Here b = 2 and y = 5, so x = 2⁵ = 32.',
    explanationPidgin: 'Carry the base 2 raise am to power 5: 2 × 2 × 2 × 2 × 2 = 32.',
  },
  {
    id: 'SABI-CHM-PT-4',
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    question: 'Elements in Group 1 of the periodic table are collectively called:',
    options: {
      A: 'Alkali metals',
      B: 'Alkaline earth metals',
      C: 'Transition metals',
      D: 'Lanthanides',
    },
    answer: 'A',
    explanationShort:
      'Group 1 metals (Li, Na, K...) react vigorously with water to form alkaline hydroxides.',
    explanationFull:
      'Group 1 elements (excluding hydrogen) are known as alkali metals because they react rapidly with water to produce strong alkalis (metal hydroxides) and hydrogen gas.',
    explanationPidgin:
      'Group 1 metals like Sodium and Potassium na Alkali metals because once dem touch water, dem dey form strong alkali sharp-sharp.',
  },
];

export function getCuratedStarterQuestions(): CuratedPracticeQuestion[] {
  return CURATED_STARTER_QUESTIONS;
}
