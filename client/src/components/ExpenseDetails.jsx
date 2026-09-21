import { useState, useEffect } from 'react';
import API, { getError } from '../api.js';
import { formatMoney, formatDate } from '../utils.js';
import Modal from './Modal.jsx';
import Loader from './Loader.jsx';
import ErrorMessage from './ErrorMessage.jsx';

function ExpenseDetails({ groupId, expenseId, onClose }) {
  const [expense, setExpense] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const res = await API.get('/groups/' + groupId + '/expenses/' + expenseId);
        setExpense(res.data);
      } catch (err) {
        setError(getError(err));
      }
    };
    fetchExpense();
  }, [groupId, expenseId]);

  return (
    <Modal title="Expense Details" onClose={onClose}>
      <ErrorMessage message={error} />
      {!expense && !error && <Loader />}
      {expense && (
        <div>
          <p>
            <b>Description:</b> {expense.description}
          </p>
          <p>
            <b>Amount:</b> {formatMoney(expense.amount)}
          </p>
          <p>
            <b>Paid by:</b> {expense.paidByName}
          </p>
          <p>
            <b>Category:</b> {expense.category}
          </p>
          <p>
            <b>Date:</b> {formatDate(expense.date)}
          </p>
          <p>
            <b>Split type:</b> {expense.splitType === 'equal' ? 'Equal' : 'Exact amounts'}
          </p>

          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th className="right">Share</th>
              </tr>
            </thead>
            <tbody>
              {expense.splits.map((s) => (
                <tr key={s.memberId}>
                  <td>{s.name}</td>
                  <td className="right">{formatMoney(s.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export default ExpenseDetails;
