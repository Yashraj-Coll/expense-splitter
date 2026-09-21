import { formatMoney, formatDate } from '../utils.js';

function SettlementList({ settlements }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Payment</th>
          <th>Date</th>
          <th className="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {settlements.map((s) => (
          <tr key={s.id}>
            <td>
              {s.fromName} paid {s.toName}
            </td>
            <td>{formatDate(s.date)}</td>
            <td className="right">{formatMoney(s.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default SettlementList;
