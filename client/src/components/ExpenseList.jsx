import ExpenseRow from './ExpenseRow.jsx';

function ExpenseList({ expenses, onView, onEdit, onDelete }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Category</th>
          <th>Paid By</th>
          <th>Date</th>
          <th className="right">Amount</th>
          <th className="right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} onView={onView} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </tbody>
    </table>
  );
}

export default ExpenseList;
