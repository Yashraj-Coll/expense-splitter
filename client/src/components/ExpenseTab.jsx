import { useState, useEffect } from 'react';
import API, { getError } from '../api.js';
import ExpenseFilters from './ExpenseFilters.jsx';
import ExpenseList from './ExpenseList.jsx';
import ExpenseForm from './ExpenseForm.jsx';
import ExpenseDetails from './ExpenseDetails.jsx';
import Loader from './Loader.jsx';
import ErrorMessage from './ErrorMessage.jsx';

function ExpenseTab({ groupId, members }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({ search: '', category: '', paidBy: '', date: '', sort: 'date-desc' });
  const [searchText, setSearchText] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchText(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      const [sortBy, sortOrder] = filters.sort.split('-');
      const res = await API.get('/groups/' + groupId + '/expenses', {
        params: {
          search: searchText,
          category: filters.category,
          paidBy: filters.paidBy,
          date: filters.date,
          sortBy,
          sortOrder,
        },
      });
      setExpenses(res.data);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [groupId, searchText, filters.category, filters.paidBy, filters.date, filters.sort]);

  const handleEdit = async (expense) => {
    try {
      const res = await API.get('/groups/' + groupId + '/expenses/' + expense.id);
      setEditingExpense(res.data);
    } catch (err) {
      setError(getError(err));
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm('Delete "' + expense.description + '"?')) {
      return;
    }
    try {
      await API.delete('/groups/' + groupId + '/expenses/' + expense.id);
      fetchExpenses();
    } catch (err) {
      setError(getError(err));
    }
  };

  if (members.length === 0) {
    return (
      <div className="empty-box">
        <p>Add some members first (Members tab) before adding expenses.</p>
      </div>
    );
  }

  const isFiltering = filters.search || filters.category || filters.paidBy || filters.date;

  return (
    <div>
      <div className="page-header">
        <h3>Expenses</h3>
        <button className="btn" onClick={() => setShowForm(true)}>
          Add Expense
        </button>
      </div>

      <ExpenseFilters filters={filters} members={members} onChange={setFilters} />

      {loading && <Loader text="Loading expenses..." />}
      <ErrorMessage message={error} onRetry={fetchExpenses} />

      {!loading && !error && expenses.length === 0 && (
        <div className="empty-box">
          <p>{isFiltering ? 'No expenses match your search.' : 'No expenses yet. Click "Add Expense" to add one.'}</p>
        </div>
      )}

      {expenses.length > 0 && (
        <ExpenseList
          expenses={expenses}
          onView={(e) => setViewingId(e.id)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <ExpenseForm groupId={groupId} members={members} onClose={() => setShowForm(false)} onSaved={fetchExpenses} />
      )}
      {editingExpense && (
        <ExpenseForm
          groupId={groupId}
          members={members}
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSaved={fetchExpenses}
        />
      )}
      {viewingId && <ExpenseDetails groupId={groupId} expenseId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}

export default ExpenseTab;
