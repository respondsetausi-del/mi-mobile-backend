#!/bin/bash

# Keep-Alive Service for MI Mobile Indicator Backend
# This script pings the backend API every 5 minutes to prevent the preview environment from sleeping

LOG_FILE="/app/keep_alive.log"
BACKEND_URL="http://localhost:8001/api/health"
PING_INTERVAL=300  # 5 minutes in seconds

echo "===================================" >> $LOG_FILE
echo "Keep-Alive Service Started: $(date)" >> $LOG_FILE
echo "Backend URL: $BACKEND_URL" >> $LOG_FILE
echo "Ping Interval: ${PING_INTERVAL}s (5 minutes)" >> $LOG_FILE
echo "===================================" >> $LOG_FILE

# Function to ping the backend
ping_backend() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Make HTTP request to health endpoint
    response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Log the result
    if [ "$http_code" = "200" ]; then
        echo "[$timestamp] ✓ Ping successful (HTTP $http_code)" >> $LOG_FILE
    else
        echo "[$timestamp] ✗ Ping failed (HTTP $http_code) - Response: $body" >> $LOG_FILE
    fi
}

# Main loop - ping backend every 5 minutes
while true; do
    ping_backend
    sleep $PING_INTERVAL
done
