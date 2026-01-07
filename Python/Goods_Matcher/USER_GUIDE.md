# Goods Matching System - User Guide

## Quick Start

### Installation on Your System

1. **Copy the entire `goods_matcher` folder** to your Windows machine where SQL Server is accessible

2. **Install Python 3.11+** if not already installed

3. **Install ODBC Driver 17 for SQL Server**
   - Download from: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
   - This is required for database connectivity

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Verify your `.env` file** has the correct credentials:
   - DB_SERVER=desktop-eneq19v
   - DB_NAME=tf_genie
   - DB_USER=shahul
   - DB_PASSWORD=Apple123!@#

6. **Start the application:**
   ```bash
   streamlit run app.py
   ```

7. **Access the application** at http://localhost:8501

## Using the Application

### Main Workflow

#### Step 1: Check Connectivity Status
- When the app starts, it automatically tests all connections
- Look for the green "🟢 System Ready" message at the top
- If you see warnings, click "View Connection Details" to see what failed

#### Step 2: Enter Goods Description

**Option A: Use Sample Dropdown**
- Click the "Quick Demo Samples" dropdown
- Select a pre-configured sample description
- Great for testing and demonstrations

**Option B: Manual Entry**
- Type or paste your goods description in the text area
- Be as detailed as possible for better matches
- The system will match against ItemDescription, ShortDescription, and FullText fields

#### Step 3: Search and Match
- Click the "🔍 Search & Match" button
- The system will:
  - Query the ExportControlItems table
  - Apply all 10 matching techniques
  - Score and rank the results
  - Assign a unique Run ID for tracking

#### Step 4: Review Results

**Results Grid Shows:**
- **Match #** - Position in results (sorted by best score)
- **Item ID** - Database identifier
- **Item Description** - Full description from database
- **Best Score** - Highest matching percentage
- **Primary Match Type** - User-friendly technique name (e.g., "Text Similarity Score")
- **Primary Explanation** - Plain English explanation (e.g., "Close match (80%)")
- **All Techniques Used** - Complete list of all techniques that matched
- **Technical Methods** - Technical names for advanced users
- **Source Information** - Regulation, country, and document references

**Understanding Match Types:**

| User-Friendly Name | What It Means | When It's Used |
|-------------------|---------------|----------------|
| Identical Text (Case-Sensitive) | Exact character-by-character match | Rare, requires perfect match |
| Same Text (Ignoring Case) | Same words, ignoring UPPER/lower case | Common for standard descriptions |
| Text Similarity Score | How similar the texts are (0-100%) | Most common, catches typos and variations |
| Word Match (Any Order) | Same words in different order | Good for reordered descriptions |
| Sounds Similar When Spoken | Phonetic matching (sounds alike) | Catches spelling variations |
| Word Overlap Percentage | Percentage of shared words | Good for partial matches |
| Normalized Address Match | Addresses after standardization | For location-based matching |
| Same Physical Location | Geographic proximity detection | For location references |
| Combined Confidence Score | Weighted combination of techniques | Most reliable overall score |

#### Step 5: Download Results
- Click "📥 Download Results as CSV" to export
- File includes all match details
- Can be opened in Excel for further analysis

#### Step 6: View Detailed Information
- Click "🔍 View Detailed Match Information" expander
- See complete breakdown for each match
- Shows all techniques applied with individual scores
- Includes full source information

### System Activity Log

Located between input and results sections:
- Shows real-time system activity
- Displays SQL queries executed
- Records connectivity tests
- Logs any errors that occur
- Useful for troubleshooting

### Testing the System

Located underneath the main results:

**Add Test Entry Section:**
1. Expand "Add Test Entry to tf_sanctions Table"
2. Enter a test name (required)
3. Enter a test address (optional)
4. Click "➕ Add Test Entry"
5. Verify success message appears
6. Check system logs to confirm database write

**Purpose:**
- Verify database write permissions
- Test table creation (auto-creates tf_sanctions if needed)
- Confirm system is working end-to-end

### Retrieving Past Results

Located at the bottom of the page:

1. Enter the Run ID from a previous search
2. Click "🔍 Retrieve"
3. View:
   - Original input description
   - Number of matches found
   - Date and time of search
   - Techniques that were used
   - Full results data

**Use Cases:**
- Audit trail for compliance
- Compare results over time
- Share results with team members
- Review historical searches

## Understanding the 10 Matching Techniques

### Technique 1: Exact Match
- **What it does:** Character-by-character comparison (case-sensitive)
- **When it matches:** Only when text is 100% identical
- **Score:** 100% or 0%
- **Example:** "Aluminum Tubes" ≠ "aluminum tubes"

### Technique 2: Case-Insensitive Match
- **What it does:** Ignores uppercase/lowercase differences
- **When it matches:** Same text ignoring case and extra spaces
- **Score:** 100% or 0%
- **Example:** "Aluminum Tubes" = "aluminum tubes"

### Technique 3: Fuzzy Similarity
- **What it does:** Measures text similarity using Levenshtein distance
- **When it matches:** Score ≥ 60%
- **Score:** 0-100% (higher = more similar)
- **Example:** "Aluminum tubes" vs "Aluminium tubes" = 93%
- **Good for:** Typos, spelling variations, minor differences

### Technique 4: Token Set Match
- **What it does:** Compares words regardless of order
- **When it matches:** Score ≥ 70%
- **Score:** 0-100%
- **Example:** "industrial aluminum tubes" = "tubes aluminum industrial"
- **Good for:** Reordered descriptions, different phrasing

### Technique 5: Phonetic Similarity
- **What it does:** Compares how words sound (Soundex + Metaphone)
- **When it matches:** Words sound similar
- **Score:** 0%, 75%, or 100%
- **Example:** "Aluminum" sounds like "Aluminium"
- **Good for:** International spelling variations, pronunciation-based matches

### Technique 6: N-Gram / Jaccard Similarity
- **What it does:** Measures word overlap percentage
- **When it matches:** Score ≥ 30%
- **Score:** 0-100% (percentage of shared words)
- **Example:** "aluminum tubes industrial" vs "aluminum pipes industrial" = 66%
- **Good for:** Partial matches, related descriptions

### Technique 7: Address Normalization
- **What it does:** Standardizes addresses (St→Street, Ave→Avenue, etc.)
- **When it matches:** Score ≥ 70% after normalization
- **Score:** 0-100%
- **Example:** "123 Main St." = "123 Main Street"
- **Good for:** Location-based matching, address variations

### Technique 8: Location Proximity
- **What it does:** Detects same physical location references
- **When it matches:** Multiple common location terms
- **Score:** 0-90%
- **Example:** "New York Manhattan" vs "Manhattan New York"
- **Good for:** Geographic matching, location references

### Technique 9: ML Composite Score
- **What it does:** Combines Fuzzy (30%), Token (25%), Phonetic (20%), N-gram (25%)
- **When it matches:** Score ≥ 50%
- **Score:** 0-100% weighted average
- **Example:** Shows breakdown: "Fuzzy:80, Token:94, Phonetic:75, N-gram:66"
- **Good for:** Most reliable overall matching, balanced approach
- **Note:** Explanation shows individual technique scores for transparency

## Troubleshooting

### Connection Failed

**Problem:** Red or yellow connectivity status

**Solutions:**
1. Verify SQL Server is running
2. Check server name: `desktop-eneq19v`
3. Confirm database exists: `tf_genie`
4. Test credentials: `shahul` / `Apple123!@#`
5. Ensure ODBC Driver 17 is installed
6. Check firewall allows SQL Server connections
7. Verify network connectivity to server

### No Matches Found

**Problem:** Search returns 0 results

**Solutions:**
1. Check ExportControlItems table has data
2. Try a simpler, more general description
3. Lower the threshold (default is 50%)
4. Check system logs for errors
5. Verify database connection is active
6. Try one of the sample descriptions

### Application Won't Start

**Problem:** Streamlit fails to launch

**Solutions:**
1. Verify Python 3.11+ is installed
2. Install all requirements: `pip install -r requirements.txt`
3. Check port 8501 is not in use
4. Try different port: `streamlit run app.py --server.port=8502`
5. Check Python path is correct

### Slow Performance

**Problem:** Searches take too long

**Solutions:**
1. Check network latency to SQL Server
2. Verify database has proper indexes
3. Reduce number of items in ExportControlItems table
4. Check system logs for repeated queries
5. Consider adding database pagination

### Database Write Errors

**Problem:** Can't add test entries or save activities

**Solutions:**
1. Verify user has CREATE TABLE permission
2. Check user has INSERT permission
3. Confirm database has space available
4. Review system logs for specific SQL errors
5. Test with database admin account

## Best Practices

### For Best Matching Results

1. **Be Specific:** Include key identifying terms
2. **Use Standard Terms:** Avoid abbreviations when possible
3. **Include Context:** Add usage or application details
4. **Try Variations:** Test different phrasings
5. **Review Multiple Matches:** Don't just look at top result

### For System Administration

1. **Monitor Logs:** Regularly check `logs/audit_log.txt`
2. **Backup Database:** Regular backups of tf_genie database
3. **Archive Old Runs:** Periodically clean tf_sanctions_activity table
4. **Update Samples:** Keep demo samples relevant
5. **Document Thresholds:** Note any threshold changes

### For Compliance and Auditing

1. **Use Run IDs:** Always reference Run ID in documentation
2. **Export Results:** Download CSV for permanent records
3. **Review Techniques:** Understand which techniques matched
4. **Check Sources:** Verify SourceRegulation and SourceCountry
5. **Maintain Logs:** Keep audit logs for required retention period

## Advanced Configuration

### Adjusting Match Threshold

In `matcher.py`, the default threshold is 50%. To change:

```python
matches = matcher.match_items(input_description, db_items, threshold=60)
```

Higher threshold = fewer but more confident matches
Lower threshold = more matches but lower confidence

### Customizing Technique Weights

In `technique_9_composite_score`, adjust weights:

```python
scores.append(fuzzy_score * 0.3)    # Fuzzy weight
scores.append(token_score * 0.25)   # Token weight
scores.append(phonetic_score * 0.2) # Phonetic weight
scores.append(ngram_score * 0.25)   # N-gram weight
```

Weights should sum to 1.0

### Adding Custom Samples

Edit `SAMPLE_DESCRIPTIONS` in `app.py`:

```python
SAMPLE_DESCRIPTIONS = [
    "Select a sample...",
    "Your custom description 1",
    "Your custom description 2",
    # Add more...
]
```

## Technical Details

### Database Tables

**ExportControlItems** (Source - Read Only)
- ItemID: Unique identifier
- SourceRegulation: Regulatory framework
- SourceDocument: Reference document
- SourceCountry: Country of origin
- ItemDescription: Primary description
- ShortDescription: Brief description
- FullText: Complete text
- CreatedDate: Creation timestamp
- ModifiedDate: Last update timestamp

**tf_sanctions_activity** (Auto-Created - Read/Write)
- RunID: Unique serial number (Primary Key)
- RunDate: Search timestamp
- InputDescription: User input
- MatchCount: Number of matches
- TechniquesUsed: Comma-separated technique names
- MatchResults: Serialized match data

**tf_sanctions** (Auto-Created - Read/Write)
- ID: Auto-increment identifier
- Name: Test entry name
- Address: Test entry address
- CreatedDate: Creation timestamp

### File Structure

```
goods_matcher/
├── app.py                    # Main Streamlit UI
├── matcher.py                # Matching engine (10 techniques)
├── database.py               # SQL Server connectivity
├── logger.py                 # Audit logging
├── .env                      # Configuration (DO NOT SHARE)
├── requirements.txt          # Python dependencies
├── README.md                 # Technical documentation
├── USER_GUIDE.md            # This file
├── test_components.py        # Component testing
├── run.sh                    # Linux/Mac startup script
├── data/                     # Data directory
└── logs/
    └── audit_log.txt         # Unified audit log
```

### Log Format

```
[2024-11-11 02:45:30.123] [SQL] Query Executed
    Details: Query: SELECT * FROM ExportControlItems
    Result Count: 150
--------------------------------------------------------------------------------
[2024-11-11 02:45:31.456] [MATCH_RUN] Matching Operation
    Details: Run ID: 1
    Input: Aluminum tubes for industrial use
    Matches Found: 12
--------------------------------------------------------------------------------
```

## Support and Maintenance

### Regular Maintenance Tasks

**Daily:**
- Monitor application performance
- Check for errors in logs

**Weekly:**
- Review match quality
- Update sample descriptions if needed
- Check database connectivity

**Monthly:**
- Archive old activity records
- Review and optimize thresholds
- Update documentation

**Quarterly:**
- Full system audit
- Database performance review
- Update dependencies if needed

### Getting Help

For technical issues:
1. Check system logs first
2. Review this user guide
3. Test with sample descriptions
4. Verify database connectivity
5. Contact development team

## Appendix

### Sample Descriptions Included

1. Aluminum tubes for industrial use
2. Chemical compounds for laboratory research
3. Electronic components and integrated circuits
4. High-precision machine tools
5. Optical equipment and laser systems
6. Nuclear reactor components
7. Ballistic protection materials
8. Encryption software and hardware
9. Unmanned aerial vehicle parts

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "No items found in database" | Query returned 0 rows | Check database has data |
| "Connection failed" | Can't reach SQL Server | Verify server and credentials |
| "Failed to add test entry" | Database write error | Check permissions |
| "No results found for Run ID" | Invalid Run ID | Verify Run ID exists |

### Keyboard Shortcuts (Streamlit)

- `Ctrl + R` - Rerun application
- `Ctrl + C` - Clear cache
- `Ctrl + K` - Show keyboard shortcuts
- `Ctrl + /` - Show command palette

---

**Version:** 1.0  
**Last Updated:** November 11, 2024  
**System:** Goods Matching System  
**Contact:** Development Team
