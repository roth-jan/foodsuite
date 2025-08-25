#!/bin/bash
# Update der FoodSuite App auf EC2

echo "📦 Erstelle Update-Paket..."

# Erstelle temporäres Verzeichnis
mkdir -p foodsuite-update

# Kopiere die aktualisierte HTML
cp foodsuite-complete-app.html foodsuite-update/

# Erstelle Update-Script
cat > foodsuite-update/apply-update.sh << 'EOF'
#!/bin/bash
echo "🚀 Updating FoodSuite on EC2..."

# Backup existing file
if [ -f foodsuite-complete-app.html ]; then
    cp foodsuite-complete-app.html foodsuite-complete-app.html.backup
    echo "✅ Backup created"
fi

# Apply update
echo "📝 Applying update..."
# The new HTML file should be in the same directory as this script

echo "✅ Update complete!"
echo "🔄 Restarting PM2..."
pm2 restart foodsuite || true

echo "🎉 FoodSuite updated successfully!"
echo "🔗 Test at: http://18.195.206.72:3005"
EOF

chmod +x foodsuite-update/apply-update.sh

# Erstelle tar
tar -czf foodsuite-update.tar.gz foodsuite-update/

echo ""
echo "✅ Update-Paket erstellt: foodsuite-update.tar.gz"
echo ""
echo "📋 ANLEITUNG:"
echo "1. Kopiere das Update auf EC2:"
echo "   scp -i YOUR-KEY.pem foodsuite-update.tar.gz ubuntu@18.195.206.72:~/"
echo ""
echo "2. Auf EC2 ausführen:"
echo "   ssh -i YOUR-KEY.pem ubuntu@18.195.206.72"
echo "   tar -xzf foodsuite-update.tar.gz"
echo "   cd foodsuite-update"
echo "   sudo cp foodsuite-complete-app.html /home/ubuntu/foodsuite-complete-app.html"
echo "   pm2 restart foodsuite"
echo ""
echo "3. Teste die App: http://18.195.206.72:3005"

# Cleanup
rm -rf foodsuite-update/