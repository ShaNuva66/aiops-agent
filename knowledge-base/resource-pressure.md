# CPU memory and disk pressure

The deterministic cpu, memory and disk thresholds are 90 percent. These observations
have different scopes: process CPU, Linux VM-visible memory and container filesystem disk.
They are not Windows host measurements and do not prove a database failure's root cause.

Check sustained pressure and service logs. No automated stress or disk-fill command is
provided. Use simulation-labelled monitoring events to test threshold incident logic
without exhausting the developer computer. A simulation must never close a real incident.
