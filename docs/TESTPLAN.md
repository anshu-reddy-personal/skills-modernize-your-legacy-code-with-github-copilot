# COBOL Student Account System Test Plan

This test plan covers the current business logic and implementation in the COBOL application (`main.cob`, `operations.cob`, `data.cob`).

## Scope and Notes

- Initial in-memory balance at application start is `1000.00`.
- Balance format is `PIC 9(6)V99` (up to `999999.99`).
- Data persists only during a single app run; restarting resets balance to `1000.00`.
- `Actual Result`, `Status`, and `Comments` are intentionally left for execution-time updates.

## Test Cases

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| TC-001 | Application starts and displays main menu | App binary is available and executable | 1. Launch app (`./accountsystem`). 2. Observe first screen. | Menu is displayed with options: 1 View Balance, 2 Credit Account, 3 Debit Account, 4 Exit. Prompt asks for choice 1-4. | TBD | TBD | |
| TC-002 | View balance from initial state | Fresh app session started | 1. Start app. 2. Enter `1`. | System calls balance inquiry path and displays `Current balance: 1000.00` (format may follow COBOL display conventions). | TBD | TBD | |
| TC-003 | Credit account with valid amount | Fresh app session started | 1. Start app. 2. Enter `2`. 3. Enter credit amount `200.00`. 4. Enter `1` to view balance. | Credit success message displayed. New balance shown as `1200.00`. Subsequent view balance also shows `1200.00`. | TBD | TBD | |
| TC-004 | Debit account with sufficient funds | Fresh app session started | 1. Start app. 2. Enter `3`. 3. Enter debit amount `300.00`. 4. Enter `1` to view balance. | Debit success message displayed. New balance is `700.00`. Subsequent view balance shows `700.00`. | TBD | TBD | |
| TC-005 | Debit account with insufficient funds | Fresh app session started | 1. Start app. 2. Enter `3`. 3. Enter debit amount `1200.00`. 4. Enter `1` to view balance. | Message `Insufficient funds for this debit.` is displayed. Balance remains unchanged at `1000.00`. | TBD | TBD | |
| TC-006 | Debit account exactly equal to balance | Fresh app session started | 1. Start app. 2. Enter `3`. 3. Enter debit amount `1000.00`. 4. Enter `1` to view balance. | Debit is accepted (`>=` check). New balance is `0.00`. | TBD | TBD | |
| TC-007 | Sequential operations persist within same session | Fresh app session started | 1. Start app. 2. Credit `250.00`. 3. Debit `100.00`. 4. View balance. | Running balance is persisted in-memory across operations in same run. Final balance is `1150.00`. | TBD | TBD | |
| TC-008 | Exit option terminates loop and program | App is running at main menu | 1. Enter `4`. | Program exits main loop and displays `Exiting the program. Goodbye!`, then terminates successfully. | TBD | TBD | |
| TC-009 | Invalid menu choice handling | App is running at main menu | 1. Enter a non-supported menu value (for example `9`). 2. Observe output and prompt. | Message `Invalid choice, please select 1-4.` is displayed and menu loop continues. | TBD | TBD | |
| TC-010 | Data read operation correctness (`TOTAL` -> `READ`) | Fresh app session started | 1. Start app. 2. Credit `50.00`. 3. Enter `1` to view balance. | Operations uses `READ` path in data layer and displays updated stored value (`1050.00`). | TBD | TBD | Validates integration between `Operations` and `DataProgram` for `READ`. |
| TC-011 | Data write operation correctness after credit (`WRITE`) | Fresh app session started | 1. Start app. 2. Enter `2`. 3. Enter `75.00`. 4. Enter `1`. | Credit flow writes updated balance to data layer; view balance reflects `1075.00` (not original 1000.00). | TBD | TBD | Validates `WRITE` on credit path. |
| TC-012 | Data write operation correctness after debit (`WRITE`) | Fresh app session started | 1. Start app. 2. Enter `3`. 3. Enter `125.00`. 4. Enter `1`. | Debit flow writes updated balance to data layer; view balance reflects `875.00`. | TBD | TBD | Validates `WRITE` on debit success path. |
| TC-013 | No write occurs on failed debit | Fresh app session started | 1. Start app. 2. Credit `100.00` (balance `1100.00`). 3. Attempt debit `1200.00` (should fail). 4. View balance. | Failed debit does not update stored balance. Final balance remains `1100.00`. | TBD | TBD | Confirms business rule: failed debit leaves data unchanged. |
| TC-014 | Session reset behavior after restart | Ability to restart the app | 1. Run app and perform a balance change (for example, credit `500.00`). 2. Exit app. 3. Relaunch app. 4. View balance. | Balance resets to initial `1000.00` after restart, confirming in-memory storage only. | TBD | TBD | Important for migration decisions in Node.js persistence design. |
| TC-015 | Boundary value at zero debit amount | Fresh app session started | 1. Start app. 2. Enter `3`. 3. Enter `0.00`. 4. View balance. | Since `balance >= amount`, debit path succeeds but balance remains unchanged at `1000.00`. Success message shown. | TBD | TBD | Current logic has no minimum amount validation. |
| TC-016 | Boundary value at zero credit amount | Fresh app session started | 1. Start app. 2. Enter `2`. 3. Enter `0.00`. 4. View balance. | Credit path succeeds; balance remains `1000.00`. Success message shown. | TBD | TBD | Current logic has no minimum amount validation. |
| TC-017 | High-value credit within numeric field capacity | Fresh app session started | 1. Start app. 2. Enter `2`. 3. Enter `999999.99` or a large value near field limits (as accepted by runtime). | Behavior follows COBOL numeric field rules. If accepted and within field constraints, updated balance is displayed and persisted for the session. | TBD | TBD | Record runtime behavior precisely; useful for Node.js numeric constraints. |
| TC-018 | Input robustness for menu prompt | App is running at main menu | 1. Enter unexpected input type for menu (for example alphabetic input if runtime allows). | Observe and record runtime handling (reject, coerce, or error). Menu should remain recoverable for continued interaction. | TBD | TBD | Behavior may be compiler/runtime dependent; capture for migration parity. |

## Coverage Mapping to Current COBOL Logic

- `main.cob` menu loop, routing, invalid choice, and exit: `TC-001`, `TC-008`, `TC-009`, `TC-018`
- `operations.cob` total/credit/debit logic and branching: `TC-002` to `TC-007`, `TC-010` to `TC-013`, `TC-015` to `TC-017`
- `data.cob` read/write behavior and session-scoped storage: `TC-010` to `TC-014`

## Execution Sign-off Template

Use the table rows above during stakeholder validation and complete:

- `Actual Result` with exact observed output/value
- `Status (Pass/Fail)` per test run
- `Comments` for deviations, clarifications, and migration notes for Node.js implementation
