-- Fresh installation only. Existing deployments: use migrations/001_security.sql.
-- No DROP DATABASE / DROP TABLE statements. Back up existing data before any change.
CREATE DATABASE IF NOT EXISTS housing_sales_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE housing_sales_db;

CREATE TABLE IF NOT EXISTS buyers (
  buyer_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('buyer', 'admin') NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS housing_units (
  unit_id INT AUTO_INCREMENT PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,
  unit_number VARCHAR(50) NOT NULL,
  price_myr DECIMAL(12,2) NOT NULL,
  bedrooms INT NOT NULL DEFAULT 2,
  latitude VARCHAR(50) DEFAULT '3.15169640',
  longitude VARCHAR(50) DEFAULT '101.69423710',
  status ENUM('Available', 'Hold', 'Reserved', 'Sold') NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS unit_reservations (
  reservation_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  buyer_id INT NULL,
  unit_id INT NOT NULL,
  booking_fee_myr DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  status ENUM('Pending', 'Confirmed', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending',
  remarks TEXT NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reservations_buyer (buyer_id, created_at),
  INDEX idx_reservations_expiry (status, expires_at),
  FOREIGN KEY (buyer_id) REFERENCES buyers(buyer_id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES housing_units(unit_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
