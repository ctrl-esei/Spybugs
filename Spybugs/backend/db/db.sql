CREATE DATABASE IF NOT EXISTS spybugs_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE spybugs_pos;

-- =========================================== ADMINS
CREATE TABLE `admins` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(190) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admins` (`id`, `name`, `email`, `username`, `password_hash`, `last_login_at`, `reset_token`, `reset_token_expires_at`, `created_at`, `updated_at`) VALUES
(1, 'Administrator', 'Spybugs25@gmail.com', 'admin', '$2y$10$s/bggi2sjUTmBq1xLtsHMO/MNToKux1lj/3wxQYxgCe0FOts9SRgO', '2025-11-21 01:11:27', NULL, NULL, '2025-11-19 13:35:59', '2025-11-21 01:11:27');


-- =========================================== INVENTORY
CREATE TABLE `inventory` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sku` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `reorder_level` int(11) NOT NULL DEFAULT 0,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================ INVETORY LAMAN
INSERT INTO inventory (id, sku, name, category, description, stock_quantity, reorder_level, unit_price, is_active, created_at, updated_at) VALUES
(3, 'PAPER-A4', 'A4 Paper', 'Print Papers', 'A4 copy paper for printing', 285, 50, 3.00, 1, '2025-11-20 16:44:50', '2025-11-21 18:56:34'),
(4, 'PAPER-A3', 'A3 Paper', 'Print Papers', 'A3 copy paper for printing', 100, 20, 10.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(5, 'PAPER-SHORT', 'Short Bond Paper', 'Print Papers', 'Short size bond paper', 300, 50, 3.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(6, 'PAPER-LONG', 'Long Bond Paper', 'Print Papers', 'Long size bond paper', 290, 50, 3.00, 1, '2025-11-20 16:44:50', '2025-11-21 19:15:55'),
(7, 'PAPER-GLOSSY', 'Glossy Photo Paper', 'Print Papers', 'Glossy photo paper', 100, 20, 15.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(8, 'PAPER-BOARD', 'Board Paper', 'Print Papers', 'Board paper for covers and IDs', 99, 20, 20.00, 1, '2025-11-20 16:44:50', '2025-11-20 19:18:13'),
(9, 'PHOTO-3R', '3R Photo Paper', 'Picture Packages', '3R size photo paper', 48, 10, 20.00, 1, '2025-11-20 16:44:50', '2025-11-21 18:44:14'),
(10, 'PHOTO-4R', '4R Photo Paper', 'Picture Packages', '4R size photo paper', 50, 10, 30.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(11, 'PHOTO-5R', '5R Photo Paper', 'Picture Packages', '5R size photo paper', 50, 10, 35.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(12, 'STICKER', 'Sticker Paper', 'Print Papers', 'White sticker paper', 50, 10, 35.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(13, 'STICKER-TRANS', 'Transparent Sticker', 'Print Papers', 'Transparent sticker sheet', 50, 10, 40.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(14, 'INK-BLACK', 'Black Ink', 'Ink', 'Black original ink', 1, 1, 800.00, 1, '2025-11-20 16:44:50', '2025-11-21 00:57:00'),
(15, 'INK-CYAN', 'Cyan Ink', 'Ink', 'Cyan original ink', 2, 1, 800.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(16, 'INK-MAGENTA', 'Magenta Ink', 'Ink', 'Magenta original ink', 2, 1, 800.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50'),
(17, 'INK-YELLOW', 'Yellow Ink', 'Ink', 'Yellow original ink', 2, 1, 800.00, 1, '2025-11-20 16:44:50', '2025-11-20 16:44:50');

-- =========================================== ORDERS
CREATE TABLE `orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_code` varchar(30) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `status` enum('pending','in-queue','printing','ready','released','cancelled') NOT NULL DEFAULT 'pending',
  `payment_status` enum('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `channel` enum('walk_in','messenger','email','phone','other') NOT NULL DEFAULT 'walk_in',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================== ORDER ITEMS
CREATE TABLE `order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_id` bigint(20) UNSIGNED DEFAULT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `pages` int(11) DEFAULT NULL,
  `total_pages` int(11) DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_admins_email` (`email`),
  ADD UNIQUE KEY `uq_admins_username` (`username`),
  ADD KEY `idx_admins_reset_token` (`reset_token`);

ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inventory_sku` (`sku`),
  ADD KEY `idx_inventory_category_active` (`category`,`is_active`);

ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_orders_order_code` (`order_code`),
  ADD KEY `idx_orders_status_created_at` (`status`,`created_at`),
  ADD KEY `idx_orders_payment_status` (`payment_status`),
  ADD KEY `idx_orders_created_at` (`created_at`);

ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order_id` (`order_id`),
  ADD KEY `idx_order_items_inventory_id` (`inventory_id`);

ALTER TABLE `admins`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `inventory`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

ALTER TABLE `orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

ALTER TABLE `order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
