#!/usr/bin/env bash

# usage
# get_nyt_puzzle_ids_for_year_month <yyyy> <mm>

curl "https://nyt-games-prd.appspot.com/svc/crosswords/v3/puzzles.json?publish_type=daily&sort_order=asc&sort_by=print_date&date_start=$1-$2-01&date_end=$1-$2-31" \
| jq '.results | .[] | {(.print_date): .puzzle_id}' \
| jq -n 'reduce inputs as $in (null; . + $in)' \
| sed 's/  //; s/,//; s/: /,/; s/{//; 1d; $d'