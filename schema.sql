-- ============================================================
-- Brain Bytes MVP - Relational Database Schema
-- Database: brain_bytes_db
-- Character Set: utf8mb4, Collation: utf8mb4_unicode_ci
-- ============================================================

CREATE DATABASE IF NOT EXISTS `brain_bytes_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `brain_bytes_db`;

-- Drop existing tables in reverse dependency order for clean re-runs if needed
DROP TABLE IF EXISTS `doubt_answers`;
DROP TABLE IF EXISTS `doubts`;
DROP TABLE IF EXISTS `voice_evaluations`;
DROP TABLE IF EXISTS `weak_topics`;
DROP TABLE IF EXISTS `users`;

-- ------------------------------------------------------------
-- 1. USERS TABLE
-- Stores student profile, division status, streaks, and XP telemetry
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `university` VARCHAR(255) DEFAULT NULL,
  `major` VARCHAR(255) DEFAULT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `level` INT NOT NULL DEFAULT 1,
  `tier_title` VARCHAR(100) NOT NULL DEFAULT 'Level 1 • Novice',
  `division` VARCHAR(100) NOT NULL DEFAULT 'Novice',
  `streak_days` INT NOT NULL DEFAULT 0,
  `longest_streak_days` INT NOT NULL DEFAULT 0,
  `xp_balance` INT NOT NULL DEFAULT 0,
  `freezes_available` INT NOT NULL DEFAULT 2,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_xp` (`xp_balance` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. WEAK_TOPICS TABLE
-- Tracks student struggle areas and failure frequencies to power targeted practice
-- ------------------------------------------------------------
CREATE TABLE `weak_topics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `topic_name` VARCHAR(255) NOT NULL,
  `failure_count` INT NOT NULL DEFAULT 1,
  `last_failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_weak_topics_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_user_topic` (`user_id`, `topic_name`),
  INDEX `idx_weak_topics_frequency` (`user_id`, `failure_count` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. VOICE_EVALUATIONS TABLE
-- Stores spoken concept explanations scored against the Feynman technique
-- ------------------------------------------------------------
CREATE TABLE `voice_evaluations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `topic` VARCHAR(255) NOT NULL,
  `audio_url` VARCHAR(500) DEFAULT NULL,
  `transcript` TEXT NOT NULL,
  `feynman_score` INT NOT NULL,
  `grade` VARCHAR(50) NOT NULL,
  `simplicity_score` INT DEFAULT NULL,
  `intuition_score` INT DEFAULT NULL,
  `jargon_feedback` TEXT DEFAULT NULL,
  `identified_gaps` JSON DEFAULT NULL,
  `ai_feedback` TEXT DEFAULT NULL,
  `xp_awarded` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_voice_evaluations_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_voice_evaluations_user` (`user_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. DOUBTS TABLE
-- Manages student questions, code snippets, errors, and XP bounties
-- ------------------------------------------------------------
CREATE TABLE `doubts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `author_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subject_domain` VARCHAR(100) NOT NULL,
  `bounty_xp` INT NOT NULL DEFAULT 0,
  `body_markdown` TEXT NOT NULL,
  `code_language` VARCHAR(50) DEFAULT NULL,
  `code_snippet` TEXT DEFAULT NULL,
  `error_type` VARCHAR(100) DEFAULT NULL,
  `upvotes` INT NOT NULL DEFAULT 0,
  `status` ENUM('open', 'answered', 'resolved') NOT NULL DEFAULT 'open',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_doubts_author`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_doubts_subject_status` (`subject_domain`, `status`),
  INDEX `idx_doubts_author` (`author_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
-- ------------------------------------------------------------
-- 5. DOUBT_ANSWERS TABLE
-- Stores peer solutions and mentor answers with AI pedagogical clarity feedback
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doubt_answers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doubt_id` INT NOT NULL,
  `author_id` INT NOT NULL,
  `content_markdown` TEXT NOT NULL,
  `code_snippet` TEXT DEFAULT NULL,
  `is_accepted` BOOLEAN NOT NULL DEFAULT FALSE,
  `verified_by` VARCHAR(100) DEFAULT NULL,
  `upvotes` INT NOT NULL DEFAULT 0,
  `ai_clarity_score` INT DEFAULT NULL,
  `ai_feedback` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_doubt_answers_doubt`
    FOREIGN KEY (`doubt_id`) REFERENCES `doubts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_doubt_answers_author`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_doubt_answers_doubt` (`doubt_id`, `created_at` ASC),
  INDEX `idx_doubt_answers_author` (`author_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
