# Installation Guide - Sanctions Screening Application

## Quick Fix for "No module named 'rapidfuzz'" Error

If you're seeing the error `ModuleNotFoundError: No module named 'rapidfuzz'`, follow these steps:

---

## Option 1: Automatic Installation (Recommended)

### For Windows:
1. Open Command Prompt or PowerShell
2. Navigate to the sanctions_screening folder:
   ```cmd
   cd path\to\sanctions_screening
   ```
3. Run the installation script:
   ```cmd
   install_dependencies.bat
   ```
4. Wait for installation to complete
5. Run the application:
   ```cmd
   venv\Scripts\activate
   streamlit run app.py
   ```

### For Linux/Mac:
1. Open Terminal
2. Navigate to the sanctions_screening folder:
   ```bash
   cd path/to/sanctions_screening
   ```
3. Run the installation script:
   ```bash
   ./install_dependencies.sh
   ```
4. Wait for installation to complete
5. Run the application:
   ```bash
   source venv/bin/activate
   streamlit run app.py
   ```

---

## Option 2: Manual Installation

### Step 1: Create Virtual Environment

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 2: Upgrade pip

```bash
python -m pip install --upgrade pip
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- streamlit==1.31.0
- python-dotenv==1.0.0
- pyodbc==5.0.1
- pandas==2.2.0
- **rapidfuzz==3.14.3** ← This fixes the error!
- phonetics==1.0.5
- openai==1.12.0

### Step 4: Install ODBC Driver (Windows)

Download and install **ODBC Driver 17 for SQL Server**:
https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server

### Step 5: Run the Application

```bash
streamlit run app.py
```

---

## Option 3: Install Only RapidFuzz

If you already have other dependencies installed and just need rapidfuzz:

```bash
pip install rapidfuzz==3.14.3
```

---

## Troubleshooting

### Error: "pip is not recognized"

**Solution:** Make sure Python is in your PATH, or use:
```bash
python -m pip install rapidfuzz
```

### Error: "python is not recognized"

**Solution:** 
1. Install Python 3.11 or higher from https://www.python.org/downloads/
2. During installation, check "Add Python to PATH"

### Error: "Permission denied"

**Linux/Mac Solution:**
```bash
chmod +x install_dependencies.sh
./install_dependencies.sh
```

**Windows Solution:** Run Command Prompt as Administrator

### Error: "Cannot connect to database"

**Expected!** This error is normal if you're running the application outside your network where the SQL Server is located. The database connection will work when you run it on your local machine.

---

## Verifying Installation

After installation, verify rapidfuzz is installed:

```bash
python -c "import rapidfuzz; print(rapidfuzz.__version__)"
```

You should see: `3.14.3`

---

## Running the Application

### First Time:

1. **Activate virtual environment:**
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`

2. **Run the application:**
   ```bash
   streamlit run app.py
   ```

3. **Access in browser:**
   - Open: http://localhost:8501

### Subsequent Runs:

Just activate the virtual environment and run streamlit:
```bash
# Windows
venv\Scripts\activate
streamlit run app.py

# Linux/Mac
source venv/bin/activate
streamlit run app.py
```

---

## Database Setup

Before using the application, create the database table:

### Using sqlcmd:
```bash
sqlcmd -S desktop-eneq19v -d tf_genie -U shahul -P "Apple123!@#" -i create_activity_table.sql
```

### Using SQL Server Management Studio:
1. Connect to: desktop-eneq19v
2. Select database: tf_genie
3. Open file: create_activity_table.sql
4. Execute (F5)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pip install -r requirements.txt` | Install all dependencies |
| `pip install rapidfuzz` | Install only rapidfuzz |
| `streamlit run app.py` | Run the application |
| `venv\Scripts\activate` | Activate venv (Windows) |
| `source venv/bin/activate` | Activate venv (Linux/Mac) |
| `deactivate` | Deactivate virtual environment |

---

## System Requirements

- **Python:** 3.11 or higher
- **OS:** Windows 10/11, Linux, macOS
- **RAM:** 4GB minimum, 8GB recommended
- **Disk Space:** 500MB for dependencies
- **SQL Server:** ODBC Driver 17 required

---

## Support

If you encounter any issues:

1. Check that Python 3.11+ is installed
2. Verify virtual environment is activated
3. Ensure all dependencies are installed: `pip list`
4. Check the audit_log.txt file for errors
5. Verify database connection settings in .env file

---

**Last Updated:** November 11, 2025  
**Version:** 1.5  
**Dependencies:** rapidfuzz (not fuzzywuzzy!)
