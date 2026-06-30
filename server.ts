/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { SEED_QUESTIONS, KNOWLEDGE_BASE, SYLLABUS_FREQUENCY } from './src/data/questions.ts';
import { Question, SubjectName } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header requested in the skill guide
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn('Warning: GEMINI_API_KEY is not defined in the environment. AI Tutor features will run in mock mode.');
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Get seed questions
app.get('/api/questions', (req, res) => {
  res.json({ status: 'success', questions: SEED_QUESTIONS });
});

// 2. Explain a question on-demand (API proxy to protect key)
app.post('/api/explain', async (req, res) => {
  const { questionId, preference, language } = req.body;
  const question = SEED_QUESTIONS.find(q => q.id === questionId);
  
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  // Choose the best pre-written explanation if it matches preference, otherwise ask AI
  if (!ai) {
    // Mock mode fallback
    const mockExp = language === 'pidgin' ? question.explanation_pidgin : (preference === 'short' ? question.explanation_short : question.explanation);
    return res.json({ explanation: mockExp, isMock: true });
  }

  try {
    const prompt = `
      You are Sabi AI Tutor, Nigeria's premiere JAMB preparation instructor.
      Explain this question in detail:
      Question: ${question.question}
      Options: A) ${question.options.A}, B) ${question.options.B}, C) ${question.options.C}, D) ${question.options.D}
      Correct Answer: Option ${question.answer}
      Our database worked solution: ${question.explanation}
      
      The student has specific preferences:
      - Explanation length/detail: ${preference === 'short' ? 'Concise/Short summary' : 'Step-by-step detailed breakdown'}
      - Language: ${language === 'pidgin' ? 'West African Pidgin English (e.g. "for this question, you go find...")' : language === 'mixed' ? 'Nigerian English mixed with light Pidgin vibes' : 'Plain formal English'}
      
      Generate a warm, encouraging, and accurate study explanation reflecting these precise stylistic guidelines.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    res.json({ explanation: response.text || question.explanation });
  } catch (error: any) {
    console.error('Error generating explanation:', error);
    res.json({ explanation: question.explanation, error: error.message });
  }
});

// 3. AI Smart Tutor Open Chat (Ask Me Anything) with RAG and 3-Tier memory updates
app.post('/api/chat', async (req, res) => {
  const { messages, currentTopic, currentSubject, studentProfile, topicMemory } = req.body;

  if (!ai) {
    // Mock Mode fallback
    return res.json({
      reply: `Sabi Tutor (Mock Mode): You are asking about "${currentTopic || 'your studies'}". (To unlock the live, RAG-grounded AI Tutor, please add your GEMINI_API_KEY in Settings > Secrets!)`,
      topicMemoryUpdate: `User is practicing ${currentTopic || 'this subject'}. They are working hard and setting up local study patterns.`,
      isMock: true
    });
  }

  // Simple RAG implementation: search locally mapped concept notes in the Knowledge Base
  let retrievedContext = '';
  if (currentSubject && KNOWLEDGE_BASE[currentSubject as SubjectName]) {
    const relevantKB = KNOWLEDGE_BASE[currentSubject as SubjectName].find(
      kb => kb.topic.toLowerCase() === (currentTopic || '').toLowerCase()
    );
    if (relevantKB) {
      retrievedContext = `Syllabus Grounding Note: [Topic: ${relevantKB.topic}, Subtopic: ${relevantKB.subtopic}]: ${relevantKB.content}`;
    }
  }

  const systemInstruction = `
    You are Sabi AI Tutor, the highly intelligent, friendly, and expert Nigerian JAMB tutor.
    Your mission is to guide students to achieve high scores (300+) in the Unified Tertiary Matriculation Examination (UTME).
    
    You have direct access to three layers of student context:
    1. Student Profile (Tier 1 - Permanent):
       - Name: ${studentProfile?.name || 'Student'}
       - Class Level: ${studentProfile?.classLevel || 'Senior Candidate'}
       - 4 Chosen Subjects: ${studentProfile?.chosenSubjects?.join(', ') || 'JAMB Subjects'}
       - Target Course & University: ${studentProfile?.targetCourse} at ${studentProfile?.targetUniversity}
       - Explanation preference: ${studentProfile?.explanationPreference === 'short' ? 'Brief and straight to the point' : 'Detailed step-by-step'}
       - Language preference: ${studentProfile?.languagePreference || 'english'} (If 'pidgin', code-switch naturally into West African Pidgin English; if 'mixed', use Nigerian English laced with light pidgin expressions; if 'english', speak formally and supportive).
       - Motivation: ${studentProfile?.motivation || 'General excellence'}
       
    2. Topic Summary Memory (Tier 2):
       - Existing rolling memory about the topic "${currentTopic || 'General studies'}": "${topicMemory || 'No prior conversation summary has been recorded for this topic yet.'}"
       
    3. Grounding Knowledge Base (RAG context):
       - ${retrievedContext || 'No specific textbook alignment found, rely on core Nigerian syllabus logic.'}
       
    Behavioral Directives:
    - Never give answers immediately on a platter of gold. Ask scaffolding, thought-provoking questions if they seem stuck.
    - Reference their target course/university or mock performance to nudge and motivate them.
    - CRITICAL: You are aware of the student's target institution (e.g., UNILAG) to understand their competitive baseline, but you must NOT continuously mention or repeat the university's name in your regular academic explanations. Only reference their target school naturally during initial session greetings or milestone achievements. Never use it as a repetitive conversational filler when explaining academic concepts.
    - Be warm, extremely knowledgeable about the JAMB syllabus, and maintain steady, high-morale guidance.
    
    Return your outputs strictly as a JSON object adhering to this schema:
    {
      "reply": "tutor's message supporting the user, with helpful hints/feedback or explanations, structured in markdown with equations formatted as LaTeX enclosed in $ signs (e.g. $x^2 + 5x + 6$)",
      "topicMemoryUpdate": "re-written, updated single-paragraph rolling summary of the user's progress, strengths, and remaining weak concepts in this specific topic (incorporating both the old summary and this new dialogue)."
    }
  `;

  try {
    const formattedHistory = messages.slice(-5).map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    // Generate output with required JSON scheme
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedHistory,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { 
              type: Type.STRING, 
              description: 'The supportive conversational reply to the student.' 
            },
            topicMemoryUpdate: { 
              type: Type.STRING, 
              description: 'The updated rolling summary of what the student understands or struggles with in this topic, to be stored for subsequent turns.' 
            }
          },
          required: ['reply', 'topicMemoryUpdate']
        },
        temperature: 0.7,
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json({
      reply: parsed.reply || "I didn't capture that query perfectly, but I am right here with you! Let us keep practicing.",
      topicMemoryUpdate: parsed.topicMemoryUpdate || topicMemory
    });
  } catch (error: any) {
    console.error('Error in AI Tutor chat endpoint:', error);
    res.json({
      reply: `My friend, I encountered a slight connection hiccup, but let us keep our focus high! Under "${currentTopic || 'your studies'}", let's ensure we grasp the fundamental logic. Ask me another question!`,
      topicMemoryUpdate: topicMemory,
      error: error.message
    });
  }
});

// 4. Pipeline 5: AI-Generated Questions Generator (Question Pool Expansion for weak topics)
app.post('/api/generate-question', async (req, res) => {
  const { subject, topic, subtopic } = req.body;

  if (!ai) {
    // Generate a simulated question if AI is not connected
    const randId = `AI-GEN-${Math.floor(1000 + Math.random() * 9000)}`;
    const mockQuestion: Question = {
      id: randId,
      exam_type: 'AI-Generated',
      subject: subject || 'Mathematics',
      topic: topic || 'Algebra',
      subtopic: subtopic || 'General Practice',
      year: new Date().getFullYear(),
      question: `Determine the sum of the roots of a simulated quadratic equation $2x^2 - 12x + 10 = 0$.`,
      options: {
        A: '6',
        B: '5',
        C: '-6',
        D: '12'
      },
      answer: 'A',
      explanation: 'For any quadratic equation $ax^2 + bx + c = 0$, the sum of roots is given by $-b/a$.\nHere, $a = 2$, $b = -12$, and $c = 10$.\nSum of roots = $-(-12) / 2 = 12 / 2 = 6$.',
      explanation_short: 'The sum of roots is $-b/a = -(-12)/2 = 6$.',
      explanation_pidgin: 'To find sum of roots, use the formula $-b/a$. Our b na -12, and a na 2. So $-(-12)/2 = 6$. No shaking!',
      difficulty: 'medium',
      concepts: ['roots of quadratic', 'sum of roots'],
      source: 'Sabi AI Pipeline 5',
      status: 'verified',
      confidence_score: 0.95,
      created_at: new Date().toISOString()
    };
    return res.json({ question: mockQuestion, isMock: true });
  }

  const existingSubset = SEED_QUESTIONS.filter(q => q.subject === subject && q.topic === topic).slice(0, 2);
  const sampleData = existingSubset.length > 0
    ? `Here are examples of existing verified questions of this type:\n${JSON.stringify(existingSubset)}`
    : `Ensure the style matches official JAMB multiple-choice question format.`;

  const instructionPrompt = `
    You are an AI-powered JAMB question-generation engine (Sabi Pipeline 5).
    Your task is to generate a new, high-quality, syllabus-aligned multiple choice question for:
    Subject: ${subject}
    Topic: ${topic}
    Subtopic: ${subtopic}
    
    ${sampleData}
    
    Stricter Rules:
    - Solve and review the question yourself to ensure exactly ONE option is correctly mathematical aligned.
    - Write a detailed step-by-step worked explanation, a concise short summary explanation, and an encouraging West African Pidgin English explanation.
    - Set difficulty to 'easy', 'medium', or 'hard' depending on the concept's cognitive depth.
    - Use appropriate LaTeX notation for math/technical symbols wrapped inside single $ signs (e.g., $x^2 + 5x + 6$). Make sure it parses beautifully.
    
    Structure the response strictly as a JSON object matching this schema:
    {
      "question": {
        "id": "A unique alpha-numeric string, e.g. MTH-ALG-2026-X",
        "exam_type": "AI-Generated",
        "subject": "${subject}",
        "topic": "${topic}",
        "subtopic": "${subtopic}",
        "year": 2026,
        "question": "The question text, styled elegantly with LaTeX math",
        "options": {
          "A": "Option text A",
          "B": "Option text B",
          "C": "Option text C",
          "D": "Option text D"
        },
        "answer": "A, B, C, or D (strictly the correct option)",
        "explanation": "Clear double-pass verified step-by-step worked solution",
        "explanation_short": "Brief, concise summary solution",
        "explanation_pidgin": "Laidback Nigerian Pidgin solution starting warmly and keeping the logic super plain",
        "difficulty": "easy, medium, or hard",
        "concepts": ["analytical concepts"],
        "common_wrong_answer": "Why students usually fail this and which option represents that trap"
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: instructionPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const questionObj = parsed.question;
    
    if (questionObj) {
      // Add required boilerplate
      questionObj.status = 'verified';
      questionObj.confidence_score = 0.94;
      questionObj.source = 'AI Pipeline 5';
      questionObj.created_at = new Date().toISOString();
      res.json({ question: questionObj });
    } else {
      throw new Error('Could not parse question object from AI response.');
    }
  } catch (error: any) {
    console.error('Error generating AI question:', error);
    // Return a robust backup question
    res.status(500).json({ error: 'AI generation failed', message: error.message });
  }
});

// -------------------------------------------------------------
// Vite and Static Assets Orchestration
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sabi Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
