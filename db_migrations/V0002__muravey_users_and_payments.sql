-- Таблица анонимных пользователей Муравья (идентификация по device_id или email)
CREATE TABLE IF NOT EXISTS muravey_users (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  free_requests_used INTEGER NOT NULL DEFAULT 0,
  paid_requests_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muravey_users_device_id ON muravey_users(device_id);
CREATE INDEX IF NOT EXISTS idx_muravey_users_email ON muravey_users(email);

-- Таблица платежей
CREATE TABLE IF NOT EXISTS muravey_payments (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  package_id VARCHAR(20) NOT NULL,        -- '20req', '40req', '100req'
  requests_count INTEGER NOT NULL,        -- кол-во запросов в пакете
  amount INTEGER NOT NULL,               -- сумма в копейках
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, paid, failed
  payment_id VARCHAR(255) NULL,          -- ID платежа от Т-Бизнес
  sbp_qr_url TEXT NULL,                  -- ссылка на QR-код СБП
  sbp_payload TEXT NULL,                 -- payload для СБП
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_muravey_payments_device_id ON muravey_payments(device_id);
CREATE INDEX IF NOT EXISTS idx_muravey_payments_payment_id ON muravey_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_muravey_payments_status ON muravey_payments(status);
