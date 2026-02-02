-- Card Expense Tracker Database Schema
-- Supabase PostgreSQL

-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- 2. Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL,
  "order" INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  CHECK ("order" >= 0)
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_active_order ON categories(is_active, "order");

-- 3. Files Table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  card_company VARCHAR(50) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'completed'
);

CREATE INDEX idx_files_user_uploaded ON files(user_id, uploaded_at DESC);

-- 4. Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  merchant_name VARCHAR(200) NOT NULL,
  description TEXT,
  card_company VARCHAR(50) NOT NULL,
  needs_review BOOLEAN DEFAULT FALSE,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_user_category_date ON transactions(user_id, category_id, date);
CREATE INDEX idx_transactions_needs_review ON transactions(needs_review);

-- 5. User Feedbacks Table
CREATE TABLE user_feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  old_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  new_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  merchant_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedbacks_merchant ON user_feedbacks(merchant_name);
CREATE INDEX idx_feedbacks_user_created ON user_feedbacks(user_id, created_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
