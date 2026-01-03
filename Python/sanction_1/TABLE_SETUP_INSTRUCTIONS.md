# tf_sanctions_activity Table Setup Instructions

## Overview

This document provides instructions for creating the **tf_sanctions_activity** table in your SQL Server database. This table stores all sanctions screening activities including LC numbers, match details, and metadata.

---

## Table Structure

### Fields

| Column Name | Data Type | Description |
|------------|-----------|-------------|
| **id** | INT IDENTITY(1,1) | Primary key, auto-increment |
| **serial_number** | VARCHAR(100) | Unique screening identifier (e.g., SCR-20251111-120000-abc123) |
| **lc_number** | VARCHAR(100) | Letter of Credit number (optional) |
| **input_name** | VARCHAR(500) | Name that was screened |
| **input_address** | VARCHAR(1000) | Address that was screened (optional) |
| **total_matches** | INT | Number of matches found |
| **matches_data** | NVARCHAR(MAX) | JSON array with all match details |
| **screening_status** | VARCHAR(50) | Status: Completed, Failed, In Progress |
| **screening_duration_seconds** | DECIMAL(10,2) | Time taken for screening |
| **records_processed** | INT | Total sanctions records screened |
| **created_at** | DATETIME | Timestamp when screening was created |
| **updated_at** | DATETIME | Last update timestamp (optional) |
| **created_by** | VARCHAR(100) | User who ran the screening (optional) |
| **notes** | NVARCHAR(500) | Additional notes (optional) |

### Indexes

- **IX_tf_sanctions_activity_serial** - On serial_number (for fast lookups)
- **IX_tf_sanctions_activity_lc** - On lc_number (for LC-based queries)
- **IX_tf_sanctions_activity_date** - On created_at DESC (for recent screenings)
- **IX_tf_sanctions_activity_name** - On input_name (for name-based searches)

---

## Installation Steps

### Step 1: Connect to SQL Server

```bash
sqlcmd -S desktop-eneq19v -d tf_genie -U shahul -P "Apple123!@#"
```

Or use SQL Server Management Studio (SSMS) to connect to:
- **Server:** desktop-eneq19v
- **Database:** tf_genie
- **Username:** shahul
- **Password:** Apple123!@#

### Step 2: Run the SQL Script

Execute the `create_activity_table.sql` file:

**Option A: Using sqlcmd**
```bash
sqlcmd -S desktop-eneq19v -d tf_genie -U shahul -P "Apple123!@#" -i create_activity_table.sql
```

**Option B: Using SSMS**
1. Open SQL Server Management Studio
2. Connect to the server
3. Open `create_activity_table.sql`
4. Execute the script (F5)

### Step 3: Verify Table Creation

Run this query to verify:

```sql
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_NAME = 'tf_sanctions_activity'
ORDER BY 
    ORDINAL_POSITION;
```

You should see all 14 columns listed.

### Step 4: Verify Indexes

Run this query to check indexes:

```sql
SELECT 
    i.name AS index_name,
    COL_NAME(ic.object_id, ic.column_id) AS column_name
FROM 
    sys.indexes AS i
INNER JOIN 
    sys.index_columns AS ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE 
    i.object_id = OBJECT_ID('dbo.tf_sanctions_activity')
ORDER BY 
    i.name, ic.key_ordinal;
```

You should see 4 indexes.

---

## Sample Data

### Example Insert

```sql
INSERT INTO dbo.tf_sanctions_activity 
    (serial_number, lc_number, input_name, input_address, total_matches, 
     matches_data, screening_status, records_processed, screening_duration_seconds)
VALUES 
    ('SCR-20251111-120000-abc123', 
     'LC2024001', 
     'John Smith', 
     NULL, 
     5, 
     '[{"Matching Name":"John Smith","Source":"OFAC","Country":"USA","Techniques Used":"Exact Match, Fuzzy","Relevancy":"95.5%","Match Count":5}]',
     'Completed', 
     19285,
     72.5);
```

### Example Queries

**Get all screenings for a specific LC number:**
```sql
SELECT * 
FROM dbo.tf_sanctions_activity 
WHERE lc_number = 'LC2024001'
ORDER BY created_at DESC;
```

**Get recent screenings (last 10):**
```sql
SELECT TOP 10 
    serial_number,
    lc_number,
    input_name,
    total_matches,
    screening_duration_seconds,
    created_at
FROM dbo.tf_sanctions_activity 
ORDER BY created_at DESC;
```

**Get screenings with matches:**
```sql
SELECT 
    serial_number,
    lc_number,
    input_name,
    total_matches,
    created_at
FROM dbo.tf_sanctions_activity 
WHERE total_matches > 0 
ORDER BY total_matches DESC, created_at DESC;
```

**Get screening by serial number:**
```sql
SELECT * 
FROM dbo.tf_sanctions_activity 
WHERE serial_number = 'SCR-20251111-120000-abc123';
```

**Count screenings by date:**
```sql
SELECT 
    CAST(created_at AS DATE) as screening_date, 
    COUNT(*) as total_screenings,
    SUM(total_matches) as total_matches_found
FROM dbo.tf_sanctions_activity
GROUP BY CAST(created_at AS DATE)
ORDER BY screening_date DESC;
```

**Get average screening duration:**
```sql
SELECT 
    AVG(screening_duration_seconds) as avg_duration_seconds,
    MIN(screening_duration_seconds) as min_duration_seconds,
    MAX(screening_duration_seconds) as max_duration_seconds
FROM dbo.tf_sanctions_activity
WHERE screening_status = 'Completed';
```

---

## JSON Data Format

The `matches_data` column stores match results in JSON format:

```json
[
  {
    "Matching Name": "Vladimir Putin",
    "Source": "OFAC",
    "Country": "Russia",
    "Techniques Used": "Exact Match, Case-Insensitive, Fuzzy Similarity",
    "Relevancy": "98.5%",
    "Match Count": 7
  },
  {
    "Matching Name": "Xi Jinping",
    "Source": "UN",
    "Country": "China",
    "Techniques Used": "Case-Insensitive, Token Set, Phonetic",
    "Relevancy": "87.3%",
    "Match Count": 5
  }
]
```

---

## Maintenance

### Backup Before Dropping

If you need to recreate the table, **backup your data first**:

```sql
-- Backup to a new table
SELECT * 
INTO tf_sanctions_activity_backup_20251111
FROM tf_sanctions_activity;
```

### Archive Old Records

Archive screenings older than 1 year:

```sql
-- Create archive table (one time)
SELECT * 
INTO tf_sanctions_activity_archive
FROM tf_sanctions_activity
WHERE 1 = 0;  -- Creates structure only

-- Move old records
INSERT INTO tf_sanctions_activity_archive
SELECT * 
FROM tf_sanctions_activity
WHERE created_at < DATEADD(YEAR, -1, GETDATE());

-- Delete from main table
DELETE FROM tf_sanctions_activity
WHERE created_at < DATEADD(YEAR, -1, GETDATE());
```

### Rebuild Indexes (Monthly)

```sql
-- Rebuild all indexes for better performance
ALTER INDEX ALL ON dbo.tf_sanctions_activity REBUILD;
```

---

## Troubleshooting

### Error: Table already exists

If you get an error that the table already exists:

1. **Option A:** Drop the existing table (⚠️ This deletes all data!)
   ```sql
   DROP TABLE dbo.tf_sanctions_activity;
   ```

2. **Option B:** Rename the existing table
   ```sql
   EXEC sp_rename 'dbo.tf_sanctions_activity', 'tf_sanctions_activity_old';
   ```

3. **Option C:** Modify the script to add missing columns
   ```sql
   ALTER TABLE dbo.tf_sanctions_activity
   ADD lc_number VARCHAR(100) NULL;
   ```

### Error: Permission denied

Make sure your user has the necessary permissions:

```sql
-- Grant permissions (run as admin)
GRANT CREATE TABLE TO shahul;
GRANT ALTER ON SCHEMA::dbo TO shahul;
```

### Error: Cannot insert NULL into non-nullable column

Make sure you're passing values for all required fields:
- serial_number (required)
- input_name (required)
- total_matches (required, use 0 if no matches)
- records_processed (required)
- screening_status (required, default is 'Completed')

---

## Integration with Application

The Streamlit application automatically saves screening results to this table with:

- **serial_number**: Auto-generated (SCR-YYYYMMDD-HHMMSS-UUID)
- **lc_number**: From user input (optional)
- **input_name**: From user input
- **total_matches**: Count of matches found
- **matches_data**: JSON array of all matches
- **records_processed**: Total sanctions records screened
- **screening_duration_seconds**: Time taken in seconds
- **screening_status**: 'Completed'
- **created_at**: Current timestamp

---

## Performance Tips

1. **Indexes are critical** - Make sure all 4 indexes are created
2. **Regular maintenance** - Rebuild indexes monthly
3. **Archive old data** - Move records older than 1 year to archive table
4. **Monitor size** - Check table size regularly:
   ```sql
   EXEC sp_spaceused 'tf_sanctions_activity';
   ```

---

## Support

If you encounter any issues:

1. Check the application logs in `audit_log.txt`
2. Verify database connection settings in `.env`
3. Ensure ODBC Driver 17 is installed
4. Check SQL Server error logs

---

**Last Updated:** November 11, 2025  
**Version:** 1.4  
**Database:** tf_genie  
**Table:** tf_sanctions_activity
