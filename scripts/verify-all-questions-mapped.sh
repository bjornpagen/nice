#!/usr/bin/env bash

set -euo pipefail

# directory containing the xml files
QTI_DIR="./data/exports/qti/_670e4557db900d0008b22611"
MAPPINGS_FILE="$QTI_DIR/question-mappings.json"

# check if mappings file exists
if [[ ! -f "$MAPPINGS_FILE" ]]; then
  echo "❌ mappings file not found: $MAPPINGS_FILE"
  exit 1
fi

echo "checking all xml files in $QTI_DIR..."
echo ""

missing_count=0
total_count=0

# loop through all xml files
for xml_file in "$QTI_DIR"/*.xml; do
  # skip if no xml files found
  [[ -e "$xml_file" ]] || continue
  
  # extract question id from filename (remove path and .xml extension)
  question_id=$(basename "$xml_file" .xml)
  total_count=$((total_count + 1))
  
  # check if this id exists in the mappings json
  if ! grep -q "\"$question_id\"" "$MAPPINGS_FILE"; then
    echo "❌ MISSING: $question_id"
    missing_count=$((missing_count + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "total questions: $total_count"
echo "missing from mappings: $missing_count"

if [[ $missing_count -eq 0 ]]; then
  echo "✅ all questions are mapped"
  exit 0
else
  echo "❌ some questions are not mapped"
  exit 1
fi

