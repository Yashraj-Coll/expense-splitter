const express = require('express');
const db = require('../db');

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  try {
    const [members] = await db.query('SELECT id, group_id AS groupId, name FROM members WHERE group_id = ? ORDER BY id', [req.params.groupId]);
    res.json(members);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (name.length > 80) {
      return res.status(400).json({ message: 'Name must be 80 characters or less' });
    }

    const [existing] = await db.query('SELECT id FROM members WHERE group_id = ? AND name = ?', [groupId, name]);
    if (existing.length > 0) {
      return res.status(409).json({ message: name + ' is already in this group' });
    }

    const [result] = await db.query('INSERT INTO members (group_id, name) VALUES (?, ?)', [groupId, name]);
    res.status(201).json({ id: result.insertId, groupId: Number(groupId), name });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:memberId', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (name.length > 80) {
      return res.status(400).json({ message: 'Name must be 80 characters or less' });
    }

    const [members] = await db.query('SELECT id FROM members WHERE id = ? AND group_id = ?', [memberId, groupId]);
    if (members.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const [existing] = await db.query('SELECT id FROM members WHERE group_id = ? AND name = ? AND id <> ?', [groupId, name, memberId]);
    if (existing.length > 0) {
      return res.status(409).json({ message: name + ' is already in this group' });
    }

    await db.query('UPDATE members SET name = ? WHERE id = ?', [name, memberId]);
    res.json({ id: Number(memberId), groupId: Number(groupId), name });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:memberId', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    const [members] = await db.query('SELECT id, name FROM members WHERE id = ? AND group_id = ?', [memberId, groupId]);
    if (members.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }
    const member = members[0];

    const [paid] = await db.query('SELECT id FROM expenses WHERE paid_by = ? LIMIT 1', [memberId]);
    const [inSplit] = await db.query('SELECT id FROM expense_splits WHERE member_id = ? LIMIT 1', [memberId]);
    if (paid.length > 0 || inSplit.length > 0) {
      return res.status(409).json({ message: member.name + ' is part of an expense, so they cannot be removed' });
    }

    const [settled] = await db.query('SELECT id FROM settlements WHERE from_member = ? OR to_member = ? LIMIT 1', [memberId, memberId]);
    if (settled.length > 0) {
      return res.status(409).json({ message: member.name + ' is part of a settlement, so they cannot be removed' });
    }

    await db.query('DELETE FROM members WHERE id = ?', [memberId]);
    res.status(204).end();
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
