const express = require('express');
const cors = require('cors');
const db = require('./db');
const groupRoutes = require('./routes/groups');
const memberRoutes = require('./routes/members');
const expenseRoutes = require('./routes/expenses');
const settlementRoutes = require('./routes/settlements');

const app = express();
app.use(cors());
app.use(express.json());

async function checkGroup(req, res, next) {
  try {
    const [rows] = await db.query('SELECT id FROM expense_groups WHERE id = ?', [req.params.groupId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    next();
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
}

app.use('/api/groups', groupRoutes);
app.use('/api/groups/:groupId/members', checkGroup, memberRoutes);
app.use('/api/groups/:groupId/expenses', checkGroup, expenseRoutes);
app.use('/api/groups/:groupId/settlements', checkGroup, settlementRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }
  console.log(err);
  res.status(500).json({ message: 'Server error' });
});

module.exports = app;
