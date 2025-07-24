#!/bin/bash

# Playwright Browser-Abhängigkeiten für WSL2 installieren
echo "Installiere Playwright Browser-Abhängigkeiten..."

# Update package list
sudo apt-get update

# Installiere alle notwendigen Bibliotheken
sudo apt-get install -y \
    libnspr4 \
    libnss3 \
    libnssutil3 \
    libsmime3 \
    libasound2t64 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2

echo "Installation abgeschlossen!"
echo "Teste Playwright..."

# Installiere Browser
npx playwright install

echo "Fertig! MCP Playwright Server sollte jetzt funktionieren."