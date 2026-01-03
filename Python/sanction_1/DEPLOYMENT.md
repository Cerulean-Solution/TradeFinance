# Deployment Instructions - Sanctions Screening System

## 📦 Package Contents

Your sanctions screening application includes:

```
sanctions_screening/
├── app.py                    # Main Streamlit application
├── db_utils.py              # Database and logging utilities
├── matching_algorithms.py   # 10 matching techniques implementation
├── requirements.txt         # Python dependencies
├── .env                     # Environment configuration (with your credentials)
├── run.sh                   # Quick start script
├── README.md               # Comprehensive documentation
├── QUICKSTART.md           # Quick start guide
├── DEPLOYMENT.md           # This file
└── venv/                   # Virtual environment (if transferred)
```

## 🚀 Deployment to Your Environment

### Prerequisites

Your target machine needs:
- **Python 3.11+**
- **SQL Server** with ODBC Driver 17
- **Network access** to:
  - SQL Server: `desktop-eneq19v`
  - Azure OpenAI: `https://bisonai.openai.azure.com/`

### Step 1: Transfer Files

Transfer the entire `sanctions_screening` folder to your target machine:

```bash
# Example using SCP
scp -r sanctions_screening/ user@your-server:/path/to/destination/

# Or using rsync
rsync -avz sanctions_screening/ user@your-server:/path/to/destination/
```

### Step 2: Install ODBC Driver (if not already installed)

On **Windows**:
1. Download [ODBC Driver 17 for SQL Server](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
2. Run the installer
3. Verify installation in ODBC Data Source Administrator

On **Linux (Ubuntu/Debian)**:
```bash
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
sudo apt-get update
sudo ACCEPT_EULA=Y apt-get install -y msodbcsql17 unixodbc-dev
```

On **macOS**:
```bash
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
brew install msodbcsql17 mssql-tools
```

### Step 3: Install Python Dependencies

**Option A: Using the run script (Recommended)**
```bash
cd sanctions_screening
chmod +x run.sh
./run.sh
```

**Option B: Manual installation**
```bash
cd sanctions_screening

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Verify Configuration

Check the `.env` file contains your correct credentials:

```bash
# View (but don't share) the .env file
cat .env
```

Verify these settings match your environment:
- `DB_SERVER=desktop-eneq19v`
- `DB_NAME=tf_genie`
- `DB_USER=shahul`
- `AZURE_OPENAI_ENDPOINT=https://bisonai.openai.azure.com/`

### Step 5: Verify Database Setup

Ensure the `tf_sanctions` table exists:

```sql
-- Connect to SQL Server and run:
USE tf_genie;

-- Check if table exists
SELECT * FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME = 'tf_sanctions';

-- View sample data
SELECT TOP 10 * FROM tf_sanctions;
```

The application will automatically create the `tf_sanctions_activity` table on first run.

### Step 6: Run the Application

```bash
cd sanctions_screening
source venv/bin/activate  # On Windows: venv\Scripts\activate
streamlit run app.py
```

Or use the run script:
```bash
./run.sh
```

The application will start on: `http://localhost:8501`

### Step 7: Test Connectivity

1. Open the application in your browser
2. Check the sidebar "System Status" section
3. Both should show ✅:
   - Database connection
   - Azure OpenAI connection

If you see ❌ errors, check:
- Network connectivity to SQL Server
- Firewall rules allowing connections
- Credentials in `.env` file
- Azure OpenAI API key validity

## 🌐 Network Deployment Options

### Option 1: Local Network Access

To make the app accessible on your local network:

```bash
streamlit run app.py --server.address=0.0.0.0 --server.port=8501
```

Access from other machines: `http://your-machine-ip:8501`

### Option 2: Production Deployment with Nginx

1. **Install Nginx** (if not already installed)
2. **Configure Nginx** as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8501;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Run Streamlit as a service**:

Create `/etc/systemd/system/sanctions-screening.service`:

```ini
[Unit]
Description=Sanctions Screening Streamlit App
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/sanctions_screening
Environment="PATH=/path/to/sanctions_screening/venv/bin"
ExecStart=/path/to/sanctions_screening/venv/bin/streamlit run app.py --server.port=8501 --server.address=127.0.0.1
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable sanctions-screening
sudo systemctl start sanctions-screening
```

### Option 3: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Install ODBC Driver
RUN apt-get update && \
    apt-get install -y curl gnupg2 && \
    curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql17 unixodbc-dev

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8501

CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

Build and run:
```bash
docker build -t sanctions-screening .
docker run -p 8501:8501 --env-file .env sanctions-screening
```

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default credentials in `.env`
- [ ] Use environment variables instead of `.env` file in production
- [ ] Enable HTTPS/SSL for web access
- [ ] Implement authentication (Streamlit supports auth)
- [ ] Restrict network access to authorized IPs only
- [ ] Regularly backup `audit_log.txt` and database
- [ ] Set up log rotation for audit logs
- [ ] Monitor API usage and costs (Azure OpenAI)
- [ ] Implement rate limiting if needed
- [ ] Regular security updates for dependencies

### Streamlit Authentication

Add authentication to `app.py`:

```python
import streamlit as st

# Simple authentication
def check_password():
    def password_entered():
        if st.session_state["password"] == "your-secure-password":
            st.session_state["password_correct"] = True
            del st.session_state["password"]
        else:
            st.session_state["password_correct"] = False

    if "password_correct" not in st.session_state:
        st.text_input("Password", type="password", on_change=password_entered, key="password")
        return False
    elif not st.session_state["password_correct"]:
        st.text_input("Password", type="password", on_change=password_entered, key="password")
        st.error("😕 Password incorrect")
        return False
    else:
        return True

if not check_password():
    st.stop()

# Rest of your app code...
```

## 📊 Monitoring & Maintenance

### Log Files

Monitor these files regularly:
- `audit_log.txt` - All application activity
- Database `tf_sanctions_activity` table - Screening history

### Database Maintenance

Regularly check:
```sql
-- Check activity table size
SELECT COUNT(*) FROM tf_sanctions_activity;

-- Archive old records (example: older than 1 year)
SELECT * INTO tf_sanctions_activity_archive_2024
FROM tf_sanctions_activity
WHERE created_at < DATEADD(year, -1, GETDATE());

-- Clean up archived records
DELETE FROM tf_sanctions_activity
WHERE created_at < DATEADD(year, -1, GETDATE());
```

### Performance Monitoring

Monitor these metrics:
- Average screening time
- Database query performance
- Azure OpenAI API latency
- Memory usage
- Disk space (for logs)

## 🔧 Troubleshooting

### Common Issues

**Issue: "Login timeout expired"**
- Solution: Check SQL Server is running and accessible
- Increase `DB_TIMEOUT` in `.env` file

**Issue: "Azure OpenAI connection failed"**
- Solution: Verify API key and endpoint
- Check network connectivity to Azure
- Confirm deployment names are correct

**Issue: "Module not found"**
- Solution: Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

**Issue: Port 8501 already in use**
- Solution: Kill existing process or use different port
- `pkill -f streamlit` or `streamlit run app.py --server.port=8502`

## 📞 Support

For issues:
1. Check `audit_log.txt` for detailed errors
2. Review system status in the application
3. Verify all prerequisites are met
4. Test database and API connectivity separately

## 🔄 Updates & Upgrades

To update dependencies:
```bash
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

To update Streamlit:
```bash
pip install --upgrade streamlit
```

## 📝 Backup Strategy

**What to backup:**
- `.env` file (securely!)
- `audit_log.txt`
- Database `tf_sanctions_activity` table
- Any custom modifications to code

**Backup schedule:**
- Daily: `audit_log.txt`
- Weekly: Database activity table
- Monthly: Full application backup

## 🎯 Next Steps After Deployment

1. ✅ Verify connectivity to all services
2. ✅ Test with sample data
3. ✅ Add a few test entries to `tf_sanctions`
4. ✅ Run a complete screening workflow
5. ✅ Verify results are saved to database
6. ✅ Test retrieval by serial number
7. ✅ Review audit logs
8. ✅ Set up monitoring and backups
9. ✅ Train users on the system
10. ✅ Document any custom configurations

---

**Deployment Version:** 1.0  
**Last Updated:** November 2024  
**Tested On:** Ubuntu 22.04, Windows 10/11, macOS
