## MODIFIED Requirements

### Requirement: Email content in Finnish with required fields
The digest email SHALL include, for each new user: full name (forename + surname), email address, and registration timestamp formatted in human-readable Finnish locale. The email SHALL also contain a link to `https://tayttopaikka.fi/admin/users?isUser=false` for quick access to the filtered user management view showing only unactivated accounts. The email subject SHALL be "Täyttöpaikkaan on rekistöröitynyt uusia käyttäjiä".

#### Scenario: Single new user in digest
- **WHEN** the email is sent with one new user
- **THEN** the email body contains the user's forename, surname, email address, `created_at` formatted as a Finnish date-time string, and a link to `https://tayttopaikka.fi/admin/users?isUser=false`

#### Scenario: Multiple new users in digest
- **WHEN** the email is sent with multiple new users
- **THEN** each user's details appear as a distinct block in the email body with all required fields, and the link to `https://tayttopaikka.fi/admin/users?isUser=false` appears once in the email
