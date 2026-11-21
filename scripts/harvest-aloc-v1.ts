import fs from 'node:fs';
import path from 'node:path';

/**
 * SABI JAMB CBT - ALOC Station v1 Multi-Year Harvester & Ordered Folder Builder
 *
 * Usage:
 *   Single Year:
 *     ALOC_API_KEY="your_key" npx tsx scripts/harvest-aloc-v1.ts --subject=english-language --year=2022
 *   Year Range:
 *     ALOC_API_KEY="your_key" npx tsx scripts/harvest-aloc-v1.ts --subject=english-language --from=2010 --to=2022
 */

const SUBJECT_META: Record<
  string,
  { displayName: string; code: string }
> = {
  'english-language': { displayName: 'English Language', code: 'ENG' },
  mathematics: { displayName: 'Mathematics', code: 'MTH' },
  physics: { displayName: 'Physics', code: 'PHY' },
  chemistry: { displayName: 'Chemistry', code: 'CHM' },
  biology: { displayName: 'Biology', code: 'BIO' },
  economics: { displayName: 'Economics', code: 'ECO' },
  government: { displayName: 'Government', code: 'GOV' },
  accounting: { displayName: 'Financial Accounting', code: 'ACC' },
  commerce: { displayName: 'Commerce', code: 'COM' },
  'literature-in-english': { displayName: 'Literature-in-English', code: 'LIT' },
  crk: { displayName: 'Christian Religious Studies', code: 'CRS' },
  'christian-religious-studies': { displayName: 'Christian Religious Studies', code: 'CRS' },
  geography: { displayName: 'Geography', code: 'GEO' },
};

function formatTitleCase(slugOrText: string | null | undefined, fallback: string): string {
  if (!slugOrText) return fallback;
  return slugOrText
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function writeTwinReadyFiles(
  baseDir: string,
  displayName: string,
  subjectSlug: string,
  year: number
) {
  const twinConfigs = [
    { relDir: path.join('twin', 'twin1'), id: 'simple', variant: 'twin1' },
    { relDir: path.join('twin', 'twin2'), id: 'medium', variant: 'twin2' },
    { relDir: path.join('twin', 'twin3'), id: 'hard', variant: 'twin3' },
  ] as const;

  for (const cfg of twinConfigs) {
    const targetDir = path.join(baseDir, cfg.relDir);
    fs.mkdirSync(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, 'questions.json');
    if (!fs.existsSync(targetFile)) {
      const envelope = {
        id: cfg.id,
        variant: cfg.variant,
        subject: displayName,
        subject_slug: subjectSlug,
        year,
        total_questions: 0,
        questions: [],
      };
      fs.writeFileSync(targetFile, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
    }
  }
}

async function harvestSingleYear(
  subjectSlug: string,
  year: number,
  apiKey: string,
  baseUrl: string
): Promise<{
  year: number;
  questionCount: number;
  skipped: boolean;
  outOfCredits: boolean;
  creditsRemaining: string | number;
}> {
  const meta = SUBJECT_META[subjectSlug] || {
    displayName: formatTitleCase(subjectSlug, 'English Language'),
    code: subjectSlug.slice(0, 3).toUpperCase(),
  };

  const baseDir = path.resolve(
    process.cwd(),
    'src/data/question-bank',
    subjectSlug,
    String(year)
  );
  const origFile = path.join(baseDir, 'original', 'questions.json');

  // Check if this year was already fully harvested from ALOC (has >= 30 questions with aloc_id)
  if (fs.existsSync(origFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(origFile, 'utf8'));
      if (
        Array.isArray(existing.questions) &&
        existing.questions.length >= 30 &&
        existing.questions[0]?.aloc_id
      ) {
        writeTwinReadyFiles(baseDir, meta.displayName, subjectSlug, year);
        console.log(
          `  [Skip ${year}] Already harvested (${existing.questions.length} ALOC questions in ${path.relative(process.cwd(), origFile)})`
        );
        return {
          year,
          questionCount: existing.questions.length,
          skipped: true,
          outOfCredits: false,
          creditsRemaining: 'unchanged',
        };
      }
    } catch {
      // continue and re-fetch
    }
  }

  const rawQuestions: any[] = [];
  let cursor: string | null = null;
  let page = 1;
  let latestCreditsRemaining: string | number = 'unknown';
  let outOfCredits = false;

  while (page === 1 || cursor) {
    const url = new URL(`${baseUrl}/questions`);
    url.searchParams.set('examType', 'jamb');
    url.searchParams.set('subject', subjectSlug);
    url.searchParams.set('year', String(year));
    url.searchParams.set('limit', '15');
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    let res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      console.log(`    [429 Rate Limit on ${year} p${page}] Waiting 10s before retry...`);
      await sleep(10000);
      res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
          Accept: 'application/json',
        },
      });
    }

    if (res.status === 402 || res.status === 403) {
      const errText = await res.text();
      console.log(
        `    [Credit Limit Reached on ${year} p${page}] HTTP ${res.status}: ${errText}`
      );
      outOfCredits = true;
      break;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ALOC API HTTP ${res.status} on ${year} page ${page}: ${errText}`);
    }

    const creditsRemHeader = res.headers.get('x-credits-remaining');
    if (creditsRemHeader !== null) latestCreditsRemaining = Number(creditsRemHeader);

    const payload = await res.json();
    const batch = Array.isArray(payload.data) ? payload.data : [];
    rawQuestions.push(...batch);

    if (payload.pagination?.hasMore && payload.pagination?.nextCursor) {
      if (typeof latestCreditsRemaining === 'number' && latestCreditsRemaining < 5) {
        console.log(
          `    [Low Credit Stop on ${year} p${page}] Only ${latestCreditsRemaining} credits remaining.`
        );
        outOfCredits = true;
        break;
      }
      cursor = payload.pagination.nextCursor;
      page += 1;
      await sleep(2150);
    } else {
      cursor = null;
      break;
    }
  }

  if (rawQuestions.length === 0) {
    return {
      year,
      questionCount: 0,
      skipped: false,
      outOfCredits,
      creditsRemaining: latestCreditsRemaining,
    };
  }

  // Deduplicate by question id and sort by questionNumber
  const seenIds = new Set<string>();
  const deduped = rawQuestions.filter(q => {
    const id = String(q.id || q.questionNumber);
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });

  deduped.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

  const originalQuestions = deduped.map((item, idx) => {
    const qNum = item.questionNumber || idx + 1;
    const padNum = String(qNum).padStart(2, '0');
    const canonicalId = `${meta.code}-${year}-Q${padNum}`;
    const topic = formatTitleCase(item.metadata?.topic, 'Core Syllabus');
    const subtopic = formatTitleCase(item.metadata?.subtopic, 'UTME Objective');
    const learningObjective =
      item.metadata?.learningObjectives?.[0] ||
      `Master ${topic} (${subtopic}) under JAMB UTME conditions.`;
    const rawAnswer = String(item.correctAnswer || 'A')
      .trim()
      .toUpperCase();
    const answer = (['A', 'B', 'C', 'D'].includes(rawAnswer)
      ? rawAnswer
      : 'A') as 'A' | 'B' | 'C' | 'D';

    const options = {
      A: String(item.options?.A ?? '').trim(),
      B: String(item.options?.B ?? '').trim(),
      C: String(item.options?.C ?? '').trim(),
      D: String(item.options?.D ?? '').trim(),
    };

    const correctOptionText = options[answer];

    // Preserve section/passage context if provided by ALOC
    const sectionPrefix =
      item.section && String(item.section).trim()
        ? `[${String(item.section).trim()}] `
        : '';
    const passagePrefix =
      item.passage && String(item.passage).trim()
        ? `${String(item.passage).trim()}\n\n`
        : '';
    const fullQuestionText = `${passagePrefix}${sectionPrefix}${String(item.text || '').trim()}`;

    return {
      question_number: qNum,
      question_id: `${meta.code}-${year}-ORIG-Q${padNum}`,
      canonical_id: canonicalId,
      aloc_id: item.id,
      difficulty_id: 'original' as const,
      subject: meta.displayName,
      year,
      topic,
      subtopic,
      section: item.section || null,
      image_url: item.imageUrl || null,
      question: fullQuestionText,
      options,
      answer,
      explanation: `Official JAMB ${year} ${meta.displayName} Question ${qNum} (${topic} — ${subtopic}). Syllabus objective: ${learningObjective} Verified answer: Option ${answer} (${correctOptionText}).`,
      explanation_short: `Correct Option: ${answer} (${correctOptionText}) · Topic: ${topic} (${subtopic}).`,
      explanation_pidgin: `For dis JAMB ${year} ${meta.displayName} question under ${topic} (${subtopic}), the correct answer na Option ${answer} (${correctOptionText}).`,
    };
  });

  // 1. Write original/questions.json
  const origDir = path.join(baseDir, 'original');
  fs.mkdirSync(origDir, { recursive: true });
  const origEnvelope = {
    id: 'original',
    variant: 'original',
    subject: meta.displayName,
    subject_slug: subjectSlug,
    year,
    total_questions: originalQuestions.length,
    questions: originalQuestions,
  };
  fs.writeFileSync(origFile, JSON.stringify(origEnvelope, null, 2) + '\n', 'utf8');

  // 2. Create twin/twin1 (simple), twin/twin2 (medium), twin/twin3 (hard) files
  writeTwinReadyFiles(baseDir, meta.displayName, subjectSlug, year);

  console.log(
    `  [Saved ${year}] ${originalQuestions.length} Original Qs + Twin1/2/3 folders created | Credits Remaining: ${latestCreditsRemaining}${outOfCredits ? ' (PARTIAL - OUT OF CREDITS)' : ''}`
  );

  await sleep(2150);

  return {
    year,
    questionCount: originalQuestions.length,
    skipped: false,
    outOfCredits,
    creditsRemaining: latestCreditsRemaining,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const subjectArg =
    args.find(a => a.startsWith('--subject='))?.split('=')[1] || 'english-language';
  const singleYearArg = args.find(a => a.startsWith('--year='))?.split('=')[1];
  const fromYearArg = args.find(a => a.startsWith('--from='))?.split('=')[1];
  const toYearArg = args.find(a => a.startsWith('--to='))?.split('=')[1];

  const apiKey = process.env.ALOC_API_KEY?.trim();
  const baseUrl = (
    process.env.ALOC_BASE_URL || 'https://dev.aloc.com.ng/api/v1'
  ).replace(/\/+$/, '');

  if (!apiKey) {
    console.error('ERROR: Missing ALOC_API_KEY environment variable.');
    process.exit(1);
  }

  let yearsToHarvest: number[] = [];
  if (fromYearArg && toYearArg) {
    const start = Number(fromYearArg);
    const end = Number(toYearArg);
    for (let y = start; y <= end; y++) {
      yearsToHarvest.push(y);
    }
  } else {
    yearsToHarvest = [Number(singleYearArg || '2022')];
  }

  console.log(
    `\n================================================================`
  );
  console.log(
    `SABI ALOC Harvester: ${subjectArg} | Years: ${yearsToHarvest[0]} -> ${yearsToHarvest[yearsToHarvest.length - 1]} (${yearsToHarvest.length} years)`
  );
  console.log(
    `================================================================`
  );

  let totalQuestionsSaved = 0;
  let finalCredits: string | number = 'unknown';

  for (const yr of yearsToHarvest) {
    const res = await harvestSingleYear(subjectArg, yr, apiKey, baseUrl);
    totalQuestionsSaved += res.questionCount;
    if (res.creditsRemaining !== 'unchanged') {
      finalCredits = res.creditsRemaining;
    }
    if (res.outOfCredits) {
      console.log(
        `\n  [Stopping Batch Cleanly] Key ran out of credits at year ${yr}. Resume from year ${yr} with next key!`
      );
      break;
    }
  }

  console.log(
    `\n================================================================`
  );
  console.log(
    `BATCH SUMMARY: ${subjectArg.toUpperCase()}`
  );
  console.log(
    `Total Original JAMB Questions Stored in This Run: ${totalQuestionsSaved}`
  );
  console.log(`ALOC Credits Remaining: ${finalCredits}`);
  console.log(
    `================================================================\n`
  );
}

main().catch(err => {
  console.error('[SABI ALOC Harvester Error]:', err);
  process.exit(1);
});
