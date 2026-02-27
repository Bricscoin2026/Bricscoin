"""
BricsCoin Load Test - Stabilization Phase
Tests critical API endpoints under concurrent load.
"""
from locust import HttpUser, task, between


class BricsCoinUser(HttpUser):
    wait_time = between(0.1, 0.5)

    @task(5)
    def get_network_stats(self):
        self.client.get("/api/network/stats", name="/api/network/stats")

    @task(3)
    def get_pqc_stats(self):
        self.client.get("/api/pqc/stats", name="/api/pqc/stats")

    @task(3)
    def get_blocks(self):
        self.client.get("/api/blocks?limit=10", name="/api/blocks")

    @task(2)
    def get_transactions(self):
        self.client.get("/api/transactions?limit=10", name="/api/transactions")

    @task(2)
    def get_dandelion_status(self):
        self.client.get("/api/dandelion/status", name="/api/dandelion/status")

    @task(1)
    def get_tokenomics(self):
        self.client.get("/api/tokenomics", name="/api/tokenomics")

    @task(1)
    def get_root(self):
        self.client.get("/api/", name="/api/")
