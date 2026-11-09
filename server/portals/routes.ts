import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';

const router = Router();
const uuid = z.string().uuid();
const getUserId = (req: AuthenticatedRequest) => req.user?.id || null;
const hashCode = (value: string) => createHash('sha256').update(value).digest('hex');

async function institutionAccess(institutionId: string, userId: string, roles?: string[]) {
  const { data, error } = await supabaseAdmin.from('institution_memberships')
    .select('member_role,status').eq('institution_id', institutionId)
    .eq('user_id', userId).eq('status', 'active').maybeSingle();
  if (error) throw error;
  if (!data || (roles && !roles.includes(data.member_role))) return null;
  return data;
}

const inviteSchema = z.strictObject({ relationship: z.enum(['parent','guardian','sponsor']).default('parent') });
const redeemSchema = z.strictObject({ code: z.string().trim().min(20).max(100), relationship: z.enum(['parent','guardian','sponsor']).default('parent') });
const institutionSchema = z.strictObject({
  name: z.string().trim().min(2).max(160),
  institutionType: z.enum(['school','tutorial_centre']),
  state: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
});
const classSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  programme: z.enum(['general','jamb','utme','waec','neco','other']).default('general'),
  academicYear: z.string().trim().max(30).optional(),
  subjects: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});
const enrollmentSchema = z.strictObject({ studentUserId: uuid, classId: uuid.optional() });

// A learner creates a short-lived, single-use code and shares it with a parent/guardian.
// The raw code is returned once; only its SHA-256 hash is persisted.
router.post('/parent/invites', requireAuth, async (req, res) => {
  const studentId = getUserId(req as AuthenticatedRequest);
  if (!studentId) return res.status(401).json({ error: 'Authentication required.' });
  const parsed = inviteSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid parent-link request.' });
  const code = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from('parent_link_invites').insert({
    student_user_id: studentId, token_hash: hashCode(code), expires_at: expiresAt,
  });
  if (error) return res.status(503).json({ error: 'A parent invitation could not be created.' });
  return res.status(201).json({ code, expiresAt, shareInstruction: 'Share this one-time code with your parent or guardian. It expires in 48 hours.' });
});

router.post('/parent/link', requireAuth, async (req, res) => {
  const parentId = getUserId(req as AuthenticatedRequest);
  if (!parentId) return res.status(401).json({ error: 'Authentication required.' });
  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid invitation code.' });
  const { data: studentId, error } = await supabaseAdmin.rpc('redeem_parent_link_invite', {
    p_token_hash: hashCode(parsed.data.code),
    p_parent_user_id: parentId,
    p_relationship: parsed.data.relationship,
  });
  if (error) {
    const message = error.message || '';
    if (message.includes('invalid_or_expired_invite')) {
      return res.status(400).json({ error: 'This invitation is invalid, expired or already used.' });
    }
    if (message.includes('self_link_not_allowed')) {
      return res.status(400).json({ error: 'You cannot link your account to itself.' });
    }
    return res.status(503).json({ error: 'The parent relationship could not be created.' });
  }
  return res.status(201).json({ linked: true, studentUserId: studentId });
});

router.get('/parent/children', requireAuth, async (req, res) => {
  const parentId = getUserId(req as AuthenticatedRequest);
  if (!parentId) return res.status(401).json({ error: 'Authentication required.' });
  const { data: links, error } = await supabaseAdmin.from('parent_student_links')
    .select('student_user_id,relationship,consented_at').eq('parent_user_id', parentId).eq('status', 'active');
  if (error) return res.status(503).json({ error: 'Linked learner records are unavailable.' });
  const children = await Promise.all((links || []).map(async link => {
    const [profile, sessions, mastery] = await Promise.all([
      supabaseAdmin.from('profiles').select('id,full_name').eq('id', link.student_user_id).maybeSingle(),
      supabaseAdmin.from('learning_sessions').select('id,mode,status,total_questions,answered_count,correct_count,started_at,completed_at').eq('user_id', link.student_user_id).order('started_at', { ascending: false }).limit(10),
      supabaseAdmin.from('student_topic_mastery').select('subject,topic,mastery_score,attempted_count,last_attempt_at').eq('user_id', link.student_user_id).order('updated_at', { ascending: false }).limit(30),
    ]);
    if (profile.error || sessions.error || mastery.error) throw new Error('Child progress unavailable');
    return {
      student: profile.data, relationship: link.relationship, consentedAt: link.consented_at,
      recentSessions: sessions.data || [], topicMastery: mastery.data || [],
      summary: {
        sessions: (sessions.data || []).length,
        completedSessions: (sessions.data || []).filter(item => item.status === 'completed').length,
        questionsAnswered: (sessions.data || []).reduce((sum, item) => sum + (item.answered_count || 0), 0),
      },
    };
  })).catch(() => null);
  return res.json({ children: (children || []).filter(Boolean) });
});

router.delete('/parent/children/:studentId', requireAuth, async (req, res) => {
  const parentId = getUserId(req as AuthenticatedRequest);
  const studentId = String(req.params.studentId || '');
  if (!parentId || !uuid.safeParse(studentId).success) return res.status(400).json({ error: 'A valid learner is required.' });
  const { error } = await supabaseAdmin.from('parent_student_links').update({ status: 'revoked' })
    .eq('parent_user_id', parentId).eq('student_user_id', studentId);
  if (error) return res.status(503).json({ error: 'The parent link could not be revoked.' });
  return res.json({ revoked: true });
});

router.post('/institutions', requireAuth, async (req, res) => {
  const ownerId = getUserId(req as AuthenticatedRequest);
  if (!ownerId) return res.status(401).json({ error: 'Authentication required.' });
  const parsed = institutionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide a valid institution name and type.' });
  const { data: institution, error } = await supabaseAdmin.from('educational_institutions').insert({
    name: parsed.data.name, institution_type: parsed.data.institutionType,
    state: parsed.data.state || null, city: parsed.data.city || null, owner_user_id: ownerId,
  }).select('id,name,institution_type,state,city,status,created_at').single();
  if (error) return res.status(503).json({ error: 'The institution could not be created.' });
  const { error: memberError } = await supabaseAdmin.from('institution_memberships').insert({
    institution_id: institution.id, user_id: ownerId, member_role: 'owner',
  });
  if (memberError) {
    await supabaseAdmin.from('educational_institutions').delete().eq('id', institution.id);
    return res.status(503).json({ error: 'Institution ownership could not be established.' });
  }
  return res.status(201).json({ institution });
});

router.get('/institutions', requireAuth, async (req, res) => {
  const userId = getUserId(req as AuthenticatedRequest);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const { data, error } = await supabaseAdmin.from('institution_memberships')
    .select('member_role,educational_institutions(id,name,institution_type,state,city,status,created_at)')
    .eq('user_id', userId).eq('status', 'active');
  if (error) return res.status(503).json({ error: 'Your institutions are unavailable.' });
  return res.json({ institutions: (data || []).map(row => ({ ...row.educational_institutions, memberRole: row.member_role })) });
});

router.post('/institutions/:institutionId/classes', requireAuth, async (req, res) => {
  const userId = getUserId(req as AuthenticatedRequest);
  const institutionId = String(req.params.institutionId || '');
  if (!userId || !uuid.safeParse(institutionId).success) return res.status(400).json({ error: 'A valid institution is required.' });
  const access = await institutionAccess(institutionId, userId, ['owner','admin','teacher']);
  if (!access) return res.status(403).json({ error: 'You do not have permission to create classes for this institution.' });
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Provide valid class details.' });
  const { data, error } = await supabaseAdmin.from('institution_classes').insert({
    institution_id: institutionId, name: parsed.data.name, programme: parsed.data.programme,
    academic_year: parsed.data.academicYear || null, subject_list: parsed.data.subjects, created_by: userId,
  }).select('id,institution_id,name,programme,academic_year,subject_list,created_at').single();
  if (error) return res.status(503).json({ error: 'The class could not be created.' });
  return res.status(201).json({ class: data });
});

router.post('/institutions/:institutionId/enrollment-invites', requireAuth, async (req, res) => {
  const userId = getUserId(req as AuthenticatedRequest);
  const institutionId = String(req.params.institutionId || '');
  if (!userId || !uuid.safeParse(institutionId).success) return res.status(400).json({ error: 'A valid institution is required.' });
  const access = await institutionAccess(institutionId, userId, ['owner','admin','teacher']);
  if (!access) return res.status(403).json({ error: 'You do not have permission to invite students to this institution.' });
  const parsed = z.strictObject({ classId: uuid.optional() }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Provide a valid optional class.' });
  if (parsed.data.classId) {
    const { data: classRow, error: classError } = await supabaseAdmin.from('institution_classes')
      .select('id').eq('id', parsed.data.classId).eq('institution_id', institutionId).maybeSingle();
    if (classError || !classRow) return res.status(400).json({ error: 'The selected class does not belong to this institution.' });
  }
  const code = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from('institution_enrollment_invites').insert({
    institution_id: institutionId, class_id: parsed.data.classId || null,
    token_hash: hashCode(code), expires_at: expiresAt, created_by: userId,
  });
  if (error) return res.status(503).json({ error: 'The student invitation could not be created.' });
  return res.status(201).json({ code, expiresAt });
});

router.post('/institutions/enroll', requireAuth, async (req, res) => {
  const studentId = getUserId(req as AuthenticatedRequest);
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
});

router.get('/institutions/:institutionId/overview', requireAuth, async (req, res) => {
  const userId = getUserId(req as AuthenticatedRequest);
  const institutionId = String(req.params.institutionId || '');
  if (!userId || !uuid.safeParse(institutionId).success) return res.status(400).json({ error: 'A valid institution is required.' });
  const access = await institutionAccess(institutionId, userId);
  if (!access) return res.status(403).json({ error: 'You are not a member of this institution.' });
  const [institution, classes, enrollments] = await Promise.all([
    supabaseAdmin.from('educational_institutions').select('id,name,institution_type,state,city,status').eq('id', institutionId).single(),
    supabaseAdmin.from('institution_classes').select('id,name,programme,academic_year,subject_list').eq('institution_id', institutionId).order('created_at', { ascending: false }),
    supabaseAdmin.from('institution_enrollments').select('id,class_id,student_user_id,status,enrolled_at').eq('institution_id', institutionId).eq('status', 'active'),
  ]);
  if (institution.error || classes.error || enrollments.error) return res.status(503).json({ error: 'Institution analytics are temporarily unavailable.' });
  const studentIds = (enrollments.data || []).map(item => item.student_user_id);
  const [profiles, sessions] = studentIds.length ? await Promise.all([
    supabaseAdmin.from('profiles').select('id,full_name').in('id', studentIds),
    supabaseAdmin.from('learning_sessions').select('user_id,status,total_questions,answered_count,correct_count,started_at').in('user_id', studentIds).order('started_at', { ascending: false }).limit(1000),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (profiles.error || sessions.error) return res.status(503).json({ error: 'Student performance data is temporarily unavailable.' });
  const students = (enrollments.data || []).map(enrollment => {
    const learner = (profiles.data || []).find(profile => profile.id === enrollment.student_user_id);
    const activity = (sessions.data || []).filter(session => session.user_id === enrollment.student_user_id);
    return { userId: enrollment.student_user_id, fullName: learner?.full_name || 'SABI learner', classId: enrollment.class_id,
      sessions: activity.length, questionsAnswered: activity.reduce((sum, item) => sum + (item.answered_count || 0), 0),
      correctAnswers: activity.reduce((sum, item) => sum + (item.correct_count || 0), 0) };
  });
  return res.json({ institution: institution.data, memberRole: access.member_role, classes: classes.data || [], students,
    summary: { classCount: (classes.data || []).length, studentCount: students.length,
      activeJambStudents: students.filter(student => (classes.data || []).some(c => c.id === student.classId && ['jamb','utme'].includes(c.programme))).length } });
});

export default router;
