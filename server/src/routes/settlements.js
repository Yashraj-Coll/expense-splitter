const express = require('express');
const db = require('../db');
const { toPaise, hasTooManyDecimals, isValidDate, todayString, getBalances, suggestPayments } = require('../helpers');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.group_id AS groupId, s.from_member AS fromMember, f.name AS fromName,
              s.to_member AS toMember, t.name AS toName, s.amount, s.settled_on AS date
       FROM settlements s
       JOIN members f ON f.id = s.from_member
       JOIN members t ON t.id = s.to_member
       WHERE s.group_id = ? ORDER BY s.settled_on DESC, s.id DESC`,
      [req.params.groupId]
    );
    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const balances = await getBalances(req.params.groupId);
    res.json({ suggestions: suggestPayments(balances) });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const fromMember = Number(req.body.fromMember);
    const toMember = Number(req.body.toMember);
    const amount = Number(req.body.amount);
    const date = req.body.date || todayString();

    if (isNaN(amount) || req.body.amount === '' || req.body.amount === undefined) {
      return res.status(400).json({ message: 'Amount must be a number' });
    }
    if (amount <= 0) {
      return res.status(400).json({ message: 'Settlement amount must be greater than zero' });
    }
    if (hasTooManyDecimals(amount)) {
      return res.status(400).json({ message: 'Amount can have only 2 decimal places' });
    }
    if (fromMember === toMember) {
      return res.status(400).json({ message: 'A member cannot settle with themselves' });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Date must look like 2026-09-20' });
    }

    const [found] = await db.query('SELECT id FROM members WHERE group_id = ? AND id IN (?, ?)', [groupId, fromMember, toMember]);
    if (found.length !== 2) {
      return res.status(400).json({ message: 'Both members must belong to this group' });
    }

    const [result] = await db.query(
      'INSERT INTO settlements (group_id, from_member, to_member, amount, settled_on) VALUES (?, ?, ?, ?, ?)',
      [groupId, fromMember, toMember, toPaise(amount) / 100, date]
    );

    const [rows] = await db.query(
      `SELECT s.id, s.group_id AS groupId, s.from_member AS fromMember, f.name AS fromName,
              s.to_member AS toMember, t.name AS toName, s.amount, s.settled_on AS date
       FROM settlements s
       JOIN members f ON f.id = s.from_member
       JOIN members t ON t.id = s.to_member
       WHERE s.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
