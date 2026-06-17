import jwt from 'jsonwebtoken';
import db from '../database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'overtime-system-secret-key';

export function hasActiveDelegation(userId) {
  const row = db.prepare(
    `SELECT id FROM approval_delegations
     WHERE delegate_id = ? AND status = 'active'
       AND start_date <= date('now')
       AND end_date >= date('now')
     LIMIT 1`
  ).get(userId);
  return !!row;
}

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
      departmentId: decoded.departmentId,
      supervisorId: decoded.supervisorId,
    };
    next();
  } catch {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
}

export function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

export function roleCheckWithDelegation(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    if (allowedRoles.includes('supervisor') && hasActiveDelegation(req.user.id)) {
      return next();
    }
    return res.status(403).json({ error: '权限不足' });
  };
}

export { JWT_SECRET };
