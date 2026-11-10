import { createHash, randomBytes } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';

const router = Router();
const uuid = z.string().uuid();
const getUserId = (req: Request) => (req as AuthenticatedRequest).user?.id || null;
const hashCode = (value: string) => createHash('sha256').update(value).digest('hex');
const asyncRoute = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { void handler(req, res, next).catch(next); };

async function institutionAccess(institutionId: string, userId: string, roles?: string[]) {
  const { data, error } = await supabaseAdmin.from('school_memberships')
    .select('role,status,school_organizations!inner(status)')
    .eq('organization_id', institutionId).eq('user_id', userId)
    .eq('status', 'active').eq('school_organizations.status', 'active').maybeSingle();
  if (error) throw error;
  if (!data || (roles && !roles.includes(data.role))) return null;
  return data;
}

const parentInviteSchema = z.strictObject({
  studentSabiId: z.string().trim().min(5).max(80),
  relationship: z.enum(['parent_guardian','guardian','sponsor']).default('parent_guardian'),
});
const parentRedeemSchema = z.strictObject({ code: z.string().trim().min(20).max(100) });
const institutionSchema = z.strictObject({
  name: z.string().trim().min(2).max(160),
  institutionType: z.enum(['school','tutorial_centre']),
  state: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
});
const classSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  programme: z.enum(['general','jamb','utme','waec','neco','other']).default('general'),
  academicYear: z.string().trim().max(30).optional(),
  subjects: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

router.post('/parent/invites', requireAuth, asyncRoute(async (req, res) => {
  const parentId = getUserId(req);
  if (!parentId) return res.status(401).json({ error: 'Authentication required.' });
  const parsed = parentInviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter the learner\'s SABI ID and relationship.' });
  const { data: student, error: studentError } = await supabaseAdmin.from('profiles')
    .select('id,sabi_unique_id').eq('sabi_unique_id', parsed.data.studentSabiId).maybeSingle();
  if (studentError || !student) return res.status(404).json({ error: 'No learner was found with that SABI ID.' });
  if (student.id === parentId) return res.status(400).json({ error: 'You cannot link your account to itself.' });
  const code = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from('parent_student_relationships').insert({
    parent_user_id: parentId, student_user_id: student.id,
    relationship_type: parsed.data.relationship, status: 'pending',
    invitation_token_hash: hashCode(code), expires_at: expiresAt,
  });
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A parent relationship or invitation already exists for this learner.' });
    return res.status(503).json({ error: 'The parent invitation could not be created.' });
  }
  return res.status(201).json({ code, expiresAt, studentSabiId: student.sabi_unique_id });
}));

// The learner redeems the parent's invitation; this is the explicit consent action.
router.post('/parent/link', requireAuth, asyncRoute(async (req, res) => {
  const studentId = getUserId(req);
  if (!studentId) return res.status(401).json({ error: 'Authentication required.' });
  const parsed = parentRedeemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid parent invitation code.' });
  const { data: parentId, error } = await supabaseAdmin.rpc('redeem_parent_link_invite', {
    p_token_hash: hashCode(parsed.data.code), p_student_user_id: studentId,
  });
  if (error) {
    if ((error.message || '').includes('invalid_or_expired_parent_invite')) {
      return res.status(400).json({ error: 'This invitation is invalid, expired or not intended for this account.' });
    }
    return res.status(503).json({ error: 'The parent relationship could not be confirmed.' });
  }
  return res.status(201).json({ linked: true });
}));

router.get('/parent/children', requireAuth, asyncRoute(async (req, res) => {
  const parentId = getUserId(req);
  if (!parentId) return res.status(401).json({ error: 'Authentication required.' });
  const { data: links, error } = await supabaseAdmin.from('parent_student_relationships')
    .select('student_user_id,relationship_type,consent_granted_at')
    .eq('parent_user_id', parentId).eq('status', 'active');
  if (error) return res.status(503).json({ error: 'Linked learner records are unavailable.' });
  const children = await Promise.all((links || []).map(async link => {
    const [profile, sessions, mastery] = await Promise.all([
      supabaseAdmin.from('profiles').select('id,full_name,sabi_unique_id').eq('id', link.student_user_id).maybeSingle(),
      supabaseAdmin.from('learning_sessions').select('id,mode,status,total_questions,answered_count,correct_count,started_at,completed_at').eq('user_id', link.student_user_id).order('started_at', { ascending: false }).limit(10),
      supabaseAdmin.from('student_topic_mastery').select('subject,topic,mastery_score,attempted_count,last_attempt_at').eq('user_id', link.student_user_id).order('updated_at', { ascending: false }).limit(30),
    ]);
    if (profile.error || sessions.error || mastery.error) throw new Error('Child progress unavailable');
    return {
      student: profile.data, relationship: link.relationship_type, consentedAt: link.consent_granted_at,
      recentSessions: sessions.data || [], topicMastery: mastery.data || [],
      summary: {
        sessions: (sessions.data || []).length,
        completedSessions: (sessions.data || []).filter(item => item.status === 'completed').length,
        questionsAnswered: (sessions.data || []).reduce((sum, item) => sum + (item.answered_count || 0), 0),
      },
    };
  }));
  return res.json({ children });
}));

router.delete('/parent/children/:studentId', requireAuth, asyncRoute(async (req, res) => {
  const parentId = getUserId(req);
  const studentId = String(req.params.studentId || '');
  if (!parentId || !uuid.safeParse(studentId).success) return res.status(400).json({ error: 'A valid learner is required.' });
  const { error } = await supabaseAdmin.from('parent_student_relationships').update({
    status: 'revoked', updated_at: new Date().toISOString(),
  }).eq('parent_user_id', parentId).eq('student_user_id', studentId).eq('status', 'active');
  if (error) return res.status(503).json({ error: 'The parent link could not be revoked.' });
  return res.json({ revoked: true });
}));

router.post('/institutions', requireAuth, asyncRoute(async (req, res) => {
  const ownerId = getUserId(req);
  if (!ownerId) return res.status(401).json({ error: 'Authentication required.' });
  const parsed = institutionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide a valid institution name, type and optional contact email.' });
  const slug = parsed.data.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) + '-' + randomBytes(3).toString('hex');
  const { data: institution, error } = await supabaseAdmin.from('school_organizations').insert({
    name: parsed.data.name, slug, status: 'active', contact_email: parsed.data.contactEmail || null,
    metadata: { institution_type: parsed.data.institutionType, state: parsed.data.state || null, city: parsed.data.city || null },
  }).select('id,name,slug,status,metadata,contact_email,created_at').single();
  if (error) return res.status(503).json({ error: 'The institution could not be created.' });
  const { error: memberError } = await supabaseAdmin.from('school_memberships').insert({
    organization_id: institution.id, user_id: ownerId, role: 'owner', status: 'active',
  });
  if (memberError) {
    await supabaseAdmin.from('school_organizations').delete().eq('id', institution.id);
    return res.status(503).json({ error: 'Institution ownership could not be established.' });
  }
  return res.status(201).json({ institution });
}));

router.get('/institutions', requireAuth, asyncRoute(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const { data, error } = await supabaseAdmin.from('school_memberships')
    .select('role,school_organizations!inner(id,name,slug,status,metadata,contact_email,created_at)')
    .eq('user_id', userId).eq('status', 'active').eq('school_organizations.status', 'active');
  if (error) return res.status(503).json({ error: 'Your institutions are unavailable.' });
  return res.json({ institutions: (data || []).map(row => ({
    ...((Array.isArray(row.school_organizations) ? row.school_organizations[0] : row.school_organizations) || {}),
    institution_type: ((Array.isArray(row.school_organizations) ? row.school_organizations[0] : row.school_organizations) as any)?.metadata?.institution_type || 'school',
    state: ((Array.isArray(row.school_organizations) ? row.school_organizations[0] : row.school_organizations) as any)?.metadata?.state || null,
    city: ((Array.isArray(row.school_organizations) ? row.school_organizations[0] : row.school_organizations) as any)?.metadata?.city || null,
    memberRole: row.role,
  })) });
}));

router.post('/institutions/:institutionId/classes', requireAuth, asyncRoute(async (req, res) => {
  const userId = getUserId(req);
  const institutionId = String(req.params.institutionId || '');
  if (!userId || !uuid.safeParse(institutionId).success) return res.status(400).json({ error: 'A valid institution is required.' });
  const access = await institutionAccess(institutionId, userId, ['owner','admin','teacher']);
  if (!access) return res.status(403).json({ error: 'You do not have permission to create classes for this institution.' });
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide valid class details.' });
  const { data, error } = await supabaseAdmin.from('school_classes').insert({
    organization_id: institutionId, name: parsed.data.name, programme: parsed.data.programme,
    academic_year: parsed.data.academicYear || null, subject_list: parsed.data.subjects, created_by: userId,
  }).select('id,organization_id,name,programme,academic_year,subject_list,created_at').single();
  if (error) return res.status(503).json({ error: 'The class could not be created.' });
  return res.status(201).json({ class: data });
}));

router.post('/institutions/:institutionId/enrollment-invites', requireAuth, asyncRoute(async (req, res) => {
  const userId = getUserId(req);
  const institutionId = String(req.params.institutionId || '');
  if (!userId || !uuid.safeParse(institutionId).success) return res.status(400).json({ error: 'A valid institution is required.' });
  const access = await institutionAccess(institutionId, userId, ['owner','admin','teacher']);
  if (!access) return res.status(403).json({ error: 'You do not have permission to invite students to this institution.' });
  const parsed = z.strictObject({ classId: uuid.optional() }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Provide a valid optional class.' });
  if (parsed.data.classId) {
    const { data: classRow, error: classError } = await supabaseAdmin.from('school_classes')
      .select('id').eq('id', parsed.data.classId).eq('organization_id', institutionId).maybeSingle();
    if (classError || !classRow) return res.status(400).json({ error: 'The selected class does not belong to this institution.' });
  }
  const code = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from('school_enrollment_invites').insert({
    organization_id: institutionId, class_id: parsed.data.classId || null,
    token_hash: hashCode(code), expires_at: expiresAt, created_by: userId,
  });
  if (error) return res.status(503).json({ error: 'The student invitation could not be created.' });
  return res.status(201).json({ code, expiresAt });
}));

router.post('/institutions/enroll', requireAuth, asyncRoute(async (req, res) => {
  const studentId = getUserId(req);
  if (!studentId) return res.status(401).json({ error: 'Authentication required.' });
  const parsed = z.strictObject({ code: z.string().trim().min(20).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid institution invitation code.' });
  const { data: institutionId, error } = await supabaseAdmin.rpc('redeem_institution_enrollment_invite', {
    p_token_hash: hashCode(parsed.data.code), p_student_user_id: studentId,
  });
  if (error) {
    if ((error.message || '').includes('invalid_or_expired_enrollment_invite')) {
      return res.status(400).json({ error: 'This institution invitation is invalid, expired or already used.' });
    }
    return res.status(503).json({ error: 'The institution enrolment could not be completed.' });
  }
  return res.status(201).json({ enrolled: true, institutionId });
}));

router.get('/institutions/:institutionId/overview', requireAuth, asyncRoute(async (req, res) => {
  const userId = getUserId(req);
  const institutionId = String(req.params.institutionId || '');
  if (!userId || !uuid.safeParse(institutionId).success) return res.status(400).json({ error: 'A valid institution is required.' });
  const access = await institutionAccess(institutionId, userId);
  if (!access) return res.status(403).json({ error: 'You are not an active member of this institution.' });
  const [institution, classes, enrollments] = await Promise.all([
    supabaseAdmin.from('school_organizations').select('id,name,slug,status,metadata,contact_email').eq('id', institutionId).single(),
    supabaseAdmin.from('school_classes').select('id,name,programme,academic_year,subject_list').eq('organization_id', institutionId).order('created_at', { ascending: false }),
    supabaseAdmin.from('school_memberships').select('user_id').eq('organization_id', institutionId).eq('role', 'student').eq('status', 'active'),
  ]);
  if (institution.error || classes.error || enrollments.error) return res.status(503).json({ error: 'Institution analytics are temporarily unavailable.' });
  const studentIds = (enrollments.data || []).map(item => item.user_id);
  const [profiles, sessions, classLinks] = studentIds.length ? await Promise.all([
    supabaseAdmin.from('profiles').select('id,full_name,sabi_unique_id').in('id', studentIds),
    supabaseAdmin.from('learning_sessions').select('user_id,status,total_questions,answered_count,correct_count,started_at').in('user_id', studentIds).order('started_at', { ascending: false }).limit(1000),
    supabaseAdmin.from('school_class_enrollments').select('student_user_id,class_id').eq('organization_id', institutionId).eq('status', 'active'),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (profiles.error || sessions.error || classLinks.error) return res.status(503).json({ error: 'Student performance data is temporarily unavailable.' });
  const students = (enrollments.data || []).map(enrollment => {
    const learner = (profiles.data || []).find(profile => profile.id === enrollment.user_id);
    const activity = (sessions.data || []).filter(session => session.user_id === enrollment.user_id);
    const studentClass = (classLinks.data || []).find(item => item.student_user_id === enrollment.user_id);
    return { userId: enrollment.user_id, fullName: learner?.full_name || 'SABI learner', sabiId: learner?.sabi_unique_id || null, classId: studentClass?.class_id || null,
      sessions: activity.length, questionsAnswered: activity.reduce((sum, item) => sum + (item.answered_count || 0), 0),
      correctAnswers: activity.reduce((sum, item) => sum + (item.correct_count || 0), 0) };
  });
  const org = institution.data;
  return res.json({ institution: org, memberRole: access.role, classes: classes.data || [], students,
    summary: { classCount: (classes.data || []).length, studentCount: students.length,
      activeJambStudents: students.filter(student => (classes.data || []).some(c => c.id === student.classId && ['jamb','utme'].includes(c.programme))).length } });
}));

export default router;
