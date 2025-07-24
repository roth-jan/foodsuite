#!/bin/bash

echo "Installiere Playwright-Abhängigkeiten für WSL2..."

# Prüfe ob wir die Pakete ohne sudo installieren können
if command -v apt-get &> /dev/null; then
    echo "Sie müssen folgende Befehle manuell ausführen:"
    echo ""
    echo "sudo apt-get update"
    echo "sudo apt-get install -y libnspr4 libnss3 libnssutil3 libsmime3 libasound2t64"
    echo ""
    echo "Oder für minimale Installation (nur Firefox):"
    echo "sudo apt-get install -y libasound2t64"
else
    echo "APT nicht gefunden. Bitte installieren Sie die Abhängigkeiten manuell."
fi

echo ""
echo "Alternative: Verwenden Sie den Windows-Browser direkt!"
echo "FoodSuite läuft auf: http://localhost:3003"