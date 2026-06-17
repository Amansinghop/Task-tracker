"""
Python Backend - Data Generator for OpsDash Dashboard
=====================================================
This script generates analytics and console log data.
Run it as a standalone server: python backend.py
It starts a Flask/HTTP server on port 8000 that the Next.js API routes can proxy to.

For the v0 demo, the Next.js API routes generate equivalent mock data inline.
To connect to a real Python backend, set the PYTHON_BACKEND_URL environment variable.
"""
#!/usr/bin/env python3
import json
import random
import math
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse


def generate_cpu_memory_data(points=24):
    """Generate CPU and memory usage over time."""
    data = []
    base_cpu = 45
    base_memory = 62
    now = datetime.now()
    for i in range(points):
        ts = now - timedelta(hours=points - i - 1)
        cpu = max(5, min(100, base_cpu + random.gauss(0, 12) + 10 * math.sin(i / 4)))
        memory = max(20, min(95, base_memory + random.gauss(0, 5) + 3 * math.sin(i / 6)))
        data.append({
            "time": ts.strftime("%H:%M"),
            "cpu": round(cpu, 1),
            "memory": round(memory, 1),
        })
    return data


def generate_request_data(points=24):
    """Generate HTTP request metrics over time."""
    data = []
    now = datetime.now()
    for i in range(points):
        ts = now - timedelta(hours=points - i - 1)
        success = random.randint(800, 2500)
        errors_4xx = random.randint(10, 80)
        errors_5xx = random.randint(0, 15)
        data.append({
            "time": ts.strftime("%H:%M"),
            "2xx": success,
            "4xx": errors_4xx,
            "5xx": errors_5xx,
        })
    return data


def generate_latency_data(points=24):
    """Generate response latency percentiles over time."""
    data = []
    now = datetime.now()
    for i in range(points):
        ts = now - timedelta(hours=points - i - 1)
        p50 = max(10, random.gauss(45, 10))
        p95 = p50 + random.gauss(80, 20)
        p99 = p95 + random.gauss(50, 15)
        data.append({
            "time": ts.strftime("%H:%M"),
            "p50": round(p50, 1),
            "p95": round(p95, 1),
            "p99": round(p99, 1),
        })
    return data


def generate_throughput_data(points=24):
    """Generate data transfer throughput over time."""
    data = []
    now = datetime.now()
    for i in range(points):
        ts = now - timedelta(hours=points - i - 1)
        inbound = random.gauss(120, 30)
        outbound = random.gauss(340, 60)
        data.append({
            "time": ts.strftime("%H:%M"),
            "inbound": round(max(10, inbound), 1),
            "outbound": round(max(20, outbound), 1),
        })
    return data


def generate_error_distribution():
    """Generate error type distribution for pie/bar chart."""
    return [
        {"type": "Timeout", "count": random.randint(20, 120)},
        {"type": "Bad Request", "count": random.randint(40, 200)},
        {"type": "Not Found", "count": random.randint(30, 150)},
        {"type": "Server Error", "count": random.randint(5, 50)},
        {"type": "Auth Failed", "count": random.randint(10, 80)},
        {"type": "Rate Limited", "count": random.randint(15, 90)},
    ]


def generate_console_logs(count=50, source="system"):
    """Generate realistic console log entries."""
    levels = ["INFO", "WARN", "ERROR", "DEBUG"]
    level_weights = [60, 20, 10, 10]

    messages = {
        "system": [
            "Service health check completed successfully",
            "Database connection pool refreshed (active: {n} / max: 20)",
            "Cache hit ratio: {pct}% over last 5 minutes",
            "Worker thread #{n} processing queue backlog",
            "SSL certificate renewal scheduled for next week",
            "Memory usage at {pct}% - within normal range",
            "Scheduled backup initiated for database cluster",
            "API rate limiter reset for all client tokens",
            "Load balancer routing update applied",
            "Container orchestrator scaled to {n} replicas",
            "DNS resolution latency: {ms}ms (avg last 1m)",
            "Garbage collection completed in {ms}ms",
            "Config reload triggered by environment change",
            "Outbound webhook delivery confirmed ({n} pending)",
            "Filesystem inode usage: {pct}%",
        ],
        "application": [
            "Request processed: POST /api/data ({ms}ms)",
            "User session created: uid_{hex}",
            "Payment webhook received: evt_{hex}",
            "Background job completed: job_{n} ({ms}ms)",
            "Email delivery queued: {n} recipients",
            "File upload completed: {n}MB processed",
            "Search index updated: {n} documents",
            "WebSocket connection established: conn_{hex}",
            "Batch processing: {n}/{total} records complete",
            "Authentication token refreshed for client_{hex}",
            "GraphQL query resolved in {ms}ms",
            "Image processing pipeline: {n} thumbnails generated",
            "Cron job executed: cleanup_stale_sessions",
            "Feature flag evaluated: dark_mode = enabled",
            "Audit log entry created: action=user.update",
        ],
    }

    warn_messages = [
        "High memory usage detected: {pct}% threshold exceeded",
        "Slow query detected: {ms}ms on table 'events'",
        "Connection pool nearing capacity: {n}/20 active",
        "Retry attempt {n}/3 for external API call",
        "Deprecated API endpoint accessed: /v1/legacy",
        "Disk usage warning: {pct}% on /data volume",
    ]

    error_messages = [
        "Failed to connect to upstream service: timeout after {ms}ms",
        "Unhandled exception in worker thread #{n}",
        "Database query failed: deadlock detected on row lock",
        "Memory allocation failed: OOM condition in container",
        "TLS handshake failed with peer: certificate expired",
        "Circuit breaker tripped for payment-service",
    ]

    logs = []
    now = datetime.now()
    src_messages = messages.get(source, messages["system"])

    for i in range(count):
        ts = now - timedelta(seconds=random.randint(0, 3600))
        level = random.choices(levels, weights=level_weights, k=1)[0]

        if level == "WARN":
            msg = random.choice(warn_messages)
        elif level == "ERROR":
            msg = random.choice(error_messages)
        else:
            msg = random.choice(src_messages)

        msg = msg.replace("{n}", str(random.randint(1, 100)))
        msg = msg.replace("{pct}", str(random.randint(30, 95)))
        msg = msg.replace("{ms}", str(random.randint(5, 2000)))
        msg = msg.replace("{hex}", format(random.randint(0, 0xFFFFFF), "06x"))
        msg = msg.replace("{total}", str(random.randint(100, 5000)))

        logs.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "level": level,
            "message": msg,
            "source": source,
        })

    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return logs


class DashboardHandler(BaseHTTPRequestHandler):
    """HTTP handler for the Python backend server."""

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        routes = {
            "/api/analytics/cpu-memory": lambda: generate_cpu_memory_data(),
            "/api/analytics/requests": lambda: generate_request_data(),
            "/api/analytics/latency": lambda: generate_latency_data(),
            "/api/analytics/throughput": lambda: generate_throughput_data(),
            "/api/analytics/errors": lambda: generate_error_distribution(),
            "/api/console/system": lambda: generate_console_logs(50, "system"),
            "/api/console/application": lambda: generate_console_logs(50, "application"),
        }

        if path in routes:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            data = routes[path]()
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not found")

    def log_message(self, format, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")


if __name__ == "__main__":
    port = 8000
    server = HTTPServer(("0.0.0.0", port), DashboardHandler)
    print(f"Python backend running on http://localhost:{port}")
    print("Endpoints:")
    print("  GET /api/analytics/cpu-memory")
    print("  GET /api/analytics/requests")
    print("  GET /api/analytics/latency")
    print("  GET /api/analytics/throughput")
    print("  GET /api/analytics/errors")
    print("  GET /api/console/system")
    print("  GET /api/console/application")
    server.serve_forever()
