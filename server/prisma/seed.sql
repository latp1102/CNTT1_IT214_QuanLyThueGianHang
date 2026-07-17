-- SQL seed data for `booths` table (MySQL)
-- Insert realistic sample booths
INSERT INTO booths (name, area, price, floor, zone, status, description, images, created_at, updated_at) VALUES
('Gian hàng 1', 25.5, 1500.00, 1, 'A', 'available', 'Gian hàng 1 ở tầng 1, khu A', NULL, NOW(), NOW()),
('Gian hàng 2', 30.0, 1800.00, 2, 'B', 'available', 'Gian hàng 2 ở tầng 2, khu B', NULL, NOW(), NOW()),
('Gian hàng 3', 22.8, 1300.00, 1, 'C', 'rented', 'Gian hàng 3 đang cho thuê', NULL, NOW(), NOW()),
('Gian hàng 4', 35.0, 2000.00, 3, 'A', 'available', 'Gian hàng 4 ở tầng 3, khu A', NULL, NOW(), NOW()),
('Gian hàng 5', 28.4, 1700.00, 2, 'C', 'maintenance', 'Gian hàng 5 đang bảo trì', NULL, NOW(), NOW());

-- Optional: Insert related sample data for contracts, customers, payments if needed.
-- Example contract for rented booth 3
INSERT INTO contracts (contract_code, booth_id, customer_id, deposit, start_date, end_date, status, created_at, updated_at) VALUES
('CT-2026-001', 3, 1, 500.00, '2026-07-01', '2027-07-01', 'active', NOW(), NOW());

-- Example customer
INSERT INTO customers (user_id, name, email, phone, id_card, status, created_at, updated_at) VALUES
(NULL, 'Nguyen Van A', 'customer1@example.com', '0123456789', '123456789', 'active', NOW(), NOW());

-- Example payment for the contract above
INSERT INTO payments (payment_code, contract_id, amount, payment_method, payment_date, status, created_at, updated_at) VALUES
('PM-2026-001', 1, 1500.00, 'cash', NOW(), 'paid', NOW(), NOW());
