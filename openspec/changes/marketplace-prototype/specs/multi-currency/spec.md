# Multi-currency discovery and presentation

## ADDED Requirements

### Requirement: Native amounts

The service SHALL persist a valid currency code with each asset price and buyer budget, default existing stored records to EUR, and SHALL preserve native integer minor units.

#### Scenario: Seller changes listing currency

- **WHEN** a seller switches a populated amount from EUR to PLN
- **THEN** the form SHALL convert the amount using a dated public FX rate before saving it

### Requirement: Currency-aware discovery

The service SHALL use one dated exchange rate snapshot to convert amounts for selected-currency display, price and budget filters, sorting, and matching.

#### Scenario: Buyer compares listings

- **WHEN** listings in EUR and USD are filtered or sorted in PLN
- **THEN** the service SHALL use their converted PLN amounts and retain each original currency and amount

### Requirement: Rate outage

The service SHALL avoid invented exchange rates.

#### Scenario: No rates available

- **WHEN** a required cross-currency rate cannot be obtained
- **THEN** the service SHALL mark budget comparisons unavailable and reject selected-currency filters until rates return
