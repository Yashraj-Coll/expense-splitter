process.env.DB_NAME = 'expense_splitter_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const setup = require('../src/setup');

let server;
let base;
const db = () => require('../src/db');

test.before(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  await conn.query('DROP DATABASE IF EXISTS expense_splitter_test');
  await conn.end();
  await setup();

  const app = require('../src/app');
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = 'http://localhost:' + server.address().port + '/api';
});

test.after(async () => {
  server.close();
  await db().end();
});

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function makeGroup() {
  const g = (await call('POST', '/groups', { name: 'Goa Trip' })).body;
  const add = async (name) => (await call('POST', `/groups/${g.id}/members`, { name })).body.id;
  const a = await add('Alice');
  const b = await add('Bob');
  const c = await add('Charlie');
  return { g, a, b, c };
}

test('group create, view, rename, delete', async () => {
  const created = await call('POST', '/groups', { name: 'Flat' });
  assert.equal(created.status, 201);
  const id = created.body.id;

  assert.equal((await call('GET', `/groups/${id}`)).body.name, 'Flat');
  assert.equal((await call('PATCH', `/groups/${id}`, { name: 'Flat 2' })).body.name, 'Flat 2');
  assert.equal((await call('POST', '/groups', { name: '   ' })).status, 400);
  assert.equal((await call('DELETE', `/groups/${id}`)).status, 204);
  assert.equal((await call('GET', `/groups/${id}`)).status, 404);
});

test('equal split, balances and suggestions', async () => {
  const { g, a, b, c } = await makeGroup();
  const r = await call('POST', `/groups/${g.id}/expenses`, {
    description: 'Dinner', amount: 900, paidBy: a, category: 'Food', date: '2026-09-20', splitBetween: [a, b, c],
  });
  assert.equal(r.status, 201);
  assert.deepEqual(r.body.splits.map((s) => s.amount), [300, 300, 300]);

  const balances = (await call('GET', `/groups/${g.id}/balances`)).body.balances;
  assert.deepEqual(balances.map((x) => x.amount), [600, -300, -300]);

  const suggestions = (await call('GET', `/groups/${g.id}/settlements/suggestions`)).body.suggestions;
  assert.equal(suggestions.length, 2);
  assert.ok(suggestions.every((s) => s.toMember === a && s.amount === 300));
});

test('uneven equal split does not lose paise', async () => {
  const { g, a, b, c } = await makeGroup();
  const r = await call('POST', `/groups/${g.id}/expenses`, {
    description: 'Taxi', amount: 100, paidBy: a, category: 'Travel', splitBetween: [a, b, c],
  });
  assert.deepEqual(r.body.splits.map((s) => s.amount), [33.34, 33.33, 33.33]);
});

test('exact split must add up to the amount', async () => {
  const { g, a, b, c } = await makeGroup();
  const body = { description: 'Lunch', amount: 900, paidBy: a, category: 'Food', splitType: 'exact' };

  const bad = await call('POST', `/groups/${g.id}/expenses`, {
    ...body,
    splits: [{ memberId: a, amount: 500 }, { memberId: b, amount: 250 }, { memberId: c, amount: 100 }],
  });
  assert.equal(bad.status, 400);

  const good = await call('POST', `/groups/${g.id}/expenses`, {
    ...body,
    splits: [{ memberId: a, amount: 500 }, { memberId: b, amount: 250 }, { memberId: c, amount: 150 }],
  });
  assert.equal(good.status, 201);
});

test('expense validation', async () => {
  const { g, a, b } = await makeGroup();
  const other = await makeGroup();
  const valid = { description: 'X', amount: 100, paidBy: a, category: 'Food', splitBetween: [a, b] };
  const post = (changes) => call('POST', `/groups/${g.id}/expenses`, { ...valid, ...changes });

  assert.equal((await post({ amount: 0 })).status, 400);
  assert.equal((await post({ amount: -5 })).status, 400);
  assert.equal((await post({ amount: 10.123 })).status, 400);
  assert.equal((await post({ category: 'Nope' })).status, 400);
  assert.equal((await post({ paidBy: other.a })).status, 400);
  assert.equal((await post({ splitBetween: [a, other.b] })).status, 400);
  assert.equal((await post({ splitBetween: [] })).status, 400);
  assert.equal((await call('POST', '/groups/99999/expenses', valid)).status, 404);
});

test('member with an expense cannot be removed', async () => {
  const { g, a, b, c } = await makeGroup();
  await call('POST', `/groups/${g.id}/expenses`, {
    description: 'Dinner', amount: 300, paidBy: a, category: 'Food', splitBetween: [a, b],
  });
  assert.equal((await call('DELETE', `/groups/${g.id}/members/${a}`)).status, 409);
  assert.equal((await call('DELETE', `/groups/${g.id}/members/${b}`)).status, 409);
  assert.equal((await call('DELETE', `/groups/${g.id}/members/${c}`)).status, 204);
});

test('duplicate member name is rejected', async () => {
  const { g } = await makeGroup();
  const again = await call('POST', `/groups/${g.id}/members`, { name: 'alice' });
  assert.equal(again.status, 409);
});

test('search, filter and sort', async () => {
  const { g, a, b } = await makeGroup();
  const add = (description, amount, paidBy, category, date) =>
    call('POST', `/groups/${g.id}/expenses`, { description, amount, paidBy, category, date, splitBetween: [a, b] });
  await add('Dinner', 1200, a, 'Food', '2026-09-20');
  await add('Cab', 400, b, 'Travel', '2026-09-21');
  await add('Late dinner', 300, b, 'Food', '2026-09-22');

  const list = async (query) => (await call('GET', `/groups/${g.id}/expenses?${query}`)).body;
  assert.equal((await list('search=dinner')).length, 2);
  assert.equal((await list('category=Travel')).length, 1);
  assert.equal((await list(`paidBy=${b}`)).length, 2);
  assert.equal((await list('date=2026-09-21'))[0].description, 'Cab');
  assert.deepEqual((await list('sortBy=amount&sortOrder=desc')).map((e) => e.amount), [1200, 400, 300]);
  assert.deepEqual((await list('sortBy=date&sortOrder=asc')).map((e) => e.date), ['2026-09-20', '2026-09-21', '2026-09-22']);
  assert.equal((await call('GET', `/groups/${g.id}/expenses?sortBy=drop`)).status, 400);
  assert.equal((await list('search=%25')).length, 0);
});

test('edit and delete expense', async () => {
  const { g, a, b } = await makeGroup();
  const e = (await call('POST', `/groups/${g.id}/expenses`, {
    description: 'Hotel', amount: 1000, paidBy: a, category: 'Hotel', splitBetween: [a, b],
  })).body;

  const edited = await call('PUT', `/groups/${g.id}/expenses/${e.id}`, {
    description: 'Hotel', amount: 2000, paidBy: a, category: 'Hotel', splitBetween: [a, b],
  });
  assert.equal(edited.body.amount, 2000);
  assert.equal((await call('GET', `/groups/${g.id}/balances`)).body.balances[0].amount, 1000);

  assert.equal((await call('DELETE', `/groups/${g.id}/expenses/${e.id}`)).status, 204);
  assert.equal((await call('GET', `/groups/${g.id}/balances`)).body.balances[0].amount, 0);
});

test('settlement rules and balances', async () => {
  const { g, a, b, c } = await makeGroup();
  const other = await makeGroup();
  await call('POST', `/groups/${g.id}/expenses`, {
    description: 'Dinner', amount: 900, paidBy: a, category: 'Food', splitBetween: [a, b, c],
  });

  const post = (body) => call('POST', `/groups/${g.id}/settlements`, body);
  assert.equal((await post({ fromMember: b, toMember: a, amount: 0 })).status, 400);
  assert.equal((await post({ fromMember: b, toMember: b, amount: 10 })).status, 400);
  assert.equal((await post({ fromMember: b, toMember: other.a, amount: 10 })).status, 400);

  const ok = await post({ fromMember: b, toMember: a, amount: 300 });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.fromName, 'Bob');

  const balances = (await call('GET', `/groups/${g.id}/balances`)).body.balances;
  assert.deepEqual(balances.map((x) => x.amount), [300, 0, -300]);
  assert.equal((await call('GET', `/groups/${g.id}/settlements`)).body.length, 1);
  assert.equal((await call('DELETE', `/groups/${g.id}/members/${b}`)).status, 409);
});

test('dashboard', async () => {
  const { g, a, b } = await makeGroup();
  await call('POST', `/groups/${g.id}/expenses`, { description: 'Dinner', amount: 500, paidBy: a, category: 'Food', splitBetween: [a, b] });
  await call('POST', `/groups/${g.id}/expenses`, { description: 'Cab', amount: 300, paidBy: b, category: 'Travel', splitBetween: [a, b] });

  const d = (await call('GET', `/groups/${g.id}/dashboard`)).body;
  assert.equal(d.totalExpenses, 800);
  assert.equal(d.expenseCount, 2);
  assert.equal(d.memberCount, 3);
  assert.equal(d.categories.find((c) => c.category === 'Food').total, 500);
  assert.equal(d.outstandingBalance, 100);
});

test('bad json gives 400 and unknown route 404', async () => {
  const res = await fetch(base + '/groups', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
  assert.equal(res.status, 400);
  assert.equal((await call('GET', '/nothing')).status, 404);
});
