## ADDED Requirements

### Requirement: Private persisted contact

The system SHALL satisfy: Only active buyer/seller pairs can start a conversation; all reads check membership.

#### Scenario: A client retries the same nonce

- **WHEN** A client retries the same nonce
- **THEN** Exactly one message exists.

### Requirement: Pair uniqueness

The system SHALL satisfy: Concurrent starts reuse one conversation per buyer/seller pair.

#### Scenario: Two requests start contact for the same pair

- **WHEN** Two requests start contact for the same pair
- **THEN** One conversation is persisted.
