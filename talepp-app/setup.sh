#!/usr/bin/env bash
# Talepp kurulumu: Codespaces terminalinde `bash setup.sh` ile bir kez çalıştır.
set -e

# Expo'nun en güncel SDK'sı (Expo Go ile uyumlu)
npm install expo@latest

# Expo paketleri: `expo install` SDK'ya uygun sürümleri seçer
npx expo install react react-native expo-status-bar expo-linear-gradient expo-image-picker \
  expo-haptics expo-font @react-native-masked-view/masked-view react-native-safe-area-context \
  @react-native-async-storage/async-storage

# Font: Unbounded (başlıklar)
npm install @expo-google-fonts/unbounded

# Sürüm uyumsuzluğu kaldıysa düzelt
npx expo install --fix

echo ""
echo "✅ Kurulum bitti. Telefonda açmak için:  npm run tunnel"
