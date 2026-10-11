## ADDED Requirements

### Requirement: Invoicing summary tiles

The admin invoicing page SHALL display a row of summary tiles, styled consistently with the existing fill-history summary tiles (`FillEventStats`), computed from the unpaid invoices already loaded by the page. The tiles SHALL be: total amount due, number of unpaid invoices (users), number of unpaid fill events, largest single outstanding balance (naming the user it belongs to), and the date of the oldest unpaid fill event.

#### Scenario: Invoices exist

- **WHEN** an admin opens the invoicing page and there is at least one user with an outstanding balance
- **THEN** the summary tiles show the sum of all `invoiceTotal` values, the count of users with an outstanding balance, the total count of unpaid fill events across all users, the single highest `invoiceTotal` among those users together with that user's name, and the earliest fill event date across all unpaid fill events

#### Scenario: No outstanding invoices

- **WHEN** an admin opens the invoicing page and no user has an outstanding balance
- **THEN** the summary tiles show zero for the amount, count, and fill-event tiles, the largest-balance tile shows no user name, and the oldest-unpaid-fill tile shows an empty/placeholder state rather than a date

#### Scenario: Stats reflect current data without a separate fetch

- **WHEN** the invoicing page's unpaid-invoice data changes (e.g. after a page reload)
- **THEN** the summary tiles (other than the gas breakdown) are recomputed from that same data, without issuing any additional network request

### Requirement: Pending revenue by gas type

The system SHALL provide an admin-only endpoint that returns the total pending (unpaid) revenue grouped by gas type, aggregated across all users, and the admin invoicing page SHALL display this breakdown. Air SHALL be excluded from the breakdown since it is always free.

#### Scenario: Multiple gases have pending revenue

- **WHEN** there are unpaid fill events using Helium, Oxygen, Argon, and/or Diluent
- **THEN** the endpoint returns one entry per gas type with price greater than zero, each with the gas's name and the total pending price in euro cents summed across all unpaid fill events for all users

#### Scenario: A gas type has no pending revenue

- **WHEN** a gas type (other than Air) has no unpaid fill events contributing any price
- **THEN** that gas type is either omitted from the response or returned with a price of zero (not an error)

#### Scenario: Air is never included

- **WHEN** the breakdown is computed, regardless of how many unpaid air fills exist
- **THEN** the response never includes an entry for Air

#### Scenario: Non-admin access is rejected

- **WHEN** a request to the gas-breakdown endpoint is made by a user who is not an admin
- **THEN** the endpoint responds with 403, consistent with the existing `GET /invoicing` endpoint's access control

#### Scenario: A mixed-gas fill event contributes to multiple gas types

- **WHEN** a single unpaid fill event used both Helium and Oxygen (e.g. a Trimix fill)
- **THEN** that fill event's price is split across the Helium and Oxygen entries in the breakdown according to each gas's actual priced contribution to that fill, rather than being attributed entirely to one gas type
