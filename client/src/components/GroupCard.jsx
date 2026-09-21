import { Link } from 'react-router-dom';
import { formatMoney } from '../utils.js';

function GroupCard({ group }) {
  return (
    <Link to={'/groups/' + group.id} className="group-card">
      <h3>{group.name}</h3>
      <p className="group-amount">{formatMoney(group.totalExpenses)}</p>
      <p className="grey-text">
        {group.memberCount} members | {group.expenseCount} expenses
      </p>
    </Link>
  );
}

export default GroupCard;
