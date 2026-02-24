"""
PPLNS Node HTTP API
====================
Lightweight HTTP server to expose miner data from the PPLNS Stratum node.
Deploy alongside stratum_pplns_server.py on the PPLNS server.

Usage:
    python3 pplns_http_api.py

Runs on port 8080 by default. Reads miner data from the shared MongoDB.
The main BricsCoin backend queries this API to aggregate miners across all P2Pool nodes.
"""
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "bricscoin")
API_PORT = int(os.environ.get("PPLNS_API_PORT", "8080"))
NODE_ID = os.environ.get("NODE_ID", "pplns-node")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]


class PPLNSHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/status":
            self._handle_status()
        elif self.path == "/miners":
            self._handle_miners()
        elif self.path == "/shares":
            self._handle_shares()
        else:
            self._respond(404, {"error": "not found"})

    def _handle_status(self):
        active = db.pplns_miners.count_documents({"online": True})
        self._respond(200, {
            "status": "ok",
            "node_id": NODE_ID,
            "active_miners": active,
        })

    def _handle_miners(self):
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        miners_docs = list(db.pplns_miners.find(
            {"online": True, "last_seen": {"$gte": cutoff}},
            {"_id": 0}
        ))
        miners = []
        for doc in miners_docs:
            miners.append({
                "worker": doc.get("worker", "unknown"),
                "online": True,
                "last_seen": doc.get("last_seen"),
                "shares_1h": doc.get("shares_1h", 0),
                "shares_24h": doc.get("shares_24h", 0),
                "blocks_found": doc.get("blocks_found", 0),
                "hashrate": doc.get("hashrate", 0),
                "hashrate_readable": doc.get("hashrate_readable", "0 H/s"),
                "node": NODE_ID,
                "pool_mode": "pplns",
            })
        self._respond(200, {"miners": miners, "active_count": len(miners)})

    def _handle_shares(self):
        """Expose share counts for aggregation by the main node."""
        now = datetime.now(timezone.utc)
        hr_cutoff = (now - timedelta(hours=1)).isoformat()
        day_cutoff = (now - timedelta(hours=24)).isoformat()
        shares_1h = db.pplns_shares.count_documents({"timestamp": {"$gte": hr_cutoff}})
        shares_24h = db.pplns_shares.count_documents({"timestamp": {"$gte": day_cutoff}})
        self._respond(200, {"shares_1h": shares_1h, "shares_24h": shares_24h, "node_id": NODE_ID})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass  # Suppress default logging


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", API_PORT), PPLNSHandler)
    print(f"PPLNS HTTP API running on port {API_PORT}")
    server.serve_forever()
