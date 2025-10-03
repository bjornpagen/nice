#!/bin/bash

# script to rename teks-mappings.json to question-mappings.json
# and rename teks_standard property to question_st

set -e

QTI_DIR="./data/exports/qti"

echo "searching for teks-mappings.json files in $QTI_DIR..."

# find all teks-mappings.json files
find "$QTI_DIR" -name "teks-mappings.json" -type f | while read -r file; do
    dir=$(dirname "$file")
    new_file="$dir/question-mappings.json"
    
    echo "processing: $file"
    
    # transform the json: rename teks_standard to question_st
    jq 'map({question_id: .question_id, question_st: .teks_standard})' "$file" > "$new_file"
    
    if [ $? -eq 0 ]; then
        echo "  ✓ created $new_file"
        
        # remove old file
        rm "$file"
        echo "  ✓ removed $file"
    else
        echo "  ✗ failed to process $file"
        exit 1
    fi
done

echo ""
echo "✅ all teks-mappings.json files renamed and transformed"

