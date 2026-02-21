

# ComfyUI Visual Studio Plugin — Prototyp UI

## Opis projektu
Prototyp interfejsu użytkownika wtyczki do Visual Studio, która steruje przepływem pracy z ComfyUI za pomocą AI. Ciemny motyw wizualny inspirowany ComfyUI z node'ami i panelami.

## Ekrany i funkcjonalności

### 1. Główny layout — Dark Panel
- Ciemny motyw (dark theme) nawiązujący do Visual Studio i ComfyUI
- Sidebar z nawigacją między sekcjami: Workflow, Modele, Monitor, Historia, Galeria
- Górny pasek z statusem połączenia z ComfyUI i przyciskiem "Run"

### 2. Panel Workflow (Node Editor)
- Wizualna reprezentacja grafu workflow z node'ami (bloki: model, sampler, prompt, output)
- Kolorowe połączenia między node'ami
- Panel właściwości wybranego node'a po prawej stronie
- Przyciski: uruchom, zatrzymaj, zapisz workflow
- Statyczny mockup — bez drag & drop, ale z wizualnym efektem grafu

### 3. Panel Modele AI
- Lista modeli z kategoriami: Checkpointy, LoRA, VAE, ControlNet
- Karty modeli z miniaturką, nazwą, rozmiarem, statusem (załadowany/dostępny)
- Filtrowanie i wyszukiwanie modeli
- Przycisk konfiguracji modelu

### 4. Panel Monitor systemu
- Wyświetlanie temperatury GPU, użycia VRAM, CPU, RAM
- Wskaźniki w formie progress barów i wykresów
- Status: "Normalny" / "Ostrzeżenie" / "Przegrzanie — pauza"
- Ustawienia progów temperatury i automatycznych przerw
- Log wydarzeń (kiedy nastąpiła pauza, restart itp.)

### 5. Panel Historia / Parametry
- Tabela z historią uruchomień: data, workflow, model, seed, steps, czas generowania
- Podgląd miniaturki wyniku przy każdym wpisie
- Możliwość filtrowania i przeszukiwania historii
- Przycisk "Załaduj ponownie" — przywraca parametry do edytora

### 6. Galeria wyników
- Siatka miniaturek wygenerowanych obrazów/filmów
- Podgląd powiększonego obrazu z metadanymi (prompt, model, seed)
- Oznaczanie jako "ulubione" lub "do usunięcia"
- Przycisk zbiorczego usuwania nieudanych generacji
- Badge statusu: udane / nieudane / w trakcie

