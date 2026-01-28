#!/bin/bash
# Avvia stratum server in background
python stratum_server.py &

# Avvia API server
uvicorn server:app --host 0.0.0.0 --port 8001
