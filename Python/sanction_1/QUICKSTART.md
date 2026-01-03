# Quick Start Guide - Sanctions Screening System

## 🚀 Getting Started

### Option 1: Using the Run Script (Recommended)

```bash
cd /home/ubuntu/sanctions_screening
./run.sh
```

### Option 2: Manual Start

```bash
cd /home/ubuntu/sanctions_screening
source venv/bin/activate
streamlit run app.py
```

The application will be available at: `http://localhost:8501`

## 📋 First Time Setup Checklist

1. ✅ Verify `.env` file contains correct credentials
2. ✅ Ensure SQL Server is accessible from your network
3. ✅ Confirm `tf_sanctions` table exists in `tf_genie` database
4. ✅ Test Azure OpenAI connectivity

## 🎯 How to Use

### Basic Screening Workflow

1. **Open the Application**
   - Navigate to `http://localhost:8501` in your browser

2. **Check System Status**
   - Look at the left sidebar for connectivity status
   - Should show ✅ for both Database and Azure OpenAI

3. **Select a Sample (Optional)**
   - Use the dropdown to choose a pre-configured sample
   - Or enter your own name and address

4. **Enter Details**
   - **Name**: Required field for the entity to screen
   - **Address**: Optional field for additional matching

5. **Run Screening**
   - Click "🔍 Screen Against Sanctions List"
   - Wait for the matching process to complete

6. **Review Results**
   - Results are displayed in a sortable grid
   - Each match shows:
     - Sanctioned entity details (ID, Name, Country, Source)
     - Number of matching techniques
     - Maximum confidence score
     - List of techniques that matched

7. **Save Serial Number**
   - Each screening gets a unique serial number (e.g., `SCR-20241111-143025-a1b2c3d4`)
   - Use this to retrieve results later

### Adding Test Data

1. Click "➕ Add Sanction Entry" in the sidebar
2. Enter:
   - Name (required)
   - Country (required)
   - Source (optional, defaults to "Manual Entry")
3. Click "Add Entry"
4. Confirmation message will appear

### Retrieving Past Screenings

1. Click "📋 Retrieve Past Screening" in the sidebar
2. Enter the serial number from a previous screening
3. Click "Retrieve"
4. Results will be displayed in JSON format

## 🔬 Understanding the 10 Matching Techniques

### Quick Reference

| # | Technique | What It Does | Best For |
|---|-----------|--------------|----------|
| 1️⃣ | Exact Match | Case-sensitive exact comparison | Identical entries |
| 2️⃣ | Case-Insensitive | Ignores case and whitespace | Minor formatting differences |
| 3️⃣ | Fuzzy Similarity | Levenshtein distance (0-100) | Typos and minor variations |
| 4️⃣ | Token Set/Sort | Handles word order changes | Reordered names |
| 5️⃣ | Phonetic | Sound-alike matching (Metaphone) | Different spellings, same sound |
| 6️⃣ | N-Gram Jaccard | Character overlap analysis | Partial matches |
| 7️⃣ | Address Normalization | Abbreviation handling | Street, Blvd, Ave variations |
| 8️⃣ | Geospatial | Location proximity | Same physical location |
| 9️⃣ | ML Composite | Weighted combination | Overall confidence |
| 🔟 | Semantic LLM | AI contextual understanding | Complex variations |

### Example Matches

**Input:** "John Smith"

- **Exact Match**: "John Smith" ✅
- **Case-Insensitive**: "john smith", "JOHN SMITH" ✅
- **Fuzzy**: "Jon Smith", "John Smyth" ✅ (if score > 80)
- **Token Set**: "Smith John", "Smith, John" ✅
- **Phonetic**: "Jon Smythe" ✅ (sounds similar)
- **Semantic LLM**: "J. Smith", "John A. Smith" ✅ (contextually same)

## 📊 Interpreting Results

### Match Count
- **High (7-10 matches)**: Very strong match, likely the same entity
- **Medium (4-6 matches)**: Moderate match, requires review
- **Low (1-3 matches)**: Weak match, may be coincidental

### Max Score
- **90-100%**: Extremely high confidence
- **70-89%**: High confidence
- **50-69%**: Moderate confidence
- **Below 50%**: Low confidence

### No Matches
- ✅ **Clear Screening**: No sanctions records matched
- Safe to proceed with the entity

## 🔍 System Logs

The application maintains detailed logs in `audit_log.txt`:

- **[INFO]**: General system information
- **[SQL]**: Database queries and operations
- **[ACTIVITY]**: User actions and screenings
- **[ERROR]**: Errors and exceptions

View recent logs at the bottom of the application interface.

## ⚠️ Troubleshooting

### "Database connection failed"
- Check if SQL Server is running
- Verify credentials in `.env` file
- Ensure network connectivity to database server
- Confirm ODBC Driver 17 is installed

### "Azure OpenAI connection failed"
- Verify API key is correct
- Check endpoint URL
- Ensure deployment names match your Azure setup
- Confirm API quota is not exceeded

### "No sanctions records found"
- Verify `tf_sanctions` table exists
- Check if table has data
- Confirm database name is correct (`tf_genie`)

### Application won't start
- Ensure port 8501 is not in use
- Check if virtual environment is activated
- Verify all dependencies are installed
- Review error messages in terminal

## 💡 Tips & Best Practices

1. **Use Sample Data First**: Test with provided samples before real data
2. **Save Serial Numbers**: Keep track of important screenings
3. **Review Multiple Techniques**: Don't rely on a single matching method
4. **Check System Logs**: Monitor for errors or unusual activity
5. **Regular Testing**: Add test entries to verify system is working
6. **Backup Results**: Export or save important screening results

## 🔐 Security Reminders

- Never share the `.env` file
- Keep audit logs secure (may contain sensitive data)
- Use secure connections to database
- Regularly review access logs
- Follow your organization's data handling policies

## 📞 Need Help?

1. Check `audit_log.txt` for detailed error messages
2. Review the full README.md for comprehensive documentation
3. Verify all prerequisites are met
4. Test connectivity using the system status panel

## 🎓 Advanced Usage

### Batch Processing (Future)
Currently, the system processes one name at a time. For batch processing:
1. Create a list of names
2. Screen each individually
3. Collect serial numbers
4. Retrieve all results using serial numbers

### Custom Thresholds
To adjust matching sensitivity, modify thresholds in `matching_algorithms.py`:
- `fuzzy_similarity`: Default 80
- `token_set_match`: Default 80
- `ngram_jaccard_similarity`: Default 0.5
- `ml_composite_score`: Default 0.7

### Performance Optimization
For large sanctions lists:
- Consider implementing caching
- Use database indexing on name fields
- Limit LLM calls for initial screening
- Run LLM only on high-confidence matches

---

**Version:** 1.0  
**Last Updated:** November 2024  
**Platform:** Streamlit + Python 3.11 + SQL Server + Azure OpenAI
