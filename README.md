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

## Krita Integration (local "Photoshop" bridge for AI workflows)

The internal layer editor (ala-Photoshop) + AI generator (ComfyUI) can seamlessly use local Krita for advanced editing.

- From editor: "AI Edit" tools or "🎨 Krita" button exports layered PSD + calls backend /desktop/krita/open.
- Backend saves to ~/ALFA/krita-bridge/ and launches your local Krita (supports source build from C:/Users/PC/Projects/krita via KRITA_PATH env or auto-detect in candidates).
- On Krita side: dedicated plugin (added to Krita source at plugins/python/alfa_studio_bridge/) :
  - Menu: ALFA > Import from Bridge (auto-watches dir, imports new PSDs as docs).
  - Menu: ALFA > Export Current Doc to ALFA (saves PSD back to bridge for generator or editor).
- History: editor now fully logs blends, removals (wywalenia), opacity etc. to local undo/redo history + sends to brain server (/memory with tags "blend"/"removal") for audit/sync.
- Free/local: In LOCAL_OPERATOR_MODE, everything (editor AI + Krita bridge + local Comfy generator) is free. You pay only for your hardware. Cloud credits optional for convenience.

See Krita source for the plugin (build Krita to include it). Use MCP tools (github for Krita/al fastudiox contribs, knowledge for integration notes) and other conveniences (brain backend, editor engine, Comfy queue/upload) for further development.

To test: generate in studio -> gallery or editor -> Krita button -> edit in Krita (plugin helps) -> export back -> continue with AI.
