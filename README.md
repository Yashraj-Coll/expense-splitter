# Expense Splitter

A web app for splitting shared expenses within a group. You create a group, add the people in it, record who paid for what, and the app works out who owes whom and how to settle up with the fewest payments.

Built with React, Express and MySQL.

## Screenshots

**Groups**

![Groups](screenshots/groups.png)

**Group overview**

![Overview](screenshots/overview.png)

**Expenses with search, filters and sorting**

![Expenses](screenshots/expenses.png)

**Adding an expense with an exact split**

![Add expense](screenshots/expense-form.png)

**Balances and suggested settlements**

![Balances](screenshots/balances.png)

**Settlement history**

![Settlements](screenshots/settlements.png)

**Validation error on the form**

![Validation error](screenshots/error-validation.png)

**Error shown when the server or database is down**

![Server error](screenshots/error-server.png)

## Features

- Groups: create, list, view, rename, delete
- Members: add, list, rename, remove. A member who is part of any expense or settlement cannot be removed
- Expenses: create, view, edit, delete, with description, amount, payer, category, date and split
- Two split modes: equal, and exact amounts (shares must add up to the expense amount)
- Search by description, filter by category, payer and date, sort by amount or date
- Balance view per member, calculated from expenses and settlements
- Settlements: record payments between members, view history
- Settlement suggestions that clear all balances with the fewest payments
- Group overview with totals, category breakdown and recent expenses
- Loading, empty, validation and server error states in the UI

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, Vite, React Router, Axios |
| Backend | Node.js, Express 5 |
| Database | MySQL 8 (mysql2 driver) |
| Tests | node:test, run against a real MySQL database |

## Getting started

### Prerequisites

- Node.js 20 or later
- MySQL 8 running locally

### Setup

Install dependencies for both apps:

```
npm run install:all
```

Create `server/.env` by copying `server/.env.example` and filling in your MySQL details:

```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=expense_splitter
```

Create the database and tables. This only needs to be done once:

```
npm run setup
```

This runs `server/schema.sql`. If you prefer, you can create a database yourself and run that file in MySQL Workbench instead.

### Run

Start the API in one terminal:

```
npm run server
```

Start the frontend in another:

```
npm run client
```

The app is at http://localhost:5173. The API runs on http://localhost:4000, and Vite proxies `/api` requests to it during development.

### Tests

```
npm test
```

The suite has 12 tests covering splitting, balances, validation rules, filtering, settlements and the dashboard. It creates and drops its own database called `expense_splitter_test`, so your real data is never touched. The MySQL user in `.env` needs permission to create databases.

## Project structure

```
server/
  schema.sql              table definitions
  src/
    app.js                express app and route mounting
    index.js              server entry point
    db.js                 mysql connection pool
    setup.js              creates the database and tables
    helpers.js            splitting, balances, settlement suggestions
    routes/               groups, members, expenses, settlements
  test/api.test.js        API tests

client/src/
  pages/                  GroupsPage, GroupDetails
  components/             GroupCard, ExpenseForm, ExpenseList, ExpenseRow,
                          MemberList, BalanceCard, SettlementList and others
  api.js                  axios instance and error helper
  utils.js                money and date formatting
```

## Database design

Five tables:

```
expense_groups   id, name
members          id, group_id, name                      unique (group_id, name)
expenses         id, group_id, description, amount, paid_by, category,
                 expense_date, split_type
expense_splits   id, expense_id, member_id, share        unique (expense_id, member_id)
settlements      id, group_id, from_member, to_member, amount, settled_on
```

A few decisions worth explaining:

**Splits are stored as rows, not derived.** Every expense has one row per participant in `expense_splits`. This makes equal and exact splits look the same to the balance query, and it keeps the exact shares even after rounding.

**Foreign keys on members use RESTRICT.** The API checks for existing expenses and settlements first and returns a clear 409 message, but the database enforces the same rule as a second layer. A member can never be deleted out from under an expense, even if someone bypasses the API.

**The group table is called `expense_groups`.** `groups` is a reserved word in MySQL 8 and would need quoting everywhere.

**Amounts are DECIMAL(10,2), but math is done in paise.** Before splitting, the amount is converted to whole paise, divided, and converted back. If it does not divide evenly, the leftover paise go to the first members. For example 100 split three ways gives 33.34, 33.33 and 33.33, and the shares always add up to exactly 100.

**Balances are never stored.** They are calculated on every request:

```
balance = paid - own shares + settlements sent - settlements received
```

Positive means the member should receive money, negative means they owe. Because nothing is cached, editing or deleting an expense can never leave a stale balance.

**Expenses are saved in a transaction.** The expense row and its split rows are written together, so a failure halfway never leaves a partial expense behind.

## Settlement suggestions

The algorithm is greedy. It takes the member who owes the most and the member who is owed the most, settles as much as possible between them, and repeats until everyone is at zero. This produces at most (members - 1) payments. It is not guaranteed to be the true minimum in every case, since that problem is NP-hard, but it is what most expense apps use and it works well for group sizes like these.

## API

Base path is `/api`.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET, POST | `/groups` | List groups, create a group |
| GET, PATCH, DELETE | `/groups/:groupId` | View, rename, delete a group |
| GET | `/groups/:groupId/dashboard` | Totals, categories, recent expenses |
| GET | `/groups/:groupId/balances` | Balance per member |
| GET, POST | `/groups/:groupId/members` | List, add members |
| PATCH, DELETE | `/groups/:groupId/members/:memberId` | Rename, remove a member |
| GET, POST | `/groups/:groupId/expenses` | List with filters, create |
| GET, PUT, DELETE | `/groups/:groupId/expenses/:expenseId` | View, edit, delete |
| GET, POST | `/groups/:groupId/settlements` | History, record a payment |
| GET | `/groups/:groupId/settlements/suggestions` | Suggested payments |

The expense list accepts these query parameters: `search`, `category`, `paidBy`, `date`, `dateFrom`, `dateTo`, `sortBy` (date or amount) and `sortOrder` (asc or desc). All filtering and sorting happens in SQL.

Creating an expense with an equal split:

```json
{
  "description": "Dinner",
  "amount": 900,
  "paidBy": 1,
  "category": "Food",
  "date": "2026-09-20",
  "splitBetween": [1, 2, 3]
}
```

For an exact split, send `"splitType": "exact"` and a `splits` array instead:

```json
{
  "splitType": "exact",
  "splits": [
    { "memberId": 1, "amount": 500 },
    { "memberId": 2, "amount": 250 },
    { "memberId": 3, "amount": 150 }
  ]
}
```

Errors return a JSON body like `{ "message": "..." }` with one of these status codes: 400 for invalid input, 404 for a missing group, member or expense, 409 for a conflict such as removing a member who has expenses, and 500 for server or database errors.

## Validation

All rules are enforced on the backend, and the React forms repeat the important ones for faster feedback:

- Expense and settlement amounts must be greater than zero and have at most 2 decimal places
- The group must exist, and the payer and every split member must belong to it
- Exact split shares must add up to the expense amount
- A settlement needs two different members, both in the same group
- A member with expenses or settlements cannot be removed
- Category must be one of Food, Travel, Hotel, Shopping, Entertainment, Other

## Known limitations

- No authentication. Anyone who can reach the app can see every group
- No pagination on the expense list
- The date filter in the UI takes a single date. The API also supports a date range
- Amounts are in INR only
- Split by percentage or shares is not implemented

## What I would do next

Add login so groups belong to users, paginate the expense list, support percentage splits, and add end to end tests for the React app.