#!/bin/bash
# Telegram webhook'unu ngrok URL'i ile kaydet
#
# Kullanım:
#   ./set-webhook.sh set    → webhook'u kaydet
#   ./set-webhook.sh delete → webhook'u sil (polling'e dön)
#   ./set-webhook.sh info   → mevcut webhook bilgisini göster

set -e

# webhook-service/.env dosyasından değerleri oku
source "$(dirname "$0")/webhook-service/.env"

if [ -z "$BOT_TOKEN" ]; then
  echo "HATA: BOT_TOKEN .env dosyasında tanımlı değil"
  exit 1
fi

TELEGRAM_API="https://api.telegram.org/bot${BOT_TOKEN}"

case "$1" in
  set)
    if [ -z "$2" ]; then
      echo "Kullanım: ./set-webhook.sh set <ngrok-url>"
      echo "Örnek:    ./set-webhook.sh set https://xxxx.ngrok-free.app"
      exit 1
    fi

    WEBHOOK_URL="${2}/webhook/${WEBHOOK_SECRET}"
    echo "Webhook kaydediliyor: $WEBHOOK_URL"

    curl -s -X POST "${TELEGRAM_API}/setWebhook" \
      -H "Content-Type: application/json" \
      -d "{\"url\": \"${WEBHOOK_URL}\"}" | python3 -m json.tool
    ;;

  delete)
    echo "Webhook siliniyor..."
    curl -s -X POST "${TELEGRAM_API}/deleteWebhook" | python3 -m json.tool
    ;;

  info)
    echo "Mevcut webhook bilgisi:"
    curl -s "${TELEGRAM_API}/getWebhookInfo" | python3 -m json.tool
    ;;

  *)
    echo "Kullanım: ./set-webhook.sh [set|delete|info]"
    exit 1
    ;;
esac
