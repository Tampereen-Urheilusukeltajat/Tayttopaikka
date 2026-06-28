## Purpose

Notify admin users by email when new users register. A daily digest job runs once per day and sends a summary email to all admins listing any users who registered in the preceding 24 hours.

## Requirements

### Requirement: Daily digest sent when new users register
The system SHALL send the digest email to every user with `isAdmin = true` once per day listing all users who registered in the preceding 24 hours. The email SHALL only be sent if at least one new user was registered during that window. If no admin users exist in the DB the job SHALL log a warning and skip sending.

#### Scenario: New users registered since last run
- **WHEN** the daily notification job runs at 19:00 Europe/Helsinki
- **AND** one or more users have `created_at` within the last 24 hours
- **THEN** one email per admin user (with `isAdmin = true`) is sent, each containing all new users' details

#### Scenario: No new users registered
- **WHEN** the daily notification job runs at 19:00 Europe/Helsinki
- **AND** no users have `created_at` within the last 24 hours
- **THEN** no email is sent

### Requirement: Email content in Finnish with required fields
The digest email SHALL include, for each new user: full name (forename + surname), email address, and registration timestamp formatted in human-readable Finnish locale. The email SHALL also contain a link to `https://tayttopaikka.fi/admin/users?isUser=false` for quick access to the filtered user management view showing only unactivated accounts. The email subject SHALL be "Täyttöpaikkaan on rekistöröitynyt uusia käyttäjiä".

#### Scenario: Single new user in digest
- **WHEN** the email is sent with one new user
- **THEN** the email body contains the user's forename, surname, email address, `created_at` formatted as a Finnish date-time string, and a link to `https://tayttopaikka.fi/admin/users?isUser=false`

#### Scenario: Multiple new users in digest
- **WHEN** the email is sent with multiple new users
- **THEN** each user's details appear as a distinct block in the email body with all required fields, and the link to `https://tayttopaikka.fi/admin/users?isUser=false` appears once in the email

### Requirement: Feature flag disables the notification job
The notification job SHALL be skippable by setting `NEW_USER_NOTIFICATION_ENABLED=false` in the environment. When disabled, no job is scheduled and no emails are sent.

#### Scenario: Feature disabled via env var
- **WHEN** `NEW_USER_NOTIFICATION_ENABLED` is set to `"false"`
- **THEN** the cron job is not registered and no email is ever sent

#### Scenario: Feature enabled by default
- **WHEN** `NEW_USER_NOTIFICATION_ENABLED` is absent or set to any value other than `"false"`
- **THEN** the cron job is registered and runs daily at 19:00 Europe/Helsinki
