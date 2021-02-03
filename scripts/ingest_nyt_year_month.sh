#!/usr/bin/env zsh

# usage
# download_nyt_puz_files_for_year_month <yyyy> <mm>

dir=$(dirname ${(%):-%x})
tempDir="${dir}/temp"
rm -rf ${tempDir}
mkdir -p ${tempDir}
mkdir -p ${tempDir}/puzzles
${dir}/get_nyt_puzzle_ids_for_year_month.sh $1 $2 >> ${tempDir}/puzzle_ids.csv
${dir}/download_nyt_puz_files.sh "${tempDir}/puzzle_ids.csv"
node ${dir}/ingestPuzFiles "${tempDir}/puzzles/"