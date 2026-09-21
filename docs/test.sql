-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.8.6-MariaDB-5ubuntu0.1 from Ubuntu - -- Please help get to 10k stars at https://github.com/MariaDB/Server
-- Server OS:                    debian-linux-gnu
-- HeidiSQL Version:             12.17.1.1
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table test.assets
CREATE TABLE IF NOT EXISTS `assets` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `path` varchar(255) NOT NULL,
  `hash` varchar(64) NOT NULL,
  `ext` varchar(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.assets: ~0 rows (approximately)

-- Dumping structure for table test.departements
CREATE TABLE IF NOT EXISTS `departements` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.departements: ~2 rows (approximately)
INSERT INTO `departements` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('01a0a6ef-75bc-70e4-a815-e71ad1dc9480', 'Produksi', '2026-09-15 21:28:19', '2026-09-15 21:28:19', NULL),
	('01a0a6ef-75bc-7b69-890f-3da1477f15a4', 'Gudang', '2026-09-15 21:28:19', '2026-09-15 21:28:19', NULL);

-- Dumping structure for table test.good_inbound_detail
CREATE TABLE IF NOT EXISTS `good_inbound_detail` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `id_good_inbound` char(36) NOT NULL,
  `id_good` char(36) NOT NULL,
  `price` bigint(20) NOT NULL,
  `amount` int(11) NOT NULL,
  `uom` char(10) NOT NULL,
  `total` bigint(20) NOT NULL,
  `date_expired` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_good_inbound_details` (`id_good_inbound`),
  KEY `idx_master_good_inbound_details` (`id_good`),
  CONSTRAINT `good_inbound_detail_ibfk_1` FOREIGN KEY (`id_good_inbound`) REFERENCES `good_inbounds` (`id`) ON DELETE CASCADE,
  CONSTRAINT `good_inbound_detail_ibfk_2` FOREIGN KEY (`id_good`) REFERENCES `goods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.good_inbound_detail: ~2 rows (approximately)
INSERT INTO `good_inbound_detail` (`id`, `id_good_inbound`, `id_good`, `price`, `amount`, `uom`, `total`, `date_expired`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('98fd753f-b163-11f1-a48a-1632b7fed635', '688f52f8-b162-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-7788-9551-6e262ea1a6f6', 2500000, 10, 'PK', 25000000, NULL, '2026-09-16 00:14:35', '2026-09-16 00:14:35', NULL),
	('98fe421b-b163-11f1-a48a-1632b7fed635', '688f52f8-b162-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-7e84-a62d-a36707312b4c', 4000000, 4, 'PK', 16000000, NULL, '2026-09-16 00:14:35', '2026-09-16 00:14:35', NULL);

-- Dumping structure for table test.good_inbounds
CREATE TABLE IF NOT EXISTS `good_inbounds` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `id_unit` char(36) NOT NULL,
  `origin` varchar(255) NOT NULL,
  `contact_person` varchar(150) NOT NULL,
  `no_contact` varchar(20) NOT NULL,
  `no_letter` varchar(50) DEFAULT NULL,
  `id_attachment` char(36) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_unit_good_inbounds` (`id_unit`),
  KEY `idx_attachment_good_inbounds` (`id_attachment`),
  CONSTRAINT `good_inbounds_ibfk_2` FOREIGN KEY (`id_attachment`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `good_inbounds_units_FK` FOREIGN KEY (`id_unit`) REFERENCES `units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.good_inbounds: ~1 rows (approximately)
INSERT INTO `good_inbounds` (`id`, `id_unit`, `origin`, `contact_person`, `no_contact`, `no_letter`, `id_attachment`, `note`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('688f52f8-b162-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-70b6-9be4-883a54f97563', 'PT. Mandala Buku', 'Kevin Mandala', '08995008595', '123', NULL, NULL, '2026-09-16 00:06:04', '2026-09-16 00:06:04', NULL);

-- Dumping structure for table test.good_locations
CREATE TABLE IF NOT EXISTS `good_locations` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `id_good` char(36) NOT NULL,
  `id_location_rack` char(36) NOT NULL,
  `rack` int(11) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_location_racks` (`id_location_rack`),
  KEY `idx_good_location_rack` (`id_good`),
  CONSTRAINT `good_locations_ibfk_1` FOREIGN KEY (`id_location_rack`) REFERENCES `location_racks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `good_locations_ibfk_2` FOREIGN KEY (`id_good`) REFERENCES `goods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.good_locations: ~2 rows (approximately)
INSERT INTO `good_locations` (`id`, `id_good`, `id_location_rack`, `rack`, `note`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('cd6fa3f8-b164-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-7788-9551-6e262ea1a6f6', 'bec47ad1-b164-11f1-a48a-1632b7fed635', 1, NULL, '2026-09-16 00:23:12', '2026-09-16 00:23:12', NULL),
	('cd6fe5f5-b164-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-7e84-a62d-a36707312b4c', 'bec47ad1-b164-11f1-a48a-1632b7fed635', 2, NULL, '2026-09-16 00:23:12', '2026-09-16 00:23:12', NULL);

-- Dumping structure for table test.good_outbound_detail
CREATE TABLE IF NOT EXISTS `good_outbound_detail` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `id_good_oubound` char(36) NOT NULL,
  `id_good` char(36) NOT NULL,
  `price` bigint(20) NOT NULL,
  `amount` int(11) NOT NULL,
  `uom` char(10) NOT NULL,
  `total` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_good_outbound_details` (`id_good_oubound`),
  KEY `idx_good_outbound_detail_items` (`id_good`),
  CONSTRAINT `good_outbound_detail_ibfk_1` FOREIGN KEY (`id_good_oubound`) REFERENCES `good_outbounds` (`id`) ON DELETE CASCADE,
  CONSTRAINT `good_outbound_detail_ibfk_2` FOREIGN KEY (`id_good`) REFERENCES `goods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.good_outbound_detail: ~2 rows (approximately)
INSERT INTO `good_outbound_detail` (`id`, `id_good_oubound`, `id_good`, `price`, `amount`, `uom`, `total`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('a231099e-b165-11f1-a48a-1632b7fed635', '4d2b8752-b165-11f1-a48a-1632b7fed635', '71b07a55-b165-11f1-a48a-1632b7fed635', 19000, 10, 'Buah', 190000, '2026-09-16 00:29:09', '2026-09-16 00:29:09', NULL),
	('a231835c-b165-11f1-a48a-1632b7fed635', '4d2b8752-b165-11f1-a48a-1632b7fed635', '71b12fe3-b165-11f1-a48a-1632b7fed635', 50500, 20, 'Pack', 1010000, '2026-09-16 00:29:09', '2026-09-16 00:29:09', NULL);

-- Dumping structure for table test.good_outbounds
CREATE TABLE IF NOT EXISTS `good_outbounds` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `id_unit` char(36) NOT NULL,
  `receiver` varchar(255) NOT NULL,
  `contact_person` varchar(150) NOT NULL,
  `no_contact` varchar(20) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_good_outbounds` (`id_unit`),
  CONSTRAINT `good_outbounds_ibfk_1` FOREIGN KEY (`id_unit`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.good_outbounds: ~1 rows (approximately)
INSERT INTO `good_outbounds` (`id`, `id_unit`, `receiver`, `contact_person`, `no_contact`, `note`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('4d2b8752-b165-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-7d69-be95-21e453839ddc', 'PT. DELTANET', 'Delta Pranata Putra', '081234567890', NULL, '2026-09-16 00:26:46', '2026-09-16 00:26:46', NULL);

-- Dumping structure for table test.goods
CREATE TABLE IF NOT EXISTS `goods` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `category` char(36) NOT NULL,
  `code` varchar(15) NOT NULL,
  `name` varchar(150) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.goods: ~8 rows (approximately)
INSERT INTO `goods` (`id`, `category`, `code`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('01a0a6ef-75bc-7247-8f6b-a7d500b00afe', 'AC', 'AC250041', 'Sharp AC Split 3/4 PK', '2026-09-15 21:22:30', '2026-09-15 21:22:30', NULL),
	('01a0a6ef-75bc-7362-b694-c1b36d54f718', 'AC', 'AC250039', 'Samsung AC R32 1/2 PK', '2026-09-15 21:22:30', '2026-09-15 21:22:30', NULL),
	('01a0a6ef-75bc-7788-9551-6e262ea1a6f6', 'AC', 'AC250033', 'AC SHARP 1 PK AH-A 9 NCY', '2026-09-15 21:22:30', '2026-09-15 21:22:30', NULL),
	('01a0a6ef-75bc-7e84-a62d-a36707312b4c', 'AC', 'AC250036', 'AC DAIKIN Multi Split 3/4 PK + 3/4 PK', '2026-09-15 21:22:30', '2026-09-15 21:22:30', NULL),
	('71b07a55-b165-11f1-a48a-1632b7fed635', 'BOOK', 'BOOK250076', 'Buku Binder Soft Cover', '2026-09-16 00:27:48', '2026-09-16 00:27:48', NULL),
	('71b12fe3-b165-11f1-a48a-1632b7fed635', 'BOOK', 'BOOK250089', 'Buku Tulisk Sidu 58 L', '2026-09-16 00:27:48', '2026-09-16 00:27:48', NULL),
	('91bd40bb-b166-11f1-a48a-1632b7fed635', 'TV', 'TV250068', 'Televisi Sharp Smart TV 50 Inch', '2026-09-16 00:35:51', '2026-09-16 00:35:51', NULL),
	('91bdf1cc-b166-11f1-a48a-1632b7fed635', 'TV', 'TV250071', 'Televisi Sharp Smart TV 43 Inch', '2026-09-16 00:35:51', '2026-09-16 00:35:51', NULL);

-- Dumping structure for table test.location_racks
CREATE TABLE IF NOT EXISTS `location_racks` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `id_location` char(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `stack_count` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_unit_location_racks` (`id_location`),
  CONSTRAINT `location_racks_ibfk_1` FOREIGN KEY (`id_location`) REFERENCES `unit_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.location_racks: ~3 rows (approximately)
INSERT INTO `location_racks` (`id`, `id_location`, `code`, `name`, `stack_count`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('bec47ad1-b164-11f1-a48a-1632b7fed635', '3adb58e9-b14e-11f1-a48a-1632b7fed635', 'RA01', 'Rak RA01', 6, '2026-09-16 00:22:48', '2026-09-16 00:22:48', NULL),
	('bec53040-b164-11f1-a48a-1632b7fed635', '3adb58e9-b14e-11f1-a48a-1632b7fed635', 'RA02', 'Rak RA02', 6, '2026-09-16 00:22:48', '2026-09-16 00:22:48', NULL),
	('bec5700c-b164-11f1-a48a-1632b7fed635', '3adb58e9-b14e-11f1-a48a-1632b7fed635', 'RA03', 'Rak RA03', 6, '2026-09-16 00:22:48', '2026-09-16 00:22:48', NULL);

-- Dumping structure for table test.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.roles: ~2 rows (approximately)
INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('01a0a6ef-75bc-72c1-b99c-f82e56c87bb7', 'Operator', '2026-09-15 21:27:31', '2026-09-15 21:27:31', NULL),
	('01a0a6ef-75bc-7d8c-b384-21d5c8aaf2ca', 'Owner', '2026-09-15 21:27:31', '2026-09-15 21:27:31', NULL);

-- Dumping structure for table test.stock_opname_details
CREATE TABLE IF NOT EXISTS `stock_opname_details` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `id_stock_opname` char(36) NOT NULL,
  `id_location_rack` char(36) NOT NULL,
  `id_good` char(36) NOT NULL,
  `uom` char(10) DEFAULT NULL,
  `amount` int(11) NOT NULL,
  `amount_so` int(11) NOT NULL DEFAULT 0,
  `note` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stock_opname_detail_location` (`id_location_rack`),
  KEY `idx_stock_opname_detail_good` (`id_good`),
  KEY `idx_stock_opname_detail_opname` (`id_stock_opname`),
  CONSTRAINT `stock_opname_details_ibfk_1` FOREIGN KEY (`id_location_rack`) REFERENCES `location_racks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_opname_details_ibfk_2` FOREIGN KEY (`id_good`) REFERENCES `goods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_opname_details_ibfk_3` FOREIGN KEY (`id_stock_opname`) REFERENCES `stock_opnames` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.stock_opname_details: ~2 rows (approximately)
INSERT INTO `stock_opname_details` (`id`, `id_stock_opname`, `id_location_rack`, `id_good`, `uom`, `amount`, `amount_so`, `note`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('abe9b5dc-b166-11f1-a48a-1632b7fed635', 'd918f6be-b165-11f1-a48a-1632b7fed635', 'bec53040-b164-11f1-a48a-1632b7fed635', '91bd40bb-b166-11f1-a48a-1632b7fed635', 'Buah', 10, 0, NULL, '2026-09-16 00:36:35', '2026-09-16 00:36:35', NULL),
	('abeae491-b166-11f1-a48a-1632b7fed635', 'd918f6be-b165-11f1-a48a-1632b7fed635', 'bec53040-b164-11f1-a48a-1632b7fed635', '91bdf1cc-b166-11f1-a48a-1632b7fed635', 'Buah', 15, 0, NULL, '2026-09-16 00:36:35', '2026-09-16 00:36:35', NULL);

-- Dumping structure for table test.stock_opnames
CREATE TABLE IF NOT EXISTS `stock_opnames` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `date` date NOT NULL,
  `name` varchar(150) NOT NULL,
  `id_unit` char(36) NOT NULL,
  `amount` int(11) NOT NULL,
  `check_amount` int(11) NOT NULL DEFAULT 0,
  `percetage` float NOT NULL DEFAULT 0,
  `id_user` char(36) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `id_asset` char(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stock_opname_unit` (`id_unit`),
  KEY `idx_stock_opname_user` (`id_user`),
  KEY `idx_stock_opname_asset` (`id_asset`),
  CONSTRAINT `stock_opnames_ibfk_1` FOREIGN KEY (`id_unit`) REFERENCES `units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_opnames_ibfk_2` FOREIGN KEY (`id_asset`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_opnames_ibfk_3` FOREIGN KEY (`id_user`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.stock_opnames: ~1 rows (approximately)
INSERT INTO `stock_opnames` (`id`, `date`, `name`, `id_unit`, `amount`, `check_amount`, `percetage`, `id_user`, `note`, `id_asset`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('d918f6be-b165-11f1-a48a-1632b7fed635', '2025-12-17', 'Stock Opname September 2005', '01a0a6ef-75bc-7d69-be95-21e453839ddc', 1335, 0, 0, NULL, NULL, NULL, '2026-09-16 00:30:41', '2026-09-16 00:30:41', NULL);

-- Dumping structure for table test.unit_locations
CREATE TABLE IF NOT EXISTS `unit_locations` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `id_unit` char(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_unit_locations` (`id_unit`),
  CONSTRAINT `unit_locations_ibfk_1` FOREIGN KEY (`id_unit`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.unit_locations: ~3 rows (approximately)
INSERT INTO `unit_locations` (`id`, `id_unit`, `name`, `created_at`, `updated_at`, `deleted_at`, `code`) VALUES
	('3adb58e9-b14e-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-70b6-9be4-883a54f97563', 'Ruang A', '2026-09-15 21:41:37', '2026-09-15 21:41:37', NULL, 'RA'),
	('43ecd96b-b164-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-70b6-9be4-883a54f97563', 'Ruang B', '2026-09-16 00:19:21', '2026-09-16 00:19:21', NULL, 'RB'),
	('43eda9ca-b164-11f1-a48a-1632b7fed635', '01a0a6ef-75bc-70b6-9be4-883a54f97563', 'Ruang C', '2026-09-16 00:19:21', '2026-09-16 00:19:21', NULL, 'RC');

-- Dumping structure for table test.units
CREATE TABLE IF NOT EXISTS `units` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.units: ~3 rows (approximately)
INSERT INTO `units` (`id`, `code`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('01a0a6ef-75bc-70b6-9be4-883a54f97563', 'W02', 'Gudang Samping', '2026-09-15 21:26:04', '2026-09-15 21:26:04', NULL),
	('01a0a6ef-75bc-7838-91df-b602af5471c2', 'W03', 'Gudang Belakang', '2026-09-15 21:26:04', '2026-09-15 21:26:04', NULL),
	('01a0a6ef-75bc-7d69-be95-21e453839ddc', 'W01', 'Gudang Utama', '2026-09-15 21:26:04', '2026-09-16 00:26:02', NULL);

-- Dumping structure for table test.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `position` varchar(150) DEFAULT NULL,
  `id_role` char(36) NOT NULL,
  `id_departemen` char(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_users_departements` (`id_departemen`),
  KEY `idx_user_role` (`id_role`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`id_role`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`id_departemen`) REFERENCES `departements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table test.users: ~1 rows (approximately)
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `position`, `id_role`, `id_departemen`, `created_at`, `updated_at`, `deleted_at`) VALUES
	('cdc41510-b159-11f1-a48a-1632b7fed635', 'superadmin', '$argon2d$v=19$m=16,t=2,p=1$Y2xuYzRpQ0s0VVZNcmw0Vg$sL2gy/Jf+19XHhzRXAZGiw', 'superadmin', 'sup[eradmin@super.com', 'departo', '01a0a6ef-75bc-72c1-b99c-f82e56c87bb7', '01a0a6ef-75bc-70e4-a815-e71ad1dc9480', '2026-09-15 23:04:28', '2026-09-15 23:04:28', NULL);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
