import { Router } from 'express';
import db from '../database.js';
import { auth, roleCheck } from '../middleware/auth.js';

const router = Router();

router.post('/', auth, roleCheck('supervisor'), (req, res) => {
  const { delegate_id, start_date, end_date, reason } = req.body;

  if (!delegate_id || !start_date || !end_date) {
    return res.status(400).json({ error: '请填写完整的委托信息' });
  }

  if (delegate_id === req.user.id) {
    return res.status(400).json({ error: '不能将审批委托给自己' });
  }

  if (start_date >= end_date) {
    return res.status(400).json({ error: '结束日期必须晚于开始日期' });
  }

  const delegate = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(delegate_id);
  if (!delegate) {
    return res.status(404).json({ error: '被委托人不存在' });
  }

  const overlap = db.prepare(
    `SELECT id FROM approval_delegations
     WHERE delegator_id = ? AND delegate_id = ? AND status = 'active'
       AND start_date < ? AND end_date > ?`
  ).get(req.user.id, delegate_id, end_date, start_date);

  if (overlap) {
    return res.status(400).json({ error: '该被委托人在此时间段内已有生效的委托' });
  }

  const result = db.prepare(
    `INSERT INTO approval_delegations (delegator_id, delegate_id, start_date, end_date, reason)
     VALUES (?, ?, ?, ?, ?)`
  ).run(req.user.id, delegate_id, start_date, end_date, reason || '');

  const delegation = db.prepare(
    `SELECT ad.*, u.name as delegate_name
     FROM approval_delegations ad
     JOIN users u ON ad.delegate_id = u.id
     WHERE ad.id = ?`
  ).get(result.lastInsertRowid);

  res.status(201).json(delegation);
});

router.get('/', auth, roleCheck('supervisor'), (req, res) => {
  const delegations = db.prepare(
    `SELECT ad.*, u.name as delegate_name, u.role as delegate_role
     FROM approval_delegations ad
     JOIN users u ON ad.delegate_id = u.id
     WHERE ad.delegator_id = ?
     ORDER BY ad.created_at DESC`
  ).all(req.user.id);

  res.json(delegations);
});

router.delete('/:id', auth, roleCheck('supervisor'), (req, res) => {
  const delegation = db.prepare(
    'SELECT * FROM approval_delegations WHERE id = ? AND delegator_id = ?'
  ).get(req.params.id, req.user.id);

  if (!delegation) {
    return res.status(404).json({ error: '委托记录不存在' });
  }

  db.prepare("UPDATE approval_delegations SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ message: '委托已取消' });
});

router.get('/active', auth, roleCheck('hr'), (req, res) => {
  const delegations = db.prepare(
    `SELECT ad.*,
       u1.name as delegator_name, u1.role as delegator_role, d1.name as delegator_dept,
       u2.name as delegate_name, u2.role as delegate_role, d2.name as delegate_dept
     FROM approval_delegations ad
     JOIN users u1 ON ad.delegator_id = u1.id
     LEFT JOIN departments d1 ON u1.department_id = d1.id
     JOIN users u2 ON ad.delegate_id = u2.id
     LEFT JOIN departments d2 ON u2.department_id = d2.id
     WHERE ad.status = 'active'
       AND ad.start_date <= date('now')
       AND ad.end_date >= date('now')
     ORDER BY ad.start_date DESC`
  ).all();

  res.json(delegations);
});

router.get('/delegated-to-me', auth, (req, res) => {
  const delegations = db.prepare(
    `SELECT ad.*, u.name as delegator_name
     FROM approval_delegations ad
     JOIN users u ON ad.delegator_id = u.id
     WHERE ad.delegate_id = ? AND ad.status = 'active'
       AND ad.start_date <= date('now')
       AND ad.end_date >= date('now')
     ORDER BY ad.start_date DESC`
  ).all(req.user.id);

  res.json(delegations);
});

router.get('/potential-delegates', auth, roleCheck('supervisor'), (req, res) => {
  const users = db.prepare(
    `SELECT u.id, u.name, u.role, d.name as department_name
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id != ? AND u.role IN ('supervisor', 'employee', 'hr')
     ORDER BY CASE u.role
       WHEN 'supervisor' THEN 0
       WHEN 'hr' THEN 1
       WHEN 'employee' THEN 2
       ELSE 3
     END, u.name`
  ).all(req.user.id);

  res.json(users);
});

export default router;
