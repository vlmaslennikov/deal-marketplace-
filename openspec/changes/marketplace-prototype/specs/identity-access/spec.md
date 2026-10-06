## ADDED Requirements

### Requirement: Authenticated actor

The system SHALL satisfy: Requests without a session receive 401; profile updates never modify role.

#### Scenario: An authenticated user is suspended

- **WHEN** An authenticated user is suspended
- **THEN** Every subsequent mutation is denied despite their existing cookie.
