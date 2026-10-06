## ADDED Requirements

### Requirement: Publish own asset

The system SHALL satisfy: Only active sellers may publish their own complete drafts.

#### Scenario: A seller publishes a valid draft

- **WHEN** A seller publishes a valid draft
- **THEN** It appears in the buyer catalog and persists after reload.

### Requirement: Search and ownership

The system SHALL satisfy: Filter query is validated; draft detail is private to owner and manager.

#### Scenario: A buyer guesses a draft ID

- **WHEN** A buyer guesses a draft ID
- **THEN** Return not found without leaking the draft.
