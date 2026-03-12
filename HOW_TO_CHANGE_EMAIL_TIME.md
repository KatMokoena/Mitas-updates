# How to Change Email Schedule Time

## Location
**File:** `src/services/schedulerService.ts`

## Steps to Change the Time

### 1. Update the Cron Expression (Line 29)
Change the `cronExpression` variable:

```typescript
const cronExpression = '32 15 * * *';  // Change this line
```

**Cron Format:** `'minute hour * * *'`
- **minute**: 0-59 (the minute of the hour)
- **hour**: 0-23 (24-hour format, so 15 = 3 PM)
- `* * *` = every day of month, every month, every day of week

**Examples:**
- `'0 9 * * *'` = 9:00 AM
- `'30 14 * * *'` = 2:30 PM (14:30)
- `'45 17 * * *'` = 5:45 PM (17:45)
- `'0 8 * * *'` = 8:00 AM
- `'15 16 * * *'` = 4:15 PM (16:15)

### 2. Update Console Log Messages (Lines 30, 57)
Update the time references in the console.log messages to match your new time:

```typescript
// Line 30
console.log(`Setting up cron schedule: ${cronExpression} (15:32 / 3:32 PM)`);
// Change to match your new time, e.g.:
// console.log(`Setting up cron schedule: ${cronExpression} (9:00 / 9:00 AM)`);

// Line 57
console.log('   Schedule: Every day at 15:32 (3:32 PM)');
// Change to match your new time, e.g.:
// console.log('   Schedule: Every day at 9:00 (9:00 AM)');
```

### 3. Update getStatus() Function (Line 63)
Update the `setHours()` call to match your new time:

```typescript
// Line 63
nextRun.setHours(15, 32, 0, 0);
// Change to match your new time, e.g.:
// nextRun.setHours(9, 0, 0, 0);  // for 9:00 AM
// nextRun.setHours(14, 30, 0, 0); // for 2:30 PM
```

**Format:** `setHours(hour, minute, second, millisecond)`

### 4. Update server.ts (Optional - Line 48)
Update the console log message in `server.ts`:

```typescript
// File: server.ts, Line 48
console.log('Starting daily email scheduler (15:32 / 3:32 PM Johannesburg time)...');
// Change to match your new time
```

## Quick Reference Table

| Time (24-hour) | Time (12-hour) | Cron Expression | setHours() |
|----------------|----------------|-----------------|------------|
| 8:00 AM        | 8:00 AM        | `'0 8 * * *'`   | `setHours(8, 0, 0, 0)` |
| 9:00 AM        | 9:00 AM        | `'0 9 * * *'`   | `setHours(9, 0, 0, 0)` |
| 12:00 PM       | 12:00 PM       | `'0 12 * * *'`  | `setHours(12, 0, 0, 0)` |
| 2:30 PM        | 2:30 PM        | `'30 14 * * *'` | `setHours(14, 30, 0, 0)` |
| 3:32 PM        | 3:32 PM        | `'32 15 * * *'` | `setHours(15, 32, 0, 0)` |
| 5:45 PM        | 5:45 PM        | `'45 17 * * *'` | `setHours(17, 45, 0, 0)` |

## After Making Changes

1. **Rebuild the server:**
   ```bash
   npm run build:server
   ```

2. **Restart the server:**
   ```bash
   npm start
   ```

3. **Verify the scheduler started:**
   Look for this message in the console:
   ```
   ✅ Daily email scheduler started successfully
      Schedule: Every day at [your time]
      Timezone: Africa/Johannesburg
      Next run: [tomorrow's date] [your time]
   ```

## Important Notes

- **Timezone:** The scheduler uses `Africa/Johannesburg` timezone. All times are in Johannesburg time.
- **Server must be running:** The scheduler only works when the server is running continuously.
- **Automatic restart:** If you restart the server, the scheduler will restart with the new time automatically.












