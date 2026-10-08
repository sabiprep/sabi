import { SubjectName } from '../types';

export interface TopicFrequency {
  topic: string;
  subtopics: string[];
  frequencyTier: 'High-Yield (Must-Master)' | 'Medium-Yield' | 'Low-Yield';
  percentageOfExam: number; // e.g. 25% of subject's questions
  examCountIn10Years: number; // appearances out of 10 years (e.g. 10/10)
  keyConceptsToMemorize: string[];
  typicalQuestionStyle: string;
  commonPitfalls: string;
}

export interface SubjectSyllabusAnalysis {
  subject: SubjectName;
  totalTopics: number;
  highYieldTopicsCount: number;
  examPatternSummary: string;
  officialTotalQuestions: number; // e.g. 60 for English, 40 for others
  timeAllocatedMinutes: number;
  topics: TopicFrequency[];
}

export const SYLLABUS_FREQUENCY_DATA: Record<string, SubjectSyllabusAnalysis> = {
  'English Language': {
    subject: 'English Language',
    totalTopics: 6,
    highYieldTopicsCount: 3,
    officialTotalQuestions: 60,
    timeAllocatedMinutes: 45,
    examPatternSummary: 'English comprises 60 questions: Comprehension & Summary (15 Qs), The Life Changer Novel (10 Qs), Lexis & Structure (25 Qs), and Oral English (10 Qs).',
    topics: [
      {
        topic: 'Lexis and Structure',
        subtopics: ['Synonyms & Antonyms', 'Prepositions & Collocations', 'Sentence Concord & Proximity', 'Idioms & Phrasal Verbs', 'Clauses & Modals'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 42,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Proximity concord (neither...nor follows nearest subject)', 'Irregular plural nouns', 'Collocations with prepositions (comply with, exempt from)'],
        typicalQuestionStyle: 'Sentence completion with 4 subtle grammatical distractors.',
        commonPitfalls: 'Confusing plural nouns with singular agreement in inverted sentence structures.'
      },
      {
        topic: 'Comprehension & Summary',
        subtopics: ['Unseen Passage 1', 'Unseen Passage 2', 'Figure of Speech Identification', 'Central Theme & Tone'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 25,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Contextual vocabulary meaning', 'Tone (skeptical, optimistic, indifferent)', 'Metaphor vs Metonymy vs Irony'],
        typicalQuestionStyle: '2 passages with 5 questions each assessing inference and grammatical function of clauses.',
        commonPitfalls: 'Bringing outside knowledge instead of sticking strictly to author statements.'
      },
      {
        topic: 'Prescribed Novel (The Life Changer)',
        subtopics: ['Character motivations', 'Plot milestones (EMDC trial, Mercedes Benz incident)', 'Themes of deception & education'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 17,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Salma, Ummi, Omar, Habib, Labaran character profiles', 'Lafia setting vs University campus', 'Hakimi village leadership'],
        typicalQuestionStyle: 'Direct recall of quotes, minor character roles, and specific chapter episodes.',
        commonPitfalls: 'Forgetting secondary characters like Talle (the quiet one) and Habib’s driver.'
      },
      {
        topic: 'Oral English & Phonetics',
        subtopics: ['Monophthongs & Diphthongs', 'Silent Consonants', 'Rhyme Schemes', 'Emphatic Stress'],
        frequencyTier: 'Medium-Yield',
        percentageOfExam: 16,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Silent "b" in doubt/debt', 'Silent "k" in knuckle', 'Vowel length contrast /iː/ vs /ɪ/', 'Emphatic stress rules (capitalized word is the focus)'],
        typicalQuestionStyle: 'Identify the word with the same vowel sound, or pick the question that elicited the stressed sentence.',
        commonPitfalls: 'Pronouncing silent letters or judging sounds by spelling letters rather than phonemes.'
      }
    ]
  },
  'Mathematics': {
    subject: 'Mathematics',
    totalTopics: 5,
    highYieldTopicsCount: 3,
    officialTotalQuestions: 40,
    timeAllocatedMinutes: 40,
    examPatternSummary: 'Mathematics comprises 40 questions spanning Number & Numeration (25%), Algebra (30%), Geometry & Trigonometry (25%), and Calculus & Statistics (20%).',
    topics: [
      {
        topic: 'Algebra',
        subtopics: ['Quadratic Equations & Roots', 'Simultaneous Linear Equations', 'Surds & Indices', 'Polynomials & Factor Theorem', 'Logarithms'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 32,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Sum and product of roots ($\\alpha+\\beta=-b/a$, $\\alpha\\beta=c/a$)', 'Surds rationalization: $(a+\\sqrt{b})(a-\\sqrt{b})=a^2-b$', 'Log rules: $\\log(xy)=\\log x+\\log y$'],
        typicalQuestionStyle: 'Direct algebraic evaluation, find values of unknown constants $k$ for equal roots.',
        commonPitfalls: 'Sign errors when moving terms across brackets or expanding $(x-y)^2$.'
      },
      {
        topic: 'Calculus',
        subtopics: ['Differentiation (Product & Quotient)', 'Integration & Definite Integrals', 'Maxima & Minima', 'Rates of Change'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 22,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Power rule: $d/dx(x^n) = nx^{n-1}$', 'Integration: $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$', 'Turning point occurs when $dy/dx = 0$'],
        typicalQuestionStyle: 'Calculate the rate of change or area under a curve between limits $x=1$ to $x=3$.',
        commonPitfalls: 'Forgetting the constant of integration $C$ or confusing differentiation with integration operations.'
      },
      {
        topic: 'Geometry & Trigonometry',
        subtopics: ['Circle Theorems', 'Trig Identities & Angles of Elevation', 'Coordinate Geometry (Slope & Distance)', 'Sine and Cosine Rules'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 24,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Angle at center = $2\\times$ angle at circumference', 'Angles in the same segment are equal', '$\\sin^2\\theta + \\cos^2\\theta = 1$', 'Distance formula: $\\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$'],
        typicalQuestionStyle: 'Find the unknown angle $\\theta$ subtended by a tangent chord or compute gradient perpendicular $m_1 m_2 = -1$.',
        commonPitfalls: 'Using sine rule when cosine rule is required (knowing two sides and included angle).'
      },
      {
        topic: 'Statistics & Probability',
        subtopics: ['Mean, Median, Mode of Grouped Data', 'Permutations & Combinations', 'Independent & Mutually Exclusive Events'],
        frequencyTier: 'Medium-Yield',
        percentageOfExam: 14,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Probability: $P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$', 'Standard deviation and variance formula', '$^nC_r = \\frac{n!}{r!(n-r)!}$'],
        typicalQuestionStyle: 'Marbles without replacement, frequency table median computation.',
        commonPitfalls: 'Forgetting that denominator decreases in probability without replacement.'
      },
      {
        topic: 'Number & Numeration',
        subtopics: ['Number Bases', 'Modular Arithmetic', 'Sets and Venn Diagrams', 'Binary Operations'],
        frequencyTier: 'Low-Yield',
        percentageOfExam: 8,
        examCountIn10Years: 8,
        keyConceptsToMemorize: ['Conversion from Base $n$ to Base 10', 'Identity element $e$: $a * e = a$', 'Inverse element: $a * a^{-1} = e$'],
        typicalQuestionStyle: 'Solve for base $x$ in equations like $23_x + 14_x = 41_x$.',
        commonPitfalls: 'Treating modular negative numbers incorrectly (e.g. $-3 \\pmod 7 \\equiv 4$).'
      }
    ]
  },
  'Physics': {
    subject: 'Physics',
    totalTopics: 5,
    highYieldTopicsCount: 3,
    officialTotalQuestions: 40,
    timeAllocatedMinutes: 40,
    examPatternSummary: 'Physics comprises 40 questions dominated by Mechanics (30%), Waves & Optics (25%), and Electricity & Magnetism (25%).',
    topics: [
      {
        topic: 'Mechanics',
        subtopics: ['Equations of Motion', 'Projectiles & Trajectory', 'Work, Energy & Power', 'Newton Laws of Motion', 'Friction & Circular Motion'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 32,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['$v^2 = u^2 + 2as$', 'Range of projectile: $R = \\frac{u^2 \\sin 2\\theta}{g}$', 'Centripetal force: $F = \\frac{mv^2}{r}$', 'Conservation of linear momentum: $m_1 u_1 + m_2 u_2 = (m_1+m_2)v$'],
        typicalQuestionStyle: 'Calculate maximum height reached by projectile or tension in an accelerating cable.',
        commonPitfalls: 'Forgetting that vertical velocity at maximum height is zero while horizontal velocity remains constant.'
      },
      {
        topic: 'Waves and Optics',
        subtopics: ['Wave Equation ($v=f\\lambda$)', 'Snell Law & Refraction', 'Total Internal Reflection & Critical Angle', 'Lenses & Mirrors Formula', 'Sound Resonance Tubes'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 26,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Critical angle: $\\sin c = 1/n$', 'Mirror formula: $\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}$', 'Fundamental frequency open pipe $f = v/2L$, closed pipe $f = v/4L$'],
        typicalQuestionStyle: 'Find focal length, position of virtual image, or wavelength in a medium with refractive index $n=1.5$.',
        commonPitfalls: 'Sign convention in mirrors (virtual focus has negative focal length for convex mirrors).'
      },
      {
        topic: 'Electricity and Magnetism',
        subtopics: ['Ohm Law & Resistor Networks', 'Capacitors in Series & Parallel', 'Electric Fields & Coulomb Law', 'Electromagnetic Induction (Faraday/Lenz)', 'AC Circuits & Resonance'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 24,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Resistors series $R=R_1+R_2$, parallel $1/R = 1/R_1 + 1/R_2$', 'Capacitors series $1/C = 1/C_1 + 1/C_2$, parallel $C=C_1+C_2$', 'Resonance in AC: $f_0 = \\frac{1}{2\\pi \\sqrt{LC}}$'],
        typicalQuestionStyle: 'Calculate equivalent resistance, energy stored in capacitor ($E=\\frac{1}{2}CV^2$), or peak voltage.',
        commonPitfalls: 'Reversing formulas for series/parallel between resistors and capacitors.'
      },
      {
        topic: 'Thermal Physics',
        subtopics: ['Specific Heat Capacity', 'Latent Heat of Vaporization & Fusion', 'Gas Laws (Boyles & Charles)', 'Thermal Expansion'],
        frequencyTier: 'Medium-Yield',
        percentageOfExam: 12,
        examCountIn10Years: 9,
        keyConceptsToMemorize: ['$Q = mc\\Delta\\theta$', '$Q = mL$', 'Ideal gas equation: $\\frac{P_1 V_1}{T_1} = \\frac{P_2 V_2}{T_2}$ (Temperature in Kelvin!)'],
        typicalQuestionStyle: 'Mixture of hot metal dropped into cold water in a calorimeter.',
        commonPitfalls: 'Using Celsius instead of Kelvin in gas law calculations.'
      },
      {
        topic: 'Modern Physics',
        subtopics: ['Photoelectric Effect & Photons', 'Radioactivity & Half-life', 'Nuclear Fission & Fusion'],
        frequencyTier: 'Low-Yield',
        percentageOfExam: 6,
        examCountIn10Years: 7,
        keyConceptsToMemorize: ['Einstein photoelectric: $E = hf = W_0 + K_{max}$', 'Half-life decay: $N = N_0 (1/2)^n$'],
        typicalQuestionStyle: 'Calculate threshold frequency or remaining mass after 3 half-lives.',
        commonPitfalls: 'Confusing electron-volts (eV) with Joules ($1\\text{ eV} = 1.6\\times 10^{-19}\\text{ J}$).'
      }
    ]
  },
  'Chemistry': {
    subject: 'Chemistry',
    totalTopics: 5,
    highYieldTopicsCount: 3,
    officialTotalQuestions: 40,
    timeAllocatedMinutes: 40,
    examPatternSummary: 'Chemistry comprises 40 questions evenly balanced between Physical, Inorganic, and Organic Chemistry.',
    topics: [
      {
        topic: 'Physical Chemistry & Stoichiometry',
        subtopics: ['Mole Concept & Gas Volumes', 'Chemical Equilibrium (Le Chatelier)', 'Acids, Bases, pH & Titration', 'Electrochemistry & Faradays Laws', 'Thermodynamics ($\\Delta H$)'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 36,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Molar volume at s.t.p. = $22.4\\text{ dm}^3$', '$Q = It$ and $m = \\frac{M \\cdot I \\cdot t}{n \\cdot F}$', 'pH = $-\\log[H^+]$', 'Le Chatelier: pressure increases shift to side with fewer gas moles'],
        typicalQuestionStyle: 'Calculate mass deposited at cathode, empirical formula, or buffer pH.',
        commonPitfalls: 'Forgetting the number of electrons $n$ in Faraday electrolysis calculations (e.g. $Cu^{2+}$ requires $2F$).'
      },
      {
        topic: 'Organic Chemistry',
        subtopics: ['Alkanes, Alkenes, Alkynes', 'Alkanols & Esterification', 'Isomerism (Structural & Geometric)', 'Petroleum Refining & Cracking', 'Polymers & Biomolecules'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 28,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['General formulas: $C_nH_{2n+2}$, $C_nH_{2n}$, $C_nH_{2n-2}$', 'Esterification: Acid + Alcohol $\\rightarrow$ Ester + Water (sweet smell)', 'Addition reactions of double bonds'],
        typicalQuestionStyle: 'Identify IUPAC name, functional group, or product of hydration.',
        commonPitfalls: 'Incorrect IUPAC numbering of carbon chains with branched alkyl groups.'
      },
      {
        topic: 'Inorganic Chemistry & Periodic Table',
        subtopics: ['Periodic Trends (Ionization, Electronegativity)', 'Halogens & Transition Metals', 'Oxides & Acid rain', 'Qualitative Analysis (Gas tests)'],
        frequencyTier: 'High-Yield (Must-Master)',
        percentageOfExam: 22,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Atomic radius decreases across period, increases down group', 'Brown ring test for nitrates', 'Gas tests ($SO_2$ turns acidified $K_2Cr_2O_7$ green)'],
        typicalQuestionStyle: 'Predict reactivity, identify unknown gas evolved from salt test.',
        commonPitfalls: 'Confusing chlorine bleaching (permanent) with $SO_2$ bleaching (temporary).'
      },
      {
        topic: 'Atomic Structure & Bonding',
        subtopics: ['Electronic Configuration (Aufbau/Hund)', 'Ionic, Covalent & Hydrogen Bonding', 'Radioactivity & Isotopes'],
        frequencyTier: 'Medium-Yield',
        percentageOfExam: 14,
        examCountIn10Years: 10,
        keyConceptsToMemorize: ['Hydrogen bonding in $H_2O$ and $HF$ explains anomalously high boiling point', 'Anomalous electronic configurations: Chromium ($[Ar]4s^1 3d^5$) and Copper ($[Ar]4s^1 3d^{10}$)'],
        typicalQuestionStyle: 'Draw or deduce electron configuration of $Fe^{3+}$ ion or identify shape of molecule ($sp^3$ tetrahedral).',
        commonPitfalls: 'Removing 3d electrons before 4s when ionizing transition metals.'
      }
    ]
  }
};
