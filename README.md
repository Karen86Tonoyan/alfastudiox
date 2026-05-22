# ALFA Cluster Studio

`ALFA Cluster Studio` is a local-first operator system for:

- ComfyUI orchestration
- workflow routing
- node health and snapshots
- queue processing
- optional cloud sync

## Architecture

The project is split on purpose:

- `ALFA Cluster Studio`
  local operator mode, queue, snapshots, workflows, node control
- `ALFA Cloud Bridge`
  optional cloud sync, backup, remote deploy, storage, remote nodes
- `ALFA Guard Trinity`
  security evidence, anti-malware gate, audit chain
- `exo-explore/exo`
  experimental distributed AI runtime backend
- `Exoscale`
  cloud provider and infrastructure backend

Reference:

- [ALFA_SYSTEM_MAP](docs/ALFA_SYSTEM_MAP.md)

## Local-first boot

The app is designed so that:

- local state boots first
- cloud never blocks startup
- queue and snapshots survive restart
- cloud sync is additive, not mandatory

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
