# ALFA System Map

## Core separation

This project is intentionally split into distinct responsibility layers.

```text
ALFA Cluster Studio
  -> local operator, workflow routing, node health, queue, snapshots

ALFA Cloud Bridge
  -> cloud infrastructure, backup, storage, remote deploy, sync

ALFA Guard Trinity
  -> security evidence, execution gates, anti-malware, audit chain

exo-explore/exo
  -> experimental distributed AI runtime backend

Exoscale
  -> cloud provider / infrastructure backend
```

## Responsibility table

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `ALFA Cluster Studio` | Local-first operator system | ComfyUI cluster, job queue, node snapshots, control center |
| `ALFA Cloud Bridge` | Optional infrastructure and sync layer | remote nodes, storage, cloud snapshots, backup, remote deploy |
| `ALFA Guard Trinity` | Security and evidence chain | Cerber, Guardian, anti-malware gate, audit |
| `exo-explore/exo` | Distributed inference runtime | multi-device model execution, OpenAI-compatible endpoint |
| `Exoscale` | Cloud provider | VMs, Kubernetes, block storage, API, secrets |

## Important naming boundary

Do not mix these:

```text
Exoscale = cloud provider
exo-explore/exo = AI runtime experiment
```

`Exoscale` can become a backend for `ALFA Cloud Bridge`, but it does not replace
the runtime contracts, `JobProvider`, or the local-first control plane.

## Practical deployment model

```text
LOCAL FIRST
  app boots from local state
  queue runs locally
  node health collects locally

CLOUD OPTIONAL
  snapshots sync to cloud
  backups and storage live in cloud
  remote view is additive, never blocking

SECURITY ALWAYS EXPLICIT
  malware scanning and guard evidence stay in the decision chain
```
