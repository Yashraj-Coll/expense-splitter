import { formatMoney, formatDate } from '../utils.js';

function ExpenseRow({ expense, onView, onEdit, onDelete }) {
  return (
    <tr>
      <td>
        <a href="#" className="link" onClick={(e) => { e.preventDefault(); onView(expense); }}>
          {expense.description}
        </a>
      </td>
      <td>{expense.category}</td>
      <td>{expense.paidByName}</td>
      <td>{formatDate(expense.date)}</td>
      <td className="right">{formatMoney(expense.amount)}</td>
      <td className="right">
        <button className="btn btn-small btn-grey" onClick={() => onEdit(expense)}>
          Edit
        </button>{' '}
        <button className="btn btn-small btn-red" onClick={() => onDelete(expense)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export default ExpenseRow;
