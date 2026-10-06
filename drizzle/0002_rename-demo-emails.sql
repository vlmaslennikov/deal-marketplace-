-- Preserve existing demo sessions while moving credential login to the new address.
UPDATE "users"
SET "email" = (
  CASE WHEN "id" IN ('buyer-0', 'seller-0', 'manager-0')
    THEN split_part("id", '-', 1)
    ELSE "id"
  END
) || '@dealdemo.local'
WHERE "id" ~ '^(buyer|seller|manager)-[0-9]+$';
