## Purpose

Provide admins with a filter toggle on the user management table to quickly show only users who have not yet been activated as members (`isUser === false`). Filter state is reflected in the URL so links can be shared and the view reloads correctly.

## Requirements

### Requirement: isUser filter toggle visible on user table
The admin user table SHALL display a filter toggle labelled "Näytä vain epäjäsenet" above the user list. When activated, the table SHALL show only users where `isUser === false`. When deactivated, the table SHALL show all users.

#### Scenario: Toggle activated — only non-members shown
- **WHEN** the admin activates the "Näytä vain epäjäsenet" toggle
- **THEN** the user table shows only rows where `isUser` is false
- **AND** users with `isUser` true are hidden

#### Scenario: Toggle deactivated — all users shown
- **WHEN** the admin deactivates the "Näytä vain epäjäsenet" toggle
- **THEN** the user table shows all users regardless of `isUser` value

#### Scenario: Text search and isUser filter combined
- **WHEN** both the text search input and the isUser filter are active
- **THEN** the table shows only users matching the text search AND having `isUser === false`

### Requirement: Filter state persisted in URL query string
The isUser filter state SHALL be reflected in the URL query string. When the filter is active the URL SHALL contain `?isUser=false`. When the filter is inactive the `isUser` parameter SHALL be absent from the URL.

#### Scenario: Filter activated — URL updated
- **WHEN** the admin activates the "Näytä vain epäjäsenet" toggle
- **THEN** the URL query string contains `isUser=false`

#### Scenario: Filter deactivated — URL cleaned
- **WHEN** the admin deactivates the "Näytä vain epäjäsenet" toggle
- **THEN** the `isUser` parameter is removed from the URL query string

### Requirement: Filter initialised from URL on page load
When the page loads with `?isUser=false` in the URL, the filter SHALL be pre-activated and the table SHALL immediately show only non-member users. When the page loads without the parameter, no filter SHALL be applied.

#### Scenario: Page loaded with isUser=false in URL
- **WHEN** the user navigates to `/admin/users?isUser=false`
- **THEN** the "Näytä vain epäjäsenet" toggle is active
- **AND** the table shows only users where `isUser` is false

#### Scenario: Page loaded without filter parameter
- **WHEN** the user navigates to `/admin/users` without query parameters
- **THEN** no filter is applied
- **AND** all users are shown
- **AND** the toggle is inactive
