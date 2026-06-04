#!/usr/bin/env python3
"""
ALFA Sentinel / Reporter Program

"Postaw ten program" - run it (or install as Windows Task / startup).

It "nazwie kazdy zainstalowany program" (lists/names every installed app via registry).

Then reports to your brain server (local or cloud).

The cloud "silnik" (engine) checks the report - if no "instalacji" detected (your sentinel/app/Krita/etc in the list), the AI logic in cloud "aut nie dziala".

Tajemnica silnika w chmurze.

Run periodically or on login. Users will try to bypass (fake list), but not too easy for average.

Usage: python sentinel.py
Or compile to exe with pyinstaller for "installation".

Set env:
  BRAIN_URL=http://localhost:8000   # or your cloud brain
  MACHINE_ID=my-machine-123
"""
import os
import sys
import time
import json
import requests
from datetime import datetime

BRAIN_URL = os.getenv("BRAIN_URL", "http://localhost:8000")
MACHINE_ID = os.getenv("MACHINE_ID", "local-" + str(int(time.time())))

# Copy the scanner here for standalone (or import from backend if packaged)
try:
    import winreg
except ImportError:
    winreg = None

def get_installed_programs() -> list[str]:
    if winreg is None:
        return ["winreg-unavailable-not-windows"]
    programs: set[str] = set()
    locations = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_WOW64_64KEY),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_WOW64_32KEY),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", 0),
    ]
    for root, sub, flags in locations:
        try:
            key = winreg.OpenKey(root, sub, 0, winreg.KEY_READ | flags)
            for i in range(winreg.QueryInfoKey(key)[0]):
                try:
                    sub_name = winreg.EnumKey(key, i)
                    skey = winreg.OpenKey(key, sub_name)
                    try:
                        name, _ = winreg.QueryValueEx(skey, "DisplayName")
                        if name and isinstance(name, str) and name.strip():
                            programs.add(name.strip())
                    except (OSError, FileNotFoundError):
                        pass
                    winreg.CloseKey(skey)
                except:
                    pass
            winreg.CloseKey(key)
        except:
            pass
    return sorted(programs)

def main():
    print("ALFA Sentinel starting...")
    progs = get_installed_programs()
    print(f"Found {len(progs)} installed programs. First 5: {progs[:5]}")
    payload = {
        "programs": progs,
        "machine_id": MACHINE_ID,
        "sentinel_version": "1.0",
        "app_version": "alfastudiox-sentinel",
        "reported_at": datetime.utcnow().isoformat() + "Z"
    }
    try:
        r = requests.post(f"{BRAIN_URL}/ingest/installed-programs", json=payload, timeout=10)
        print("Report sent:", r.status_code, r.text[:200])
    except Exception as e:
        print("Failed to report to brain:", e)
        print("Make sure brain is running (uvicorn backend.main:app) or set BRAIN_URL to cloud.")
    print("Done. Run this regularly (task scheduler) so cloud detects the 'instalacji' and AI logic works.")
    print("To bypass is possible (send fake POST with 'alfa' in list), but not 'za łatwo' for average user.")

if __name__ == "__main__":
    main()
