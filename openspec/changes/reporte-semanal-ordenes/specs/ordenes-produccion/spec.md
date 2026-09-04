## ADDED Requirements

### Requirement: Weekly Board of Órdenes de Producción
The system SHALL provide a weekly report of Órdenes de Producción, reachable from the Producción menu, laying out one column per day of a week. The board SHALL show Monday through Saturday — the project's business week, the same one Programación uses by excluding only Sunday — and SHALL add a Sunday column only when that Sunday has at least one order, so no order is ever hidden. Every day column SHALL be shown even when it holds no orders, and SHALL indicate how many orders it holds.

#### Scenario: Open the weekly board
- **WHEN** a user opens the weekly report from the Producción menu
- **THEN** the system SHALL display the current week with one column per day from Monday to Saturday, each column listing the Órdenes de Producción whose Fecha de Fabricación falls on that day

#### Scenario: A day has no orders
- **WHEN** a day in the displayed week has no Órdenes de Producción
- **THEN** the system SHALL still show that day's column, marked as empty, rather than omitting it

#### Scenario: An order falls on a Sunday
- **WHEN** any order in the displayed week has a Fecha de Fabricación on Sunday
- **THEN** the system SHALL add a Sunday column showing those orders

#### Scenario: No order falls on a Sunday
- **WHEN** no order in the displayed week falls on Sunday
- **THEN** the system SHALL show only Monday through Saturday

#### Scenario: The whole week is empty
- **WHEN** the displayed week has no Órdenes de Producción at all
- **THEN** the system SHALL show the six empty day columns and state that the week has no orders

### Requirement: Orden Card on the Weekly Board
Each Orden de Producción on the weekly board SHALL be shown as its own card within its day, displaying the Código, the Estado with the same colour badge used elsewhere in the module, the Responsable/Área, and the names of the productos the order yields. Cards SHALL be ordered predictably within a day, and activating a card SHALL open that order's detail view.

#### Scenario: Card contents
- **WHEN** an order is shown on the board
- **THEN** its card SHALL display Código, Estado as a badge, Responsable/Área, and the producto names

#### Scenario: Open an order from the board
- **WHEN** a user activates an order's card
- **THEN** the system SHALL navigate to that Orden de Producción's detail view

#### Scenario: Several orders on the same day
- **WHEN** a day holds more than one order
- **THEN** the system SHALL show one card per order, in a stable order

#### Scenario: Estado colours match the rest of the module
- **WHEN** a card shows an order's Estado
- **THEN** it SHALL use the same label and badge colour that the Órdenes de Producción list uses for that Estado

### Requirement: Navigate Between Weeks on the Board
The board SHALL open on the current week and SHALL let the user move to the previous or next week, and return to the current one. The displayed week SHALL be reflected in the URL so it survives a reload and can be shared, and the board SHALL state which week is being shown, including its date range.

#### Scenario: Open on the current week
- **WHEN** a user opens the board with no week specified
- **THEN** the system SHALL display the week containing today, and SHALL indicate that it is the current week

#### Scenario: Move to another week
- **WHEN** a user moves to the previous or next week
- **THEN** the system SHALL load and display that week's orders and update the URL to match

#### Scenario: Return to the current week
- **WHEN** a user is looking at another week and chooses to return to the current one
- **THEN** the system SHALL display the week containing today

#### Scenario: Reload on a chosen week
- **WHEN** a user reloads the page while a week other than the current one is displayed
- **THEN** the system SHALL display that same week

#### Scenario: The week is identified
- **WHEN** any week is displayed
- **THEN** the system SHALL show its date range, and each day column SHALL show its day name and date
