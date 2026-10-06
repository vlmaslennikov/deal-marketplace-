## ADDED Requirements

### Requirement: Explainable ranking

The system SHALL satisfy: Score uses budget 30/category 25/country 20/licence 15, normalized over configured criteria; empty criteria yield null.

#### Scenario: Only country is configured and matches

- **WHEN** Only country is configured and matches
- **THEN** Score is 100 with country explanation, not a probability.
