## ADDED Requirements

### Requirement: Participant lifecycle

The system SHALL satisfy: Only active managers can suspend, reactivate or remove buyers/sellers with a reason; removal is terminal.

#### Scenario: A seller is suspended

- **WHEN** A seller is suspended
- **THEN** Hide their assets and block publishing/contact atomically; retain history.
