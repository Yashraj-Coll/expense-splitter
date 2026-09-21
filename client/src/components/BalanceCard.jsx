import { formatMoney } from '../utils.js';

function BalanceCard({ balance }) {
  let text = 'Settled up';
  let className = 'balance-card';

  if (balance.amount > 0) {
    text = 'Gets ' + formatMoney(balance.amount);
    className = 'balance-card gets';
  } else if (balance.amount < 0) {
    text = 'Owes ' + formatMoney(-balance.amount);
    className = 'balance-card owes';
  }

  return (
    <div className={className}>
      <span className="balance-name">{balance.name}</span>
      <span className="balance-amount">{text}</span>
    </div>
  );
}

export default BalanceCard;
