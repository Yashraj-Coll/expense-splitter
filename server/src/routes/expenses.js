const express = require('express');
const db = require('../db');
const { CATEGORIES, toPaise, hasTooManyDecimals, isValidDate, todayString, splitEqually } = require('../helpers');

const router = express.Router({ mergeParams: true });

async function checkExpense(body, groupId) {
  const description = (body.description || '').trim();
  if (!description) return { error: 'Description is required' };
  if (description.length > 80) return { error: 'Description must be 80 characters or less' };

  const amount = Number(body.amount);
  if (body.amount === undefined || body.amount === '' || isNaN(amount)) return { error: 'Amount must be a number' };
  if (amount <= 0) return { error: 'Amount must be greater than zero' };
  if (hasTooManyDecimals(amount)) return { error: 'Amount can have only 2 decimal places' };

  if (!CATEGORIES.includes(body.category)) return { error: 'Category must be one of: ' + CATEGORIES.join(', ') };

  const date = body.date || todayString();
  if (!isValidDate(date)) return { error: 'Date must look like 2026-09-20' };

  const [groupMembers] = await db.query('SELECT id FROM members WHERE group_id = ?', [groupId]);
  const memberIds = groupMembers.map((m) => m.id);

  const paidBy = Number(body.paidBy);
  if (!memberIds.includes(paidBy)) return { error: 'The payer must be a member of this group' };

  const splitType = body.splitType || 'equal';
  const amountInPaise = toPaise(amount);
  let splits = [];

  if (splitType === 'equal') {
    if (!Array.isArray(body.splitBetween) || body.splitBetween.length === 0) {
      return { error: 'Select at least one member to split with' };
    }
    const ids = body.splitBetween.map(Number);
    if (new Set(ids).size !== ids.length) return { error: 'A member is selected twice' };
    for (const id of ids) {
      if (!memberIds.includes(id)) return { error: 'Every member in the split must belong to this group' };
    }
    ids.sort((a, b) => a - b);
    splits = splitEqually(amountInPaise, ids);
  } else if (splitType === 'exact') {
    if (!Array.isArray(body.splits) || body.splits.length === 0) {
      return { error: 'Enter the share for each member' };
    }

    let totalPaise = 0;
    const seen = [];
    for (const s of body.splits) {
      const id = Number(s.memberId);
      const share = Number(s.amount);
      if (!memberIds.includes(id)) return { error: 'Every member in the split must belong to this group' };
      if (seen.includes(id)) return { error: 'A member is selected twice' };
      if (isNaN(share) || share < 0) return { error: 'Shares must be numbers that are not negative' };
      if (hasTooManyDecimals(share)) return { error: 'Shares can have only 2 decimal places' };
      seen.push(id);
      totalPaise += toPaise(share);
      splits.push({ memberId: id, share: share });
    }

    if (totalPaise !== amountInPaise) {
      return { error: 'Shares add up to ' + totalPaise / 100 + " but the expense amount is " + amount };
    }
  } else {
    return { error: 'Split type must be equal or exact' };
  }

  return { expense: { description, amount, paidBy, category: body.category, date, splitType, splits } };
}

async function getExpense(expenseId, groupId) {
  const [rows] = await db.query(
    `SELECT e.id, e.group_id AS groupId, e.description, e.amount, e.paid_by AS paidBy, m.name AS paidByName,
            e.category, e.expense_date AS date, e.split_type AS splitType
     FROM expenses e JOIN members m ON m.id = e.paid_by
     WHERE e.id = ? AND e.group_id = ?`,
    [expenseId, groupId]
  );
  if (rows.length === 0) return null;

  const [splits] = await db.query(
    `SELECT s.member_id AS memberId, m.name, s.share AS amount
     FROM expense_splits s JOIN members m ON m.id = s.member_id
     WHERE s.expense_id = ? ORDER BY s.member_id`,
    [expenseId]
  );
  return { ...rows[0], splits };
}

router.get('/', async (req, res) => {
  try {
    const { search, category, paidBy, date, dateFrom, dateTo } = req.query;
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = (req.query.sortOrder || 'desc').toLowerCase();

    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Unknown category' });
    }
    if (sortBy !== 'date' && sortBy !== 'amount') {
      return res.status(400).json({ message: 'sortBy must be date or amount' });
    }
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      return res.status(400).json({ message: 'sortOrder must be asc or desc' });
    }
    for (const d of [date, dateFrom, dateTo]) {
      if (d && !isValidDate(d)) {
        return res.status(400).json({ message: 'Dates must look like 2026-09-20' });
      }
    }

    let sql = `SELECT e.id, e.group_id AS groupId, e.description, e.amount, e.paid_by AS paidBy, m.name AS paidByName,
                      e.category, e.expense_date AS date, e.split_type AS splitType,
                      (SELECT COUNT(*) FROM expense_splits s WHERE s.expense_id = e.id) AS splitCount
               FROM expenses e JOIN members m ON m.id = e.paid_by
               WHERE e.group_id = ?`;
    const params = [req.params.groupId];

    if (search) {
      sql += ' AND e.description LIKE ?';
      params.push('%' + search.replace(/[\\%_]/g, '\\$&') + '%');
    }
    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }
    if (paidBy) {
      sql += ' AND e.paid_by = ?';
      params.push(Number(paidBy));
    }
    if (date) {
      sql += ' AND e.expense_date = ?';
      params.push(date);
    }
    if (dateFrom) {
      sql += ' AND e.expense_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND e.expense_date <= ?';
      params.push(dateTo);
    }

    const column = sortBy === 'amount' ? 'e.amount' : 'e.expense_date';
    sql += ' ORDER BY ' + column + ' ' + sortOrder.toUpperCase() + ', e.id DESC';

    const [expenses] = await db.query(sql, params);
    res.json(expenses);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:expenseId', async (req, res) => {
  try {
    const expense = await getExpense(req.params.expenseId, req.params.groupId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const groupId = req.params.groupId;
    const { error, expense } = await checkExpense(req.body, groupId);
    if (error) {
      return res.status(400).json({ message: error });
    }

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO expenses (group_id, description, amount, paid_by, category, expense_date, split_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [groupId, expense.description, expense.amount, expense.paidBy, expense.category, expense.date, expense.splitType]
    );
    for (const s of expense.splits) {
      await conn.query('INSERT INTO expense_splits (expense_id, member_id, share) VALUES (?, ?, ?)', [result.insertId, s.memberId, s.share]);
    }
    await conn.commit();

    res.status(201).json(await getExpense(result.insertId, groupId));
  } catch (err) {
    await conn.rollback();
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

router.put('/:expenseId', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { groupId, expenseId } = req.params;

    const existing = await getExpense(expenseId, groupId);
    if (!existing) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const { error, expense } = await checkExpense(req.body, groupId);
    if (error) {
      return res.status(400).json({ message: error });
    }

    await conn.beginTransaction();
    await conn.query(
      'UPDATE expenses SET description = ?, amount = ?, paid_by = ?, category = ?, expense_date = ?, split_type = ? WHERE id = ?',
      [expense.description, expense.amount, expense.paidBy, expense.category, expense.date, expense.splitType, expenseId]
    );
    await conn.query('DELETE FROM expense_splits WHERE expense_id = ?', [expenseId]);
    for (const s of expense.splits) {
      await conn.query('INSERT INTO expense_splits (expense_id, member_id, share) VALUES (?, ?, ?)', [expenseId, s.memberId, s.share]);
    }
    await conn.commit();

    res.json(await getExpense(expenseId, groupId));
  } catch (err) {
    await conn.rollback();
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

router.delete('/:expenseId', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM expenses WHERE id = ? AND group_id = ?', [req.params.expenseId, req.params.groupId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(204).end();
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
