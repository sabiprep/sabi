import type { RequestHandler } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { resolveUserRole } from './requireRole';
import type { AuthenticatedRequest } from './requireAuth';

/**
 * Checks the COMMAND permission catalogue on the server.
 * MASTER_ADMIN is the platform authority. Delegated assignments are platform
 * scoped here; institution/resource scopes are intentionally not accepted by
 * global COMMAND endpoints until a route supplies an explicit scope evaluator.
 */
export function requireAdminPermission(permissionKey: string): RequestHandler {
  return async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const role = await resolveUserRole(userId);
    authReq.role = role;
    if (role === 'MASTER_ADMIN') {
      next();
      return;
    }

    const now = new Date().toISOString();
    try {
      if (role !== 'STUDENT') {
        const direct = await supabaseAdmin.from('admin_role_permission_grants')
          .select('permission_key')
          .eq('role_key', role)
          .eq('permission_key', permissionKey)
          .maybeSingle();
        if (direct.error) throw direct.error;
        if (direct.data) {
          next();
          return;
        }
      }

      const assignments = await supabaseAdmin.from('admin_user_role_assignments')
        .select('role_key')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('scope_type', 'platform')
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`);
      if (assignments.error) throw assignments.error;

      const assignedRoles = [...new Set((assignments.data || []).map(row => row.role_key))];
      if (assignedRoles.length) {
        const delegated = await supabaseAdmin.from('admin_role_permission_grants')
          .select('permission_key')
          .in('role_key', assignedRoles)
          .eq('permission_key', permissionKey)
          .limit(1);
        if (delegated.error) throw delegated.error;
        if ((delegated.data || []).length) {
          next();
          return;
        }
      }
    } catch (error) {
      // Backward-compatible read-only access while the migration is not yet
      // present in a preview database. Never use this fallback for mutations.
      if (permissionKey === 'command.overview.read' && (role === 'ADMIN' || role === 'MASTER_ADMIN')) {
        next();
        return;
      }
      console.error('[SABI COMMAND] Permission lookup failed closed:', error instanceof Error ? error.message : 'unknown error');
      res.status(503).json({ error: 'Admin permission service is not ready. Apply the reviewed SABI COMMAND RBAC migration in this environment.' });
      return;
    }

    res.status(403).json({ error: 'Your account does not have the required SABI COMMAND permission.', required_permission: permissionKey });
  };
}
