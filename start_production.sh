#!/bin/bash
cd /app/backend
source /root/.venv/bin/activate
exec uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4 --no-access-log
