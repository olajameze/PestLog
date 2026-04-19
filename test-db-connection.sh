#!/bin/bash
# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is set"

# Extract host from connection string
HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "📍 Connecting to: $HOST:$PORT"

# Test connection with timeout
timeout 5 psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
  echo ""
  echo "Troubleshooting steps:"
  echo "1. Verify DATABASE_URL is set correctly in Vercel dashboard"
  echo "2. Check if Supabase database is running"
  echo "3. Verify firewall rules allow connections from Vercel IP ranges"
  echo "4. Check Supabase dashboard for any service disruptions"
  exit 1
fi
