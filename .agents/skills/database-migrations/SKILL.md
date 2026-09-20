---
name: database-migrations
description: "Use when writing a schema or data migration, planning a rollback, or aiming for zero-downtime deployment across PostgreSQL, MySQL, and common ORMs."
metadata:
  origin: ECC
---

# Database Migration Patterns

Safe, reversible database schema changes for production systems.

## When to Activate

- Creating or altering database tables, columns, or indexes
- Running data migrations (backfill, transform)
- Planning zero-downtime schema changes or setting up migration tooling

## Core Principles

1. **Every change is a migration** — never alter production databases manually.
2. **Forward-only in production** — production rollbacks use new forward migrations.
3. **Separate DDL and DML** — never mix schema changes and data updates in one migration.
4. **Test against production scale** — operations on 100 rows behave very differently on 10M rows.
5. **Immutable once deployed** — never edit an existing migration file that ran in production.

## Migration Safety Checklist

- [ ] Migration has UP and DOWN (or is explicitly marked irreversible).
- [ ] No table locks on large tables (use non-blocking/concurrent operations).
- [ ] New columns are nullable or have defaults (never bare `NOT NULL`).
- [ ] Indexes created concurrently (`CREATE INDEX CONCURRENTLY`).
- [ ] Data backfill is isolated in a separate migration script.
- [ ] Rollback plan documented and tested on staging data.

## PostgreSQL Patterns

### Adding a Column Safely
```sql
-- GOOD: Nullable column (metadata update only, instant)
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- GOOD: Column with default (Postgres 11+ is instant, no table rewrite)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- BAD: NOT NULL without default on existing table (locks table & rewrites rows)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
```

### Non-Blocking Indexes & Renaming
```sql
-- Non-blocking index creation (note: CONCURRENTLY cannot run inside a transaction block)
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- Zero-Downtime Column Rename (Expand-Contract):
-- 1. Add new column: ALTER TABLE users ADD COLUMN display_name TEXT;
-- 2. Backfill: UPDATE users SET display_name = username WHERE display_name IS NULL;
-- 3. App writes to both, reads from display_name.
-- 4. Drop legacy column: ALTER TABLE users DROP COLUMN username;
```

### Removing Columns & Batch Data Backfills
```sql
-- Safe removal: deploy code without column reference FIRST, then drop column in next deploy:
ALTER TABLE orders DROP COLUMN legacy_status;

-- Batch data updates to avoid prolonged table locks:
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users WHERE normalized_email IS NULL LIMIT batch_size FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## ORM-Specific Migration Workflows

### Prisma (TypeScript/Node.js)
```bash
npx prisma migrate dev --name add_user_avatar   # Dev migration
npx prisma migrate deploy                       # Apply pending in prod
npx prisma migrate dev --create-only            # Custom SQL migration
```
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  @@map("users")
}
```

### Drizzle (TypeScript/Node.js)
```bash
npx drizzle-kit generate   # Generate SQL from schema
npx drizzle-kit migrate    # Apply migrations
```
```typescript
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### Kysely (TypeScript/Node.js)
```bash
kysely migrate make add_user_avatar   # New migration
kysely migrate latest                 # Apply all
kysely migrate down                   # Rollback last
```
```typescript
import { type Kysely, sql } from 'kysely';
// Always use Kysely<any> so migrations remain frozen in time
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('user_profile')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();
}
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('user_profile').execute();
}
```

### Django (Python)
```bash
python manage.py makemigrations                     # Generate migration
python manage.py migrate                            # Apply migration
python manage.py makemigrations --empty app_name    # Custom data migration
```
```python
from django.db import migrations

def backfill(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    batch_size = 5000
    users = User.objects.filter(display_name="")
    while users.exists():
        batch = list(users[:batch_size])
        for u in batch: u.display_name = u.username
        User.objects.bulk_update(batch, ["display_name"], batch_size=batch_size)

class Migration(migrations.Migration):
    dependencies = [("accounts", "0015_add_display_name")]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
```

### golang-migrate (Go)
```bash
migrate create -ext sql -dir migrations -seq add_user_avatar
migrate -path migrations -database "$DATABASE_URL" up
migrate -path migrations -database "$DATABASE_URL" down 1
```

## Zero-Downtime Strategy (Expand-Contract)

1. **Phase 1 (Expand)**: Add nullable/default column. Deploy app writing to both old and new. Backfill existing rows.
2. **Phase 2 (Migrate)**: Deploy app reading from new column while continuing dual-write. Verify consistency.
3. **Phase 3 (Contract)**: Deploy app reading/writing only new column. Drop old column in next migration.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|---|---|---|
| Manual SQL in prod | No audit trail, unreproducible | Always version in migration files |
| Editing deployed migrations | Schema drift across environments | Create a new forward migration |
| NOT NULL without default | Full table lock and row rewrites | Add nullable, backfill, then enforce NOT NULL |
| Inline index on large table | Blocks writes during build | Use `CREATE INDEX CONCURRENTLY` |
| DDL + DML combined | Hard rollback, long lock windows | Split into distinct schema and data migrations |
| Dropping before code removal | App errors on missing fields | Remove code references first, drop column after |

> [!IMPORTANT]
> Always verify database locks and migration timing against production replicas prior to maintenance execution.
