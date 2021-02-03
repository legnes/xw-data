#!/usr/bin/env zsh

# usage
# download_nyt_puz_files <path/to/date_puzzleId_file.csv>
# expects a cookie file cookies/nyt.txt

dir=$(dirname ${(%):-%x})
cookies=$(cat ${dir}/cookies/nyt.txt)

while IFS= read -r line
do
	data=("${(@s/,/)line}")
	date=${data[1]}
	date="${date%\"}"
	date="${date#\"}"
	puzzle_id=${data[2]}
  echo "scraping $date ($puzzle_id)"
	curl -b "$cookies" -o "${dir}/temp/puzzles/${date}_${puzzle_id}.puz" "https://www.nytimes.com/svc/crosswords/v2/puzzle/${puzzle_id}.puz"
	sleep 10
done < "$1"