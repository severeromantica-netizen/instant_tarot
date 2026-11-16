#!/usr/bin/env bash
#
# 1909년 원본 RWS 카드 스캔 78장을 위키미디어 공용에서 assets/cards/로 내려받는다.
# 한 번만 실행하고 결과를 저장소에 커밋하면, 배포된 사이트는 외부 요청 없이 동작한다.
#
#   사용법:  bash tools/fetch-cards.sh [가로폭]
#   예:      bash tools/fetch-cards.sh 800
#
# 받아온 이미지는 퍼블릭 도메인이다 (Pamela Colman Smith, 1909).
# 미국은 1909년 발행 후 저작권 미갱신, 영국/EU는 2022-01-01부터 보호 만료.

set -uo pipefail

WIDTH="${1:-800}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/cards"
BASE="https://commons.wikimedia.org/wiki/Special:FilePath"
UA="tarot-site-image-fetch/1.0"

mkdir -p "$OUT"

MAJOR=(
  "RWS_Tarot_00_Fool.jpg"            "RWS_Tarot_01_Magician.jpg"
  "RWS_Tarot_02_High_Priestess.jpg"  "RWS_Tarot_03_Empress.jpg"
  "RWS_Tarot_04_Emperor.jpg"         "RWS_Tarot_05_Hierophant.jpg"
  "RWS_Tarot_06_Lovers.jpg"          "RWS_Tarot_07_Chariot.jpg"
  "RWS_Tarot_08_Strength.jpg"        "RWS_Tarot_09_Hermit.jpg"
  "RWS_Tarot_10_Wheel_of_Fortune.jpg" "RWS_Tarot_11_Justice.jpg"
  "RWS_Tarot_12_Hanged_Man.jpg"      "RWS_Tarot_13_Death.jpg"
  "RWS_Tarot_14_Temperance.jpg"      "RWS_Tarot_15_Devil.jpg"
  "RWS_Tarot_16_Tower.jpg"           "RWS_Tarot_17_Star.jpg"
  "RWS_Tarot_18_Moon.jpg"            "RWS_Tarot_19_Sun.jpg"
  "RWS_Tarot_20_Judgement.jpg"       "RWS_Tarot_21_World.jpg"
)

FILES=("${MAJOR[@]}")
for suit in Wands Cups Swords Pents; do
  for n in $(seq -w 1 14); do
    FILES+=("${suit}${n}.jpg")
  done
done

echo "총 ${#FILES[@]}장 — 가로 ${WIDTH}px — 저장 위치: $OUT"
echo

ok=0; skip=0; fail=0; failed=()

for f in "${FILES[@]}"; do
  dest="$OUT/$f"

  if [[ -s "$dest" ]]; then
    printf '  · %-34s 이미 있음\n' "$f"
    ((skip++)); continue
  fi

  code=$(curl -sS -L --fail-with-body --max-time 60 \
              -A "$UA" \
              -o "$dest" -w '%{http_code}' \
              "$BASE/$f?width=$WIDTH" 2>/dev/null)

  if [[ "$code" == "200" && -s "$dest" ]]; then
    printf '  ✓ %-34s %s\n' "$f" "$(du -h "$dest" | cut -f1)"
    ((ok++))
  else
    rm -f "$dest"
    printf '  ✗ %-34s HTTP %s\n' "$f" "${code:-오류}"
    ((fail++)); failed+=("$f")
  fi

  sleep 0.3   # 공용 서버에 대한 예의
done

echo
echo "받음 $ok · 건너뜀 $skip · 실패 $fail"

if (( fail > 0 )); then
  echo
  echo "실패 목록:"
  printf '  %s\n' "${failed[@]}"
  echo
  echo "실패한 카드는 사이트에서 자동으로 기하 심볼 SVG로 대체되므로"
  echo "배포 자체에는 문제가 없다. 파일명을 확인하려면 아래를 열어 보면 된다:"
  echo "  https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck"
  exit 1
fi

echo "완료. assets/cards/ 를 커밋하면 배포 사이트가 로컬 이미지를 사용한다."
