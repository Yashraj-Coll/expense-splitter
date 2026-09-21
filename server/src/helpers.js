const db = require('./db');

const CATEGORIES = ['Food', 'Travel', 'Hotel', 'Shopping', 'Entertainment', 'Other'];

function toPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

function hasTooManyDecimals(value) {
  return Math.abs(value * 100 - Math.round(value * 100)) > 0.000001;
}

function isValidDate(text) {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !isNaN(Date.parse(text));
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function splitEqually(amountInPaise, memberIds) {
  const count = memberIds.length;
  const base = Math.floor(amountInPaise / count);
  const extra = amountInPaise - base * count;

  return memberIds.map((id, index) => {
    const paise = index < extra ? base + 1 : base;
    return { memberId: id, share: paise / 100 };
  });
}

async function getBalances(groupId) {
  const [members] = await db.query('SELECT id, name FROM members WHERE group_id = ? ORDER BY id', [groupId]);
  const [paid] = await db.query('SELECT paid_by AS id, SUM(amount) AS total FROM expenses WHERE group_id = ? GROUP BY paid_by', [groupId]);
  const [owed] = await db.query(
    `SELECT s.member_id AS id, SUM(s.share) AS total
     FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
     WHERE e.group_id = ? GROUP BY s.member_id`,
    [groupId]
  );
  const [sent] = await db.query('SELECT from_member AS id, SUM(amount) AS total FROM settlements WHERE group_id = ? GROUP BY from_member', [groupId]);
  const [received] = await db.query('SELECT to_member AS id, SUM(amount) AS total FROM settlements WHERE group_id = ? GROUP BY to_member', [groupId]);

  const findTotal = (rows, id) => {
    const row = rows.find((r) => r.id === id);
    return row ? toPaise(row.total) : 0;
  };

  return members.map((m) => {
    const paise = findTotal(paid, m.id) - findTotal(owed, m.id) + findTotal(sent, m.id) - findTotal(received, m.id);
    return { memberId: m.id, name: m.name, amount: paise / 100 };
  });
}

function suggestPayments(balances) {
  const getters = balances.filter((b) => b.amount > 0).map((b) => ({ ...b, left: toPaise(b.amount) }));
  const payers = balances.filter((b) => b.amount < 0).map((b) => ({ ...b, left: toPaise(-b.amount) }));
  const result = [];

  while (getters.length > 0 && payers.length > 0) {
    getters.sort((a, b) => b.left - a.left);
    payers.sort((a, b) => b.left - a.left);

    const getter = getters[0];
    const payer = payers[0];
    const pay = Math.min(getter.left, payer.left);

    result.push({
      fromMember: payer.memberId,
      fromName: payer.name,
      toMember: getter.memberId,
      toName: getter.name,
      amount: pay / 100,
    });

    getter.left -= pay;
    payer.left -= pay;
    if (getter.left === 0) getters.shift();
    if (payer.left === 0) payers.shift();
  }

  return result;
}

module.exports = { CATEGORIES, toPaise, hasTooManyDecimals, isValidDate, todayString, splitEqually, getBalances, suggestPayments };
