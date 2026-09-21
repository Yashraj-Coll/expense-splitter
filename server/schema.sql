CREATE TABLE IF NOT EXISTS expense_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_member_name (group_id, name),
  FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  description VARCHAR(80) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_by INT NOT NULL,
  category ENUM('Food','Travel','Hotel','Shopping','Entertainment','Other') NOT NULL,
  expense_date DATE NOT NULL,
  split_type ENUM('equal','exact') NOT NULL DEFAULT 'equal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (amount > 0),
  INDEX idx_expenses_group (group_id),
  FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES members(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expense_splits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  member_id INT NOT NULL,
  share DECIMAL(10,2) NOT NULL,
  UNIQUE KEY unique_split (expense_id, member_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  from_member INT NOT NULL,
  to_member INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  settled_on DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (amount > 0),
  FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (from_member) REFERENCES members(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_member) REFERENCES members(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
