## ADDED Requirements

### Requirement: Email sent when a user's isUser access right changes
The system SHALL send an email to a user when an admin's `PATCH /users/:userId/roles` request changes that user's `isUser` value compared to before the request. Other access-right flags (`isAdmin`, `isAdvancedBlender`, `isBlender`, `isInstructor`) SHALL NOT trigger this notification.

#### Scenario: isUser granted
- **WHEN** an admin sets `isUser` from `false` to `true` for a user via `PATCH /users/:userId/roles`
- **THEN** an email is sent to that user indicating their account is now active

#### Scenario: isUser revoked
- **WHEN** an admin sets `isUser` from `true` to `false` for a user
- **THEN** an email is sent to that user indicating their account access has been deactivated

#### Scenario: isUser unchanged
- **WHEN** an admin submits `PATCH /users/:userId/roles` without changing the user's `isUser` value (either omitted from the request, or resubmitted with its current value)
- **THEN** no email is sent

#### Scenario: A different access right changes but isUser does not
- **WHEN** an admin changes `isBlender`, `isAdvancedBlender`, `isInstructor`, or `isAdmin` for a user while `isUser` stays the same
- **THEN** no email is sent

### Requirement: Distinct messaging for activation vs. deactivation
The notification email SHALL use different content depending on the direction of the `isUser` change: activation (`false` → `true`) SHALL tell the user their account is now active, that they can log in, and SHALL include a link to the application. Deactivation (`true` → `false`) SHALL tell the user their account access has been removed, and SHALL NOT include a login link.

#### Scenario: Activation email content
- **WHEN** the email is sent because `isUser` changed from `false` to `true`
- **THEN** the email body tells the user their account is now active and includes a link to the frontend application

#### Scenario: Deactivation email content
- **WHEN** the email is sent because `isUser` changed from `true` to `false`
- **THEN** the email body tells the user their account access has been deactivated and does not include a login link

### Requirement: Email content in Finnish
The notification email SHALL be written in Finnish.

#### Scenario: Email is in Finnish
- **WHEN** an activation or deactivation email is sent
- **THEN** the email subject and body are written in Finnish

### Requirement: Email delivery failure does not fail the roles update
The system SHALL apply the roles update and return a successful response to the admin regardless of whether the notification email succeeds or fails. Email delivery failures SHALL be logged.

#### Scenario: Email sending fails
- **WHEN** the roles update succeeds in the database but sending the notification email throws an error
- **THEN** `PATCH /users/:userId/roles` still responds with the updated user and a success status, and the error is logged
