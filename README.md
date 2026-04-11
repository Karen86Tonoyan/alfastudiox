# AlfaStudioX 🎬✨

**Profesjonalne studio kreatywne AI** — generuj obrazy, wideo i całe filmy z jednego prompta. Łączy lokalne renderowanie przez ComfyUI z dostępem do wiodących chmurowych API (OpenAI, Google, Replicate i inne).

---

## 🔑 Kluczowa technologia: Podział modelu 120B na kartę RTX 5070 Ti

> **TL;DR:** Dzięki podziałowi modelu 120 miliardów parametrów na **3 osobne fragmenty (shardy)**, możliwe jest uruchomienie go na **jednej karcie RTX 5070 Ti (16 GB VRAM)** bez potrzeby posiadania farmy GPU ani serwerów chmurowych.

### Jak to działa?

Model 120B w pełnej precyzji FP16 zajmuje ~240 GB pamięci — daleko poza możliwościami pojedynczej karty konsumenckiej. AlfaStudioX implementuje podejście **3-częściowego shardingu**, które rozwiązuje ten problem:

| Shard | Warstwy modelu | Rozmiar (Q4_K_M) | Gdzie ładowany |
|-------|---------------|-----------------|----------------|
| **Część 1** | Warstwy wejściowe + embedding + pierwsze N bloków transformera | ~18–20 GB | VRAM (GPU) |
| **Część 2** | Środkowe bloki transformera | ~18–20 GB | RAM systemowy + offload GPU |
| **Część 3** | Ostatnie bloki transformera + głowica wyjściowa | ~18–20 GB | RAM systemowy + offload GPU |

**Sekwencja działania:**
1. **Załaduj Shard 1** → przetwórz dane → wynik pośredni zapisz na dysk/RAM
2. **Zwolnij Shard 1** z VRAM → **załaduj Shard 2** → kontynuuj przetwarzanie
3. **Zwolnij Shard 2** → **załaduj Shard 3** → wygeneruj finalny output

> ⚡ Dzięki agresywnej kwantyzacji **Q4_K_M** (lub Q5_K_M dla wyższej jakości) każdy shard waży ~18–22 GB na dysku, ale zajmuje jedynie **~12–14 GB VRAM** podczas działania — co mieści się w 16 GB pamięci karty 5070 Ti.

### Wymagania sprzętowe

```
GPU:  NVIDIA RTX 5070 Ti (16 GB VRAM) lub więcej
RAM:  64 GB DDR5 (zalecane 96 GB)
Dysk: NVMe SSD, min. 120 GB wolnego miejsca (na 3 shardy)
CPU:  Ryzen 7 / Core i7 12. gen lub nowszy
```

### Przygotowanie plików modelu (przykład dla llama.cpp / GGUF)

```bash
# 1. Pobierz model w formacie GGUF (np. z Hugging Face)
huggingface-cli download <model-repo> --local-dir ./models/120b/

# 2. Podziel plik na 3 shardy po ~20 GB
llama-split --model ./models/120b/model.gguf \
            --split-max-size 20G \
            --output ./models/120b/shards/part

# Wynik: part-00001.gguf, part-00002.gguf, part-00003.gguf

# 3. Uruchom serwer ComfyUI lub llama.cpp z plikami shardów
./server --model ./models/120b/shards/part-00001.gguf \
         --n-gpu-layers 999 \
         --split-mode row \
         --tensor-split 1,0,0
```

### Konfiguracja w AlfaStudioX

W panelu **Providers** wprowadź adres lokalnego serwera (domyślnie `http://localhost:8080`) i wybierz załadowany model. Aplikacja automatycznie wykryje parametry GPU i dostępną pamięć VRAM.

---

## 🚀 Funkcjonalności

| Moduł | Opis |
|-------|------|
| **Photo Studio** | Generuj sesje zdjęciowe AI — miejsce + modelka + produkt → ComfyUI |
| **Render** | Renderowanie obrazów i wideo (lokalne ComfyUI lub chmura) |
| **Movie Pipeline** | Jeden prompt → pełny film z storyboardem, scenami i napisami |
| **Workflow** | Wizualny edytor przepływów ComfyUI z węzłami AI |
| **Models** | Zarządzanie modelami: Checkpoint, LoRA, VAE, ControlNet |
| **Orchestrator** | Wieloagentowa orkiestracja zadań AI |
| **Automation** | Automatyczne pipeline'y i harmonogramowanie renderów |
| **Providers** | Integracja z OpenAI, Google, Replicate, HuggingFace i innymi |
| **Gallery** | Biblioteka wygenerowanych obrazów i wideo |
| **TIP Auditor** | Audyt transparentności AI (watermark, metadane, znakowanie) |

---

## 🛠️ Stack technologiczny

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS + Radix UI
- **Backend:** Supabase (auth, baza danych, edge functions)
- **Renderowanie lokalne:** ComfyUI (WebSocket API)
- **Renderowanie chmurowe:** OpenAI DALL·E, Google Imagen, Replicate, HuggingFace
- **Stan aplikacji:** TanStack React Query

---

## ⚙️ Instalacja i uruchomienie

### Wymagania wstępne
- Node.js 18+ oraz npm / bun
- (opcjonalnie) ComfyUI zainstalowane lokalnie

### Kroki

```sh
# 1. Sklonuj repozytorium
git clone <YOUR_GIT_URL>
cd alfastudiox

# 2. Zainstaluj zależności
npm install

# 3. Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:5173`.

### Komendy

```sh
npm run dev        # serwer deweloperski z hot-reload
npm run build      # build produkcyjny
npm run preview    # podgląd buildu produkcyjnego
npm run test       # uruchom testy jednostkowe
npm run lint       # sprawdź kod ESLintem
```

---

## 🔌 Konfiguracja ComfyUI (renderowanie lokalne)

1. Zainstaluj i uruchom [ComfyUI](https://github.com/comfyanonymous/ComfyUI) lokalnie
2. Upewnij się, że ComfyUI działa na `http://127.0.0.1:8188`
3. W AlfaStudioX kliknij **Connect** w pasku `ComfyConnectionBar`
4. Aplikacja automatycznie wykryje dostępne modele, samplery i parametry GPU

### Obsługiwane modele ComfyUI
- Checkpointy (SDXL, SD 1.5, Flux, inne GGUF)
- LoRA, LyCORIS
- VAE
- ControlNet (Canny, OpenPose, Depth, itp.)

---

## ☁️ Konfiguracja providerów chmurowych

1. Przejdź do sekcji **Providers** w menu
2. Dodaj klucze API dla wybranych usług
3. Wybierz backend w pasku renderowania (ComfyUI ↔ chmura)

Obsługiwane providery: OpenAI, Google Gemini/Imagen, Replicate, HuggingFace, Kimi, Qwen, Agnes.

---

## 🚢 Wdrożenie

Otwórz [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) i kliknij **Share → Publish**.

Możesz też podłączyć własną domenę: **Project → Settings → Domains → Connect Domain**.

---

## 📄 Licencja

Projekt prywatny — wszelkie prawa zastrzeżone.
