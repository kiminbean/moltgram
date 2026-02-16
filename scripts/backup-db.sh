#!/bin/bash

# MoltGram Database Backup Script
# Usage: ./scripts/backup-db.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS=${RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/moltgram_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "🦞 Starting MoltGram database backup..."
echo "⏰ Timestamp: ${TIMESTAMP}"

# Check if we're using Turso or local SQLite
if [ -n "${TURSO_DATABASE_URL}" ] && [ -n "${TURSO_AUTH_TOKEN}" ]; then
    echo "📦 Using Turso database..."
    
    # Extract database name from URL
    DB_NAME=$(echo "${TURSO_DATABASE_URL}" | sed 's/libsql:\/\///' | sed 's/\.turso\.io//')
    
    # Export database dump using Turso CLI (requires turso CLI installed)
    if command -v turso &> /dev/null; then
        echo "💾 Dumping database: ${DB_NAME}"
        turso db shell "${DB_NAME}" --location aws-ap-northeast-1 ".dump" > "${BACKUP_FILE}" 2>/dev/null || {
            echo "❌ Turso dump failed, trying alternative method..."
            # Alternative: Use libsql client if available
            echo "⚠️  Note: Turso database backups require the Turso CLI or manual setup"
            echo "📝 For automated Turso backups, configure in Turso dashboard:"
            echo "   https://turso.tech/dashboard"
            exit 1
        }
    else
        echo "❌ Turso CLI not found"
        echo "📦 Install with: brew install tursodatabase/tap/turso"
        echo "📝 Or configure automated backups in Turso dashboard"
        exit 1
    fi
else
    echo "📦 Using local SQLite database..."
    
    # Check for local database files
    if [ -f "./moltgram.db" ]; then
        echo "💾 Copying database file..."
        cp ./moltgram.db "${BACKUP_DIR}/moltgram_backup_${TIMESTAMP}.db"
        BACKUP_FILE="${BACKUP_DIR}/moltgram_backup_${TIMESTAMP}.db"
    else
        echo "❌ Database file not found: ./moltgram.db"
        exit 1
    fi
fi

# Compress backup
if [ -f "${BACKUP_FILE}" ]; then
    echo "🗜️  Compressing backup..."
    gzip "${BACKUP_FILE}"
    echo "✅ Backup created: ${COMPRESSED_FILE}"
    
    # Get file size
    SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
    echo "📊 Size: ${SIZE}"
else
    echo "⚠️  Backup file not created, skipping compression"
    exit 1
fi

# Clean up old backups
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "moltgram_backup_*" -mtime +${RETENTION_DAYS} -delete

# List current backups
echo ""
echo "📋 Current backups:"
ls -lh "${BACKUP_DIR}" | grep moltgram_backup | tail -5

echo ""
echo "✅ Backup completed successfully!"
