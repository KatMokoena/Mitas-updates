# How SQLite Database Connects to Your App Changes

## Overview: The Complete Data Flow

When you make changes in the app (create, update, delete), here's exactly how it flows from the UI to the SQLite database:

```
┌─────────────────┐
│  React UI       │  ← You click "Delete User" or "Create Order"
│  (Frontend)     │
└────────┬────────┘
         │
         │ HTTP Request (fetch API)
         │ POST /api/users
         │ DELETE /api/users/:id
         ▼
┌─────────────────┐
│  API Routes     │  ← src/api/routes/users.ts
│  (Backend)      │     - Validates permissions
│                 │     - Processes the request
└────────┬────────┘
         │
         │ TypeORM Repository
         │ userRepository.save()
         │ userRepository.delete()
         ▼
┌─────────────────┐
│  TypeORM        │  ← Maps TypeScript classes to SQL
│  (ORM Layer)    │     - UserEntity → users table
│                 │     - Converts JS objects to SQL queries
└────────┬────────┘
         │
         │ SQL Queries
         │ INSERT INTO users...
         │ DELETE FROM users...
         ▼
┌─────────────────┐
│  SQLite DB      │  ← ipmp.db file
│  (Storage)      │     - Physical file on disk
│                 │     - Stores all your data permanently
└─────────────────┘
```

---

## Step-by-Step Example: Deleting a User

### 1. **Frontend Action** (React Component)
**File:** `src/renderer/components/Users.tsx`

```typescript
const handleDelete = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
    method: 'DELETE',
    headers: { 'x-session-id': sessionId || '' },
  });
  // After successful deletion, refresh the user list
  fetchUsers();
};
```

**What happens:** User clicks delete → React sends HTTP DELETE request to backend

---

### 2. **API Route Handler** (Express Backend)
**File:** `src/api/routes/users.ts`

```typescript
router.delete('/:id', async (req, res) => {
  // 1. Check permissions
  if (!permissionService.canManageUsers(req.user!.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // 2. Get database repository
  const userRepository = getDataSource().getRepository(UserEntity);
  
  // 3. Find the user
  const user = await userRepository.findOne({ where: { id: req.params.id } });
  
  // 4. Delete from database
  await queryRunner.query(`DELETE FROM users WHERE id = ?`, [req.params.id]);
  
  // 5. Return success
  res.status(204).send();
});
```

**What happens:** 
- Validates user has permission
- Gets TypeORM repository for UserEntity
- Executes SQL DELETE query
- Returns success response

---

### 3. **TypeORM Entity** (Database Schema Definition)
**File:** `src/database/entities/User.ts`

```typescript
@Entity('users')  // ← Maps to 'users' table in SQLite
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;  // ← Maps to 'id' column (PRIMARY KEY)

  @Column({ unique: true })
  email!: string;  // ← Maps to 'email' column (UNIQUE)

  @Column()
  passwordHash!: string;  // ← Maps to 'passwordHash' column
  
  // ... more columns
}
```

**What happens:** TypeORM uses these decorators to:
- Know which table to query (`users`)
- Know which columns exist
- Convert TypeScript objects ↔ SQL rows

---

### 4. **Database Configuration** (Connection & Schema Sync)
**File:** `src/database/config.ts`

```typescript
AppDataSource = new DataSource({
  type: 'better-sqlite3',  // ← SQLite database type
  database: dbPath,        // ← Path to ipmp.db file
  entities: [UserEntity, ...],  // ← All entity classes
  synchronize: true,        // ← Auto-update schema when entities change
});
```

**What happens:**
- Connects to SQLite file at `ipmp.db`
- When `synchronize: true`, TypeORM automatically:
  - Creates tables if they don't exist
  - Adds new columns if you add them to entities
  - Updates column types if you change them

---

### 5. **SQLite Database File** (Physical Storage)
**Location:** `C:\SelfBuilds\Mitas Internal Project Management Platform (IPMP)\ipmp.db`

**What happens:**
- All data is stored in this single file
- SQLite executes the SQL queries
- Changes are written to disk immediately
- Data persists even after app closes

---

## Key Concepts

### 1. **TypeORM Synchronize Mode**
```typescript
synchronize: true  // In config.ts
```

**What it does:**
- Automatically creates/updates database tables to match your entity definitions
- If you add a new `@Column()` to an entity, TypeORM adds that column to the table
- **Important:** This only works for schema changes, not data migration

**Example:**
```typescript
// You add this to UserEntity:
@Column({ nullable: true })
phoneNumber?: string;

// TypeORM automatically runs:
// ALTER TABLE users ADD COLUMN "phoneNumber" varchar;
```

---

### 2. **Manual Migrations** (For Complex Changes)
**File:** `src/database/config.ts` → `runMigrations()`

**What it does:**
- Runs custom SQL when needed
- Handles complex schema changes
- Migrates existing data when structure changes

**Example from your code:**
```typescript
// Checks if 'category' column exists in resources table
const hasCategory = resourcesTableInfo.some((col: any) => col.name === 'category');

if (!hasCategory) {
  // Adds the column if missing
  await queryRunner.query(`ALTER TABLE resources ADD COLUMN "category" varchar;`);
}
```

---

### 3. **Repository Pattern**
```typescript
const userRepository = getDataSource().getRepository(UserEntity);

// TypeORM methods that map to SQL:
await userRepository.find()           // SELECT * FROM users
await userRepository.findOne({...})   // SELECT * FROM users WHERE ...
await userRepository.save(user)       // INSERT or UPDATE
await userRepository.delete(id)       // DELETE FROM users WHERE id = ...
```

**What it does:**
- Provides high-level methods instead of writing raw SQL
- TypeORM converts these to SQL queries automatically
- Handles data type conversions (TypeScript ↔ SQL)

---

## Real Example: Creating a New User

### Frontend → Backend → Database Flow:

1. **User fills form** in `Users.tsx` → clicks "Create User"

2. **React sends POST request:**
   ```typescript
   fetch('/api/users', {
     method: 'POST',
     body: JSON.stringify({ name, email, password, role })
   })
   ```

3. **API route receives it** (`src/api/routes/users.ts`):
   ```typescript
   router.post('/', async (req, res) => {
     const { name, email, password, role } = req.body;
     const result = await authService.createUser(name, email, password, role);
     res.json(result.user);
   });
   ```

4. **AuthService creates user** (`src/auth/auth.ts`):
   ```typescript
   const user = userRepository.create({
     id: uuidv4(),
     name, email, passwordHash, role
   });
   await userRepository.save(user);  // ← This writes to database
   ```

5. **TypeORM converts to SQL:**
   ```sql
   INSERT INTO users (id, name, email, passwordHash, role, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?)
   ```

6. **SQLite executes query** → Data saved to `ipmp.db`

7. **Response sent back** → Frontend updates UI

---

## How Schema Changes Work

### When You Modify an Entity:

**Example:** Adding a new field to `UserEntity`

```typescript
// src/database/entities/User.ts
@Column({ nullable: true })
phoneNumber?: string;  // ← New field added
```

**What happens on next app start:**

1. `initializeDatabase()` runs
2. TypeORM checks: "Does `users` table have `phoneNumber` column?"
3. If NO → TypeORM runs: `ALTER TABLE users ADD COLUMN "phoneNumber" varchar;`
4. Schema now matches your entity

**Note:** This is why `synchronize: true` is powerful but also risky in production (can lose data if not careful).

---

## Database File Location

**Path:** `ipmp.db` in your project root

**To view the database:**
```bash
# Using SQLite command line
sqlite3 ipmp.db

# Then run SQL commands:
.tables              # List all tables
SELECT * FROM users; # View all users
.schema users        # See table structure
```

---

## Important Points

1. **All changes are permanent** - Once saved to SQLite, data persists until explicitly deleted
2. **TypeORM handles SQL** - You work with TypeScript objects, TypeORM converts to SQL
3. **Synchronize mode** - Automatically updates schema when you change entities
4. **Migrations** - For complex changes, custom SQL in `runMigrations()` handles it
5. **Single file** - All data in one `ipmp.db` file (easy to backup/transfer)

---

## Summary

**Your changes flow:**
```
UI Action → API Request → TypeORM Repository → SQL Query → SQLite File
```

**Schema changes flow:**
```
Entity Change → TypeORM Synchronize → ALTER TABLE → SQLite Schema Updated
```

The database is always the **source of truth** - what you see in the UI is a reflection of what's stored in `ipmp.db`.













