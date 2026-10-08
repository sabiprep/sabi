import { SubjectName } from '../types';

export interface CourseBrochure {
  id: string;
  courseName: string;
  faculty: string;
  compulsorySubjects: SubjectName[];
  optionalSubjectPool?: SubjectName[];
  olevelRequirements: string;
  description: string;
  nationalCompetitiveness: 'Ultra-High' | 'High' | 'Moderate' | 'Low';
  averageCutoff: number;
  institutions: {
    name: string;
    type: 'Federal' | 'State' | 'Private';
    state: string;
    meritCutoff: number;
    catchmentCutoff?: number;
    notes?: string;
  }[];
  specialWaivers?: string[];
}

export const JAMB_BROCHURE_COURSES: CourseBrochure[] = [
  {
    id: 'med-surg',
    courseName: 'Medicine & Surgery (MBBS)',
    faculty: 'College of Health Sciences / Clinical Medicine',
    compulsorySubjects: ['English Language', 'Biology', 'Chemistry', 'Physics'],
    olevelRequirements: 'Five (5) SSC credit passes in English Language, Mathematics, Physics, Chemistry and Biology at ONE sitting (most federal universities do not accept two sittings for Medicine).',
    description: 'The most fiercely competitive course in Nigeria. Requires rigorous foundation in the natural sciences and medical diagnostics.',
    nationalCompetitiveness: 'Ultra-High',
    averageCutoff: 285,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 310, catchmentCutoff: 290, notes: 'Aggregate score calculated with O-Level + UTME.' },
      { name: 'University of Ibadan (UI)', type: 'Federal', state: 'Oyo', meritCutoff: 305, catchmentCutoff: 285, notes: 'Nigeria premier medical school.' },
      { name: 'Obafemi Awolowo University (OAU)', type: 'Federal', state: 'Osun', meritCutoff: 295, catchmentCutoff: 280 },
      { name: 'University of Benin (UNIBEN)', type: 'Federal', state: 'Edo', meritCutoff: 285, catchmentCutoff: 275 },
      { name: 'Ahmadu Bello University (ABU Zaria)', type: 'Federal', state: 'Kaduna', meritCutoff: 270, catchmentCutoff: 250 },
      { name: 'University of Nigeria, Nsukka (UNN)', type: 'Federal', state: 'Enugu', meritCutoff: 290, catchmentCutoff: 275 },
      { name: 'Lagos State University (LASU)', type: 'State', state: 'Lagos', meritCutoff: 280, catchmentCutoff: 265 },
      { name: 'Bowen University / Babcock University', type: 'Private', state: 'Ogun/Osun', meritCutoff: 240, notes: 'Immediate admission interview with verified science credentials.' },
    ],
    specialWaivers: [
      'UNILAG requires all 5 credits in ONE single sitting of WAEC/NECO.',
      'UI requires candidate to score minimum of 60% in Post-UTME screening.',
    ]
  },
  {
    id: 'pharmacy',
    courseName: 'Pharmacy (Pharm.D / B.Pharm)',
    faculty: 'Faculty of Pharmacy',
    compulsorySubjects: ['English Language', 'Biology', 'Chemistry', 'Physics'],
    olevelRequirements: 'Five (5) SSC credit passes in English Language, Mathematics, Physics, Chemistry and Biology at not more than two sittings.',
    description: 'Study of pharmaceuticals, drug synthesis, clinical pharmacokinetics and therapeutic patient care.',
    nationalCompetitiveness: 'High',
    averageCutoff: 260,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 285, catchmentCutoff: 270 },
      { name: 'University of Ibadan (UI)', type: 'Federal', state: 'Oyo', meritCutoff: 280, catchmentCutoff: 265 },
      { name: 'Obafemi Awolowo University (OAU)', type: 'Federal', state: 'Osun', meritCutoff: 275, catchmentCutoff: 260 },
      { name: 'University of Benin (UNIBEN)', type: 'Federal', state: 'Edo', meritCutoff: 265, catchmentCutoff: 250 },
      { name: 'Olabisi Onabanjo University (OOU)', type: 'State', state: 'Ogun', meritCutoff: 245, catchmentCutoff: 230 },
    ],
    specialWaivers: [
      'OAU accepts Mathematics in place of Biology for some industrial pharmacy tracks.',
    ]
  },
  {
    id: 'nursing',
    courseName: 'Nursing Science (B.N.Sc)',
    faculty: 'College of Health Sciences / Nursing',
    compulsorySubjects: ['English Language', 'Biology', 'Chemistry', 'Physics'],
    olevelRequirements: 'Five (5) SSC credit passes in English Language, Mathematics, Physics, Chemistry and Biology at ONE or TWO sittings.',
    description: 'Professional healthcare delivery, patient advocacy, midwifery and clinical nursing education.',
    nationalCompetitiveness: 'Ultra-High',
    averageCutoff: 270,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 290, catchmentCutoff: 275 },
      { name: 'University of Ibadan (UI)', type: 'Federal', state: 'Oyo', meritCutoff: 285, catchmentCutoff: 270 },
      { name: 'University of Benin (UNIBEN)', type: 'Federal', state: 'Edo', meritCutoff: 270, catchmentCutoff: 255 },
      { name: 'Lagos State University (LASU)', type: 'State', state: 'Lagos', meritCutoff: 265, catchmentCutoff: 250 },
    ]
  },
  {
    id: 'comp-sci',
    courseName: 'Computer Science',
    faculty: 'Faculty of Science / Computing',
    compulsorySubjects: ['English Language', 'Mathematics', 'Physics'],
    optionalSubjectPool: ['Chemistry', 'Biology', 'Economics', 'Geography'],
    olevelRequirements: 'Five (5) SSC credit passes including English Language, Mathematics, Physics plus two other science subjects (Chemistry, Biology, Further Maths, or Computer Studies).',
    description: 'Algorithms, software engineering, computational logic, data structures, and distributed architectures.',
    nationalCompetitiveness: 'Ultra-High',
    averageCutoff: 265,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 280, catchmentCutoff: 265, notes: 'Chemistry is strongly preferred as 4th subject.' },
      { name: 'University of Ibadan (UI)', type: 'Federal', state: 'Oyo', meritCutoff: 275, catchmentCutoff: 260 },
      { name: 'Federal University of Technology, Akure (FUTA)', type: 'Federal', state: 'Ondo', meritCutoff: 265, catchmentCutoff: 250 },
      { name: 'University of Ilorin (UNILORIN)', type: 'Federal', state: 'Kwara', meritCutoff: 255, catchmentCutoff: 240 },
      { name: 'Covenant University', type: 'Private', state: 'Ogun', meritCutoff: 230, notes: 'Top-ranked private computing faculty.' },
    ],
    specialWaivers: [
      'UNILAG requires Chemistry as the 4th UTME subject for Faculty of Science.',
      'FUTA requires English, Mathematics, Physics and Chemistry.',
    ]
  },
  {
    id: 'law',
    courseName: 'Law (LL.B / Common & Islamic Law)',
    faculty: 'Faculty of Law',
    compulsorySubjects: ['English Language', 'Literature-in-English'],
    optionalSubjectPool: ['Government', 'Christian Religious Studies', 'Islamic Religious Studies', 'History', 'Economics'],
    olevelRequirements: 'Five (5) SSC credit passes in English Language, Mathematics, Literature-in-English and any two Arts or Social Science subjects.',
    description: 'Jurisprudence, constitutional law, international law, civil litigation, and criminal procedure.',
    nationalCompetitiveness: 'Ultra-High',
    averageCutoff: 280,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 300, catchmentCutoff: 285 },
      { name: 'University of Ibadan (UI)', type: 'Federal', state: 'Oyo', meritCutoff: 295, catchmentCutoff: 280 },
      { name: 'Obafemi Awolowo University (OAU)', type: 'Federal', state: 'Osun', meritCutoff: 290, catchmentCutoff: 275 },
      { name: 'University of Benin (UNIBEN)', type: 'Federal', state: 'Edo', meritCutoff: 275, catchmentCutoff: 260 },
      { name: 'Lagos State University (LASU)', type: 'State', state: 'Lagos', meritCutoff: 275, catchmentCutoff: 260 },
      { name: 'Afe Babalola University (ABUAD)', type: 'Private', state: 'Ekiti', meritCutoff: 230, notes: 'Renowned College of Law.' },
    ],
    specialWaivers: [
      'UNILAG and UI insist on Literature-in-English as mandatory.',
      'ABU accepts Arabic or Islamic Studies in place of CRS/Literature for Islamic Law.',
    ]
  },
  {
    id: 'elect-eng',
    courseName: 'Electrical & Electronics Engineering',
    faculty: 'Faculty of Engineering',
    compulsorySubjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
    olevelRequirements: 'Five (5) SSC credit passes in English Language, Mathematics, Physics, Chemistry and any other Science subject (Technical Drawing or Further Mathematics is an asset).',
    description: 'Power systems, microelectronics, telecommunications, robotics, control systems and signal processing.',
    nationalCompetitiveness: 'High',
    averageCutoff: 265,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 285, catchmentCutoff: 270 },
      { name: 'Obafemi Awolowo University (OAU)', type: 'Federal', state: 'Osun', meritCutoff: 275, catchmentCutoff: 260 },
      { name: 'Federal University of Technology, Akure (FUTA)', type: 'Federal', state: 'Ondo', meritCutoff: 260, catchmentCutoff: 245 },
      { name: 'University of Nigeria, Nsukka (UNN)', type: 'Federal', state: 'Enugu', meritCutoff: 265, catchmentCutoff: 250 },
    ]
  },
  {
    id: 'mech-eng',
    courseName: 'Mechanical Engineering',
    faculty: 'Faculty of Engineering',
    compulsorySubjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
    olevelRequirements: 'Five (5) SSC credit passes in English Language, Mathematics, Physics, Chemistry and one other relevant science subject.',
    description: 'Thermodynamics, fluid mechanics, computer-aided design (CAD), manufacturing processes and robotics.',
    nationalCompetitiveness: 'High',
    averageCutoff: 260,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 280, catchmentCutoff: 265 },
      { name: 'University of Ibadan (UI)', type: 'Federal', state: 'Oyo', meritCutoff: 275, catchmentCutoff: 260 },
      { name: 'Federal University of Technology, Minna (FUTMINNA)', type: 'Federal', state: 'Niger', meritCutoff: 235, catchmentCutoff: 220 },
    ]
  },
  {
    id: 'accounting',
    courseName: 'Accounting / Accountancy',
    faculty: 'Faculty of Management Sciences / Administration',
    compulsorySubjects: ['English Language', 'Mathematics', 'Economics'],
    optionalSubjectPool: ['Commerce', 'Financial Accounting', 'Government', 'Geography'],
    olevelRequirements: 'Five (5) SSC credit passes including English Language, Mathematics, Economics, Financial Accounting/Commerce and any other relevant subject.',
    description: 'Financial accounting, corporate taxation, forensic auditing, management control and IFRS standards.',
    nationalCompetitiveness: 'High',
    averageCutoff: 250,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 275, catchmentCutoff: 260 },
      { name: 'University of Benin (UNIBEN)', type: 'Federal', state: 'Edo', meritCutoff: 255, catchmentCutoff: 240 },
      { name: 'University of Ilorin (UNILORIN)', type: 'Federal', state: 'Kwara', meritCutoff: 245, catchmentCutoff: 230 },
      { name: 'Lagos State University (LASU)', type: 'State', state: 'Lagos', meritCutoff: 250, catchmentCutoff: 235 },
    ]
  },
  {
    id: 'economics',
    courseName: 'Economics',
    faculty: 'Faculty of Social Sciences',
    compulsorySubjects: ['English Language', 'Mathematics', 'Economics'],
    optionalSubjectPool: ['Commerce', 'Government', 'History', 'Geography'],
    olevelRequirements: 'Five (5) SSC credit passes in English Language, Mathematics, Economics and any two other Social Science or Arts subjects.',
    description: 'Macroeconomics, econometric modeling, fiscal and monetary policies, and development finance.',
    nationalCompetitiveness: 'High',
    averageCutoff: 250,
    institutions: [
      { name: 'University of Ibadan (UI)', type: 'Federal', state: 'Oyo', meritCutoff: 270, catchmentCutoff: 255 },
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 275, catchmentCutoff: 260 },
      { name: 'Obafemi Awolowo University (OAU)', type: 'Federal', state: 'Osun', meritCutoff: 260, catchmentCutoff: 245 },
    ]
  },
  {
    id: 'mass-comm',
    courseName: 'Mass Communication / Media Studies',
    faculty: 'Faculty of Communication / Social Sciences',
    compulsorySubjects: ['English Language', 'Literature-in-English'],
    optionalSubjectPool: ['Government', 'Economics', 'Christian Religious Studies', 'Islamic Religious Studies', 'Commerce'],
    olevelRequirements: 'Five (5) SSC credit passes including English Language, Mathematics, Literature-in-English and two other Arts or Social Science subjects.',
    description: 'Journalism, public relations, broadcasting, investigative reporting and digital multi-media strategy.',
    nationalCompetitiveness: 'High',
    averageCutoff: 255,
    institutions: [
      { name: 'University of Lagos (UNILAG)', type: 'Federal', state: 'Lagos', meritCutoff: 280, catchmentCutoff: 265 },
      { name: 'University of Benin (UNIBEN)', type: 'Federal', state: 'Edo', meritCutoff: 255, catchmentCutoff: 240 },
      { name: 'Lagos State University (LASU)', type: 'State', state: 'Lagos', meritCutoff: 255, catchmentCutoff: 240 },
    ]
  }
];

export function validateCandidateSubjectCombination(
  chosenSubjects: SubjectName[],
  course: CourseBrochure
): {
  isValid: boolean;
  missingCompulsory: SubjectName[];
  warnings: string[];
  recommendation: string;
} {
  const missingCompulsory: SubjectName[] = [];
  const warnings: string[] = [];

  // 1. Check English (strictly required for every single JAMB exam)
  if (!chosenSubjects.includes('English Language')) {
    missingCompulsory.push('English Language');
    warnings.push('English Language is 100% compulsory for all UTME candidates without exception.');
  }

  // 2. Check course-specific compulsory subjects
  for (const comp of course.compulsorySubjects) {
    if (!chosenSubjects.includes(comp)) {
      if (!missingCompulsory.includes(comp)) {
        missingCompulsory.push(comp);
      }
      warnings.push(`Missing compulsory subject: ${comp}. This is non-negotiable for ${course.courseName}.`);
    }
  }

  // 3. Check optional pool if any
  if (course.optionalSubjectPool && course.optionalSubjectPool.length > 0) {
    const hasAtLeastOneFromPool = chosenSubjects.some(sub => course.optionalSubjectPool?.includes(sub));
    const compulsoryCount = course.compulsorySubjects.length;
    const remainingSlots = 4 - compulsoryCount;
    if (remainingSlots > 0 && !hasAtLeastOneFromPool) {
      warnings.push(`Your 4th subject should ideally come from: ${course.optionalSubjectPool.join(', ')}.`);
    }
  }

  const isValid = missingCompulsory.length === 0;

  let recommendation = 'Your subject combination is aligned with the official JAMB IBASS brochure! You are fully qualified to compete on merit.';
  if (!isValid) {
    recommendation = `Correction needed! To be eligible for ${course.courseName}, replace your elective subjects with: ${missingCompulsory.join(' and ')}.`;
  }

  return {
    isValid,
    missingCompulsory,
    warnings,
    recommendation
  };
}
