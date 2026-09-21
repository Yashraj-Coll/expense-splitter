import { CATEGORIES } from '../utils.js';

function ExpenseFilters({ filters, members, onChange }) {
  const handleChange = (e) => {
    onChange({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    onChange({ search: '', category: '', paidBy: '', date: '', sort: 'date-desc' });
  };

  return (
    <div className="filters">
      <input type="text" name="search" placeholder="Search description" value={filters.search} onChange={handleChange} />

      <select name="category" value={filters.category} onChange={handleChange}>
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select name="paidBy" value={filters.paidBy} onChange={handleChange}>
        <option value="">Paid by (anyone)</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <input type="date" name="date" value={filters.date} onChange={handleChange} />

      <select name="sort" value={filters.sort} onChange={handleChange}>
        <option value="date-desc">Date (newest)</option>
        <option value="date-asc">Date (oldest)</option>
        <option value="amount-desc">Amount (high to low)</option>
        <option value="amount-asc">Amount (low to high)</option>
      </select>

      <button className="btn btn-grey" onClick={clearFilters}>
        Clear
      </button>
    </div>
  );
}

export default ExpenseFilters;
