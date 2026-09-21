const express = require('express');
const db = require('../db');
const { CATEGORIES, getBalances } = require('../helpers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [groups] = await db.query(
      `SELECT g.id, g.name, g.created_at AS createdAt,
        (SELECT COUNT(*) FROM members WHERE group_id = g.id) AS memberCount,
        (SELECT COUNT(*) FROM expenses WHERE group_id = g.id) AS expenseCount,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE group_id = g.id) AS totalExpenses
       FROM expense_groups g ORDER BY g.id DESC`
    );
    res.json(groups);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    if (name.length > 80) {
      return res.status(400).json({ message: 'Group name must be 80 characters or less' });
    }

    const [result] = await db.query('INSERT INTO expense_groups (name) VALUES (?)', [name]);
    const [rows] = await db.query('SELECT id, name, created_at AS createdAt FROM expense_groups WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:groupId', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, created_at AS createdAt FROM expense_groups WHERE id = ?', [req.params.groupId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:groupId', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    if (name.length > 80) {
      return res.status(400).json({ message: 'Group name must be 80 characters or less' });
    }

    const [result] = await db.query('UPDATE expense_groups SET name = ? WHERE id = ?', [name, req.params.groupId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json({ id: Number(req.params.groupId), name });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:groupId', async (req, res) => {
  const groupId = req.params.groupId;
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query('SELECT id FROM expense_groups WHERE id = ?', [groupId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    await conn.beginTransaction();
    await conn.query('DELETE FROM settlements WHERE group_id = ?', [groupId]);
    await conn.query('DELETE FROM expenses WHERE group_id = ?', [groupId]);
    await conn.query('DELETE FROM members WHERE group_id = ?', [groupId]);
    await conn.query('DELETE FROM expense_groups WHERE id = ?', [groupId]);
    await conn.commit();

    res.status(204).end();
  } catch (err) {
    await conn.rollback();
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

router.get('/:groupId/balances', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM expense_groups WHERE id = ?', [req.params.groupId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const balances = await getBalances(req.params.groupId);
    res.json({ balances });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:groupId/dashboard', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const [groups] = await db.query('SELECT id, name FROM expense_groups WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const [totals] = await db.query('SELECT COUNT(*) AS expenseCount, COALESCE(SUM(amount), 0) AS totalExpenses FROM expenses WHERE group_id = ?', [groupId]);
    const [memberRows] = await db.query('SELECT COUNT(*) AS memberCount FROM members WHERE group_id = ?', [groupId]);
    const [categoryRows] = await db.query('SELECT category, SUM(amount) AS total FROM expenses WHERE group_id = ? GROUP BY category', [groupId]);
    const [recent] = await db.query(
      `SELECT e.id, e.description, e.amount, e.category, e.expense_date AS date, m.name AS paidByName
       FROM expenses e JOIN members m ON m.id = e.paid_by
       WHERE e.group_id = ? ORDER BY e.expense_date DESC, e.id DESC LIMIT 5`,
      [groupId]
    );

    const categories = CATEGORIES.map((name) => {
      const found = categoryRows.find((c) => c.category === name);
      return { category: name, total: found ? found.total : 0 };
    });

    const balances = await getBalances(groupId);
    let outstanding = 0;
    balances.forEach((b) => {
      if (b.amount > 0) outstanding += b.amount;
    });

    res.json({
      totalExpenses: totals[0].totalExpenses,
      expenseCount: totals[0].expenseCount,
      memberCount: memberRows[0].memberCount,
      outstandingBalance: Math.round(outstanding * 100) / 100,
      categories,
      recentExpenses: recent,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
