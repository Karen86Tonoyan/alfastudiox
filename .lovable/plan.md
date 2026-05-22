# Rozproszony klaster ComfyUI (Master → Workers)

Cel: dodać możliwość łączenia wielu komputerów z ComfyUI w jeden klaster. Główny komputer (Admin/Master) przyjmuje zadania, monitoruje obciążenie i — gdy nie wyrabia (VRAM/queue/temperatura) — deleguje zadania do wybranego workera.

## Co powstanie w UI

Nowa strona **Cluster** (`/cluster`) + sekcja w istniejącym `OrchestratorPanel`:

1. **Lista nodów** (karty komputerów)
   - Pola edytowalne: `name`, `url` (np. `192.168.1.10:8188`), `role` (`master` | `worker`), `priority` (1–10), `maxVramGB`, `tags` (np. `flux`, `wan`, `upscale`), `enabled`.
   - Status live: connected / offline, VRAM used/total, temp GPU, queue size, aktualny node ComfyUI, ostatni błąd.
   - Akcje: Test connection, Ustaw jako Master, Wstrzymaj, Usuń, Wyślij testowy prompt.

2. **Reguły delegacji** (panel Admina)
   - Próg auto-delegacji: VRAM > X%, temp > Y°C, queue > N, czas oczekiwania > T s.
   - Strategia wyboru workera: `least-loaded` | `priority` | `tag-match` | `round-robin`.
   - Fallback chain (kolejność zapasowych komputerów).
   - Toggle „Auto-delegate" + „Mirror outputs to master".

3. **Widok kolejki rozproszonej**
   - Każde zadanie pokazuje, na którym nodzie się wykonuje, postęp, ETA, możliwość ręcznego przerzucenia na inny komputer (drag-and-drop między kolumnami nodów — Kanban).

4. **Topologia**
   - Prosty diagram: Master w środku, workery wokół, animowane linie przepływu przy aktywnej delegacji (zgodnie z istniejącym stylem SVG animations).

## Sekcja techniczna

### Model danych (localStorage `alfa_cluster_nodes`, migracja v2)
```ts
type ClusterNode = {
  id: string; name: string; url: string;
  role: "master" | "worker";
  priority: number; maxVramGB: number;
  tags: string[]; enabled: boolean;
  // runtime (nie zapisywane):
  status?: "connected"|"offline"|"busy"|"error";
  vramUsed?: number; gpuTemp?: number; queueSize?: number;
};
type ClusterPolicy = {
  autoDelegate: boolean;
  thresholds: { vramPct: number; tempC: number; queueLen: number; waitSec: number };
  strategy: "least-loaded"|"priority"|"tag-match"|"round-robin";
  mirrorOutputs: boolean;
};
```

### Nowe pliki
- `src/lib/clusterManager.ts` — singleton zarządzający pulą nodów; opakowuje wiele instancji `ComfyApi` (refaktor `comfyApi.ts` na klasę z parametrem `baseUrl`, zamiast singletonu). Metody: `addNode`, `removeNode`, `pickWorker(job)`, `dispatch(workflow)`, `pollAll()`, event emitter.
- `src/hooks/useCluster.ts` — React hook zwracający `nodes`, `policy`, `dispatch`, akcje CRUD.
- `src/pages/ClusterPage.tsx` — UI strony.
- `src/components/cluster/NodeCard.tsx`, `NodeFormDialog.tsx`, `DelegationRules.tsx`, `ClusterTopology.tsx`, `DistributedQueue.tsx`.

### Refaktor istniejących
- `src/lib/comfyApi.ts` — wyciągnąć klasę `ComfyApi(baseUrl)` z osobnym WS per instancja; zachować eksport `comfyApi` (master) jako wrapper, żeby reszta aplikacji działała bez zmian.
- `src/hooks/useComfyUI.ts` — akceptuje opcjonalne `nodeId`, by jedna karta nodu mogła subskrybować swój własny ComfyApi.
- `src/components/workflow/OrchestratorPanel.tsx` — dodać sekcję „Cluster" pokazującą skrót (liczba aktywnych workerów, łączny VRAM, auto-delegacja on/off).
- `src/components/layout/AppSidebar.tsx` (jeśli istnieje) — link do `/cluster`.
- `src/App.tsx` — route `/cluster`.
- `src/lib/localStorageMigrations.ts` — migracja v2: stary `comfyApi.baseUrl` → wpis Master w `alfa_cluster_nodes`.

### Logika delegacji
1. `queuePrompt(workflow)` w `clusterManager`:
   - Master sprawdza swoje metryki (`getSystemStats`) vs progi.
   - Jeśli OK → wysyła na Master.
   - Jeśli przekroczone → `pickWorker(job)` wg strategii (filtr: `enabled`, `connected`, VRAM wolny ≥ wymagany, dopasowane tagi).
   - Brak workera → fallback chain → ostatecznie kolejkuje na Masterze z ostrzeżeniem toast.
2. Polling każdego nodu co 5 s (jak istniejący `getSystemStats`), ale per ComfyApi.
3. Wynik renderu pobierany z URL nodu wykonującego; opcjonalne kopiowanie pliku do Mastera (`mirrorOutputs`) — fetch + re-upload do `/upload/image` Mastera.

### RBAC
- Zarządzanie klastrem (dodawanie/edycja nodów, zmiana polityki) tylko dla `admin` (`useUserRole().isAdmin`). Worker/Pause dla `moderator`. Zwykły user — tylko podgląd.

### Sieć / ograniczenia
- Wszystko po HTTP/WebSocket lokalnie (LAN). W cloud preview wymaga ngrok per node (zgodne z istniejącym `secure-tunnel-adapter`) — auto-detekcja `https→wss`.
- Brak własnego backendu; cała koordynacja w przeglądarce Mastera (zgodne z zasadą local-only).

## Co zostawiamy poza zakresem (na później)
- Dystrybuowane modele (sync checkpointów między nodami).
- Renderowanie jednego promptu „split" na kilka GPU (tile-based) — wymaga custom node po stronie ComfyUI.
- Synchronizacja między różnymi sesjami przeglądarki (na razie stan klastra trzymany lokalnie na Masterze).

Po akceptacji wdrożę w kolejności: refaktor `comfyApi` → `clusterManager` + hook → strona `Cluster` + karty nodów → reguły delegacji → integracja z `OrchestratorPanel` i routingiem.
