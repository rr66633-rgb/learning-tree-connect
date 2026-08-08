-- One normalized email belongs to exactly one login account platform-wide.
-- Preserve every displaced legacy value before clearing it so an operator can
-- recover it if an old account owner needs help. The canonical account is the
-- one that has a password and was used most recently.
CREATE TABLE IF NOT EXISTS `user_email_conflicts_archive` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `originalEmail` varchar(320) NOT NULL,
  `keptUserId` int NOT NULL,
  `reason` varchar(100) NOT NULL DEFAULT 'legacy_duplicate',
  `archivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_user_email_conflicts_user` (`userId`)
);

INSERT IGNORE INTO `user_email_conflicts_archive` (`userId`, `originalEmail`, `keptUserId`)
SELECT u.id, u.email, winners.keepId
FROM users u
JOIN (
  SELECT normalizedEmail, MAX(CASE WHEN ranked.rn = 1 THEN ranked.id END) AS keepId
  FROM (
    SELECT
      id,
      LOWER(TRIM(email)) AS normalizedEmail,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(email))
        ORDER BY
          CASE WHEN password IS NOT NULL AND TRIM(password) <> '' THEN 1 ELSE 0 END DESC,
          lastSignedIn DESC,
          createdAt DESC,
          id DESC
      ) AS rn
    FROM users
    WHERE email IS NOT NULL AND TRIM(email) <> ''
  ) ranked
  GROUP BY normalizedEmail
  HAVING COUNT(*) > 1
) winners ON LOWER(TRIM(u.email)) = winners.normalizedEmail
WHERE u.id <> winners.keepId;

UPDATE users u
JOIN user_email_conflicts_archive archived ON archived.userId = u.id
SET u.email = NULL
WHERE u.email IS NOT NULL;

UPDATE users
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

ALTER TABLE users DROP INDEX idx_users_email;
ALTER TABLE users ADD UNIQUE INDEX ux_users_email (email);
