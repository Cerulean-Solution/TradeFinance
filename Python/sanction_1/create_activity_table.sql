-- =====================================================
-- Sanctions Screening Activity Table
-- Database: tf_genie
-- Table: tf_sanctions_activity
-- Purpose: Store all screening activities with LC number and match details
-- =====================================================

USE tf_genie;
GO

-- Drop existing table if it exists (CAUTION: This will delete all data!)
-- Comment out the next 3 lines if you want to preserve existing data
IF OBJECT_ID('dbo.tf_sanctions_activity', 'U') IS NOT NULL
    DROP TABLE dbo.tf_sanctions_activity;
GO

-- Create the tf_sanctions_activity table
CREATE TABLE dbo.tf_sanctions_activity (
    -- Primary Key
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Screening Identifiers
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    lc_number VARCHAR(100) NULL,
    
    -- Input Data
    input_name VARCHAR(500) NOT NULL,
    input_address VARCHAR(1000) NULL,
    
    -- Screening Results
    total_matches INT NOT NULL DEFAULT 0,
    matches_data NVARCHAR(MAX) NULL,  -- JSON format storing all match details
    
    -- Metadata
    screening_status VARCHAR(50) NOT NULL DEFAULT 'Completed',  -- Completed, Failed, In Progress
    screening_duration_seconds DECIMAL(10,2) NULL,
    records_processed INT NULL,
    
    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NULL,
    
    -- User Information (optional - for future use)
    created_by VARCHAR(100) NULL,
    
    -- Additional Notes
    notes NVARCHAR(500) NULL
);
GO

-- Create indexes for better performance
CREATE INDEX IX_tf_sanctions_activity_serial ON dbo.tf_sanctions_activity(serial_number);
CREATE INDEX IX_tf_sanctions_activity_lc ON dbo.tf_sanctions_activity(lc_number);
CREATE INDEX IX_tf_sanctions_activity_date ON dbo.tf_sanctions_activity(created_at DESC);
CREATE INDEX IX_tf_sanctions_activity_name ON dbo.tf_sanctions_activity(input_name);
GO

-- Add comments/descriptions to table and columns
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Stores all sanctions screening activities with LC numbers and detailed match results', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'tf_sanctions_activity';
GO

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Unique screening identifier (SCR-YYYYMMDD-HHMMSS-UUID)', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'tf_sanctions_activity',
    @level2type = N'COLUMN', @level2name = N'serial_number';
GO

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Letter of Credit number associated with this screening', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'tf_sanctions_activity',
    @level2type = N'COLUMN', @level2name = N'lc_number';
GO

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'JSON array containing all match details with techniques, scores, and relevancy', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'tf_sanctions_activity',
    @level2type = N'COLUMN', @level2name = N'matches_data';
GO

-- Sample query to verify table creation
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_NAME = 'tf_sanctions_activity'
ORDER BY 
    ORDINAL_POSITION;
GO

-- Sample INSERT statement (for testing)
/*
INSERT INTO dbo.tf_sanctions_activity 
    (serial_number, lc_number, input_name, input_address, total_matches, matches_data, screening_status, records_processed)
VALUES 
    ('SCR-20251111-120000-abc123', 'LC2024001', 'John Smith', NULL, 5, 
     '[{"Matching Name":"John Smith","Source":"OFAC","Country":"USA","Techniques Used":"Exact Match, Fuzzy","Relevancy":"95.5%","Match Count":5}]',
     'Completed', 19285);
*/

-- Sample SELECT queries (for testing)
/*
-- Get all screenings for a specific LC number
SELECT * FROM dbo.tf_sanctions_activity WHERE lc_number = 'LC2024001';

-- Get recent screenings (last 10)
SELECT TOP 10 * FROM dbo.tf_sanctions_activity ORDER BY created_at DESC;

-- Get screenings with matches
SELECT * FROM dbo.tf_sanctions_activity WHERE total_matches > 0 ORDER BY created_at DESC;

-- Get screening by serial number
SELECT * FROM dbo.tf_sanctions_activity WHERE serial_number = 'SCR-20251111-120000-abc123';

-- Count screenings by date
SELECT CAST(created_at AS DATE) as screening_date, COUNT(*) as total_screenings
FROM dbo.tf_sanctions_activity
GROUP BY CAST(created_at AS DATE)
ORDER BY screening_date DESC;
*/

PRINT 'Table tf_sanctions_activity created successfully!';
PRINT 'Indexes created for: serial_number, lc_number, created_at, input_name';
PRINT '';
PRINT 'Table Structure:';
PRINT '  - id (Primary Key, Auto-increment)';
PRINT '  - serial_number (Unique screening ID)';
PRINT '  - lc_number (Letter of Credit number)';
PRINT '  - input_name (Name that was screened)';
PRINT '  - input_address (Address if provided)';
PRINT '  - total_matches (Number of matches found)';
PRINT '  - matches_data (JSON with all match details)';
PRINT '  - screening_status (Completed/Failed/In Progress)';
PRINT '  - screening_duration_seconds (Time taken)';
PRINT '  - records_processed (Total records screened)';
PRINT '  - created_at (Timestamp)';
PRINT '  - updated_at (Last update timestamp)';
PRINT '  - created_by (User who ran screening)';
PRINT '  - notes (Additional notes)';
GO
