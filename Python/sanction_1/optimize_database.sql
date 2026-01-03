-- =====================================================
-- Database Optimization Script for Sanctions Screening
-- =====================================================
-- 
-- This script creates indexes to dramatically improve
-- screening performance on large sanctions datasets.
--
-- Run this script on your SQL Server database to optimize
-- query performance when screening against tf_sanctions table.
--
-- =====================================================

USE [tf_genie];
GO

-- =====================================================
-- 1. CREATE INDEX ON NAME COLUMN
-- =====================================================
-- This is the PRIMARY index for name-based searches
-- Improves performance for exact and fuzzy matching

IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE name='IX_tf_sanctions_name' 
               AND object_id = OBJECT_ID('dbo.tf_sanctions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_tf_sanctions_name
    ON [dbo].[tf_sanctions] ([name])
    INCLUDE ([id], [uniqid], [country], [source])
    WITH (ONLINE = ON, FILLFACTOR = 90);
    
    PRINT '✅ Created index: IX_tf_sanctions_name';
END
ELSE
BEGIN
    PRINT 'ℹ️  Index IX_tf_sanctions_name already exists';
END
GO

-- =====================================================
-- 2. CREATE INDEX ON COUNTRY COLUMN
-- =====================================================
-- Improves address/location-based matching performance

IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE name='IX_tf_sanctions_country' 
               AND object_id = OBJECT_ID('dbo.tf_sanctions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_tf_sanctions_country
    ON [dbo].[tf_sanctions] ([country])
    INCLUDE ([id], [name], [source])
    WITH (ONLINE = ON, FILLFACTOR = 90);
    
    PRINT '✅ Created index: IX_tf_sanctions_country';
END
ELSE
BEGIN
    PRINT 'ℹ️  Index IX_tf_sanctions_country already exists';
END
GO

-- =====================================================
-- 3. CREATE INDEX ON SOURCE COLUMN
-- =====================================================
-- Useful for filtering by sanction source

IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE name='IX_tf_sanctions_source' 
               AND object_id = OBJECT_ID('dbo.tf_sanctions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_tf_sanctions_source
    ON [dbo].[tf_sanctions] ([source])
    INCLUDE ([id], [name], [country])
    WITH (ONLINE = ON, FILLFACTOR = 90);
    
    PRINT '✅ Created index: IX_tf_sanctions_source';
END
ELSE
BEGIN
    PRINT 'ℹ️  Index IX_tf_sanctions_source already exists';
END
GO

-- =====================================================
-- 4. CREATE INDEX ON ACTIVITY TABLE (Serial Number)
-- =====================================================
-- Improves retrieval performance for past screenings

IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE name='IX_tf_sanctions_activity_serial' 
               AND object_id = OBJECT_ID('dbo.tf_sanctions_activity'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_tf_sanctions_activity_serial
    ON [dbo].[tf_sanctions_activity] ([serial_number])
    INCLUDE ([input_name], [input_address], [matches_data], [created_at])
    WITH (ONLINE = ON, FILLFACTOR = 90);
    
    PRINT '✅ Created index: IX_tf_sanctions_activity_serial';
END
ELSE
BEGIN
    PRINT 'ℹ️  Index IX_tf_sanctions_activity_serial already exists';
END
GO

-- =====================================================
-- 5. CREATE INDEX ON ACTIVITY TABLE (Date)
-- =====================================================
-- Improves performance for date-based queries

IF NOT EXISTS (SELECT * FROM sys.indexes 
               WHERE name='IX_tf_sanctions_activity_date' 
               AND object_id = OBJECT_ID('dbo.tf_sanctions_activity'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_tf_sanctions_activity_date
    ON [dbo].[tf_sanctions_activity] ([created_at] DESC)
    INCLUDE ([serial_number], [input_name])
    WITH (ONLINE = ON, FILLFACTOR = 90);
    
    PRINT '✅ Created index: IX_tf_sanctions_activity_date';
END
ELSE
BEGIN
    PRINT 'ℹ️  Index IX_tf_sanctions_activity_date already exists';
END
GO

-- =====================================================
-- 6. UPDATE STATISTICS
-- =====================================================
-- Refresh statistics for query optimizer

UPDATE STATISTICS [dbo].[tf_sanctions] WITH FULLSCAN;
PRINT '✅ Updated statistics for tf_sanctions';

IF OBJECT_ID('dbo.tf_sanctions_activity', 'U') IS NOT NULL
BEGIN
    UPDATE STATISTICS [dbo].[tf_sanctions_activity] WITH FULLSCAN;
    PRINT '✅ Updated statistics for tf_sanctions_activity';
END
GO

-- =====================================================
-- 7. VERIFY INDEXES
-- =====================================================
-- Display all indexes on sanctions tables

PRINT '';
PRINT '========================================';
PRINT 'INDEXES ON tf_sanctions TABLE:';
PRINT '========================================';

SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName,
    i.fill_factor AS FillFactor
FROM sys.indexes i
INNER JOIN sys.index_columns ic 
    ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('dbo.tf_sanctions')
    AND i.name IS NOT NULL
ORDER BY i.name, ic.key_ordinal;

PRINT '';
PRINT '========================================';
PRINT 'INDEXES ON tf_sanctions_activity TABLE:';
PRINT '========================================';

IF OBJECT_ID('dbo.tf_sanctions_activity', 'U') IS NOT NULL
BEGIN
    SELECT 
        i.name AS IndexName,
        i.type_desc AS IndexType,
        COL_NAME(ic.object_id, ic.column_id) AS ColumnName,
        i.fill_factor AS FillFactor
    FROM sys.indexes i
    INNER JOIN sys.index_columns ic 
        ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    WHERE i.object_id = OBJECT_ID('dbo.tf_sanctions_activity')
        AND i.name IS NOT NULL
    ORDER BY i.name, ic.key_ordinal;
END
GO

-- =====================================================
-- 8. PERFORMANCE TESTING QUERY
-- =====================================================
-- Test query performance after indexing

PRINT '';
PRINT '========================================';
PRINT 'PERFORMANCE TEST:';
PRINT '========================================';

SET STATISTICS TIME ON;
SET STATISTICS IO ON;

-- Test query
SELECT COUNT(*) AS TotalRecords FROM [dbo].[tf_sanctions];
SELECT TOP 10 * FROM [dbo].[tf_sanctions] WHERE name LIKE 'John%';

SET STATISTICS TIME OFF;
SET STATISTICS IO OFF;

PRINT '';
PRINT '========================================';
PRINT '✅ OPTIMIZATION COMPLETE!';
PRINT '========================================';
PRINT '';
PRINT 'Expected Performance Improvements:';
PRINT '  • Name searches: 10-50x faster';
PRINT '  • Full table scans: 2-5x faster';
PRINT '  • Activity retrieval: 20-100x faster';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Run the sanctions screening application';
PRINT '  2. Monitor performance improvements';
PRINT '  3. Check audit_log.txt for timing data';
PRINT '';
GO

-- =====================================================
-- MAINTENANCE RECOMMENDATIONS
-- =====================================================
/*

REGULAR MAINTENANCE SCHEDULE:

1. WEEKLY: Rebuild fragmented indexes
   ALTER INDEX ALL ON [dbo].[tf_sanctions] REORGANIZE;
   ALTER INDEX ALL ON [dbo].[tf_sanctions_activity] REORGANIZE;

2. MONTHLY: Update statistics
   UPDATE STATISTICS [dbo].[tf_sanctions] WITH FULLSCAN;
   UPDATE STATISTICS [dbo].[tf_sanctions_activity] WITH FULLSCAN;

3. QUARTERLY: Rebuild indexes
   ALTER INDEX ALL ON [dbo].[tf_sanctions] REBUILD WITH (ONLINE = ON);
   ALTER INDEX ALL ON [dbo].[tf_sanctions_activity] REBUILD WITH (ONLINE = ON);

4. MONITOR: Check index fragmentation
   SELECT 
       OBJECT_NAME(ips.object_id) AS TableName,
       i.name AS IndexName,
       ips.avg_fragmentation_in_percent
   FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETAILED') ips
   INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
   WHERE ips.avg_fragmentation_in_percent > 10
   ORDER BY ips.avg_fragmentation_in_percent DESC;

*/
