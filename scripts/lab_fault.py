"""Operator-only local test fault injection. Never part of the agent tool registry."""

import argparse
from pathlib import Path

import httpx
from dotenv import dotenv_values

parser = argparse.ArgumentParser()
parser.add_argument("fault", choices=["http500", "none"])
args = parser.parse_args()
env = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
response = httpx.post(
    "http://127.0.0.1:8100/admin/fault",
    json={"fault": args.fault},
    headers={"Authorization": "Bearer " + env["LAB_TOKEN"]},
    timeout=5,
    trust_env=False,
)
response.raise_for_status()
print("Local lab fault set to " + args.fault)
