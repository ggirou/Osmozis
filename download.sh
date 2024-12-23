
#!/bin/bash

cd /Users/ggirou/Movies/1-Enfant
echo $1

while true
do
  rsync --progress --partial --append-verify --timeout=10 remote-nas2:"$1" .
  #wget --http-user=ggirou --http-password='=J~9r4>eSvq`7VoU*ZQ$5r`sHHFQ$!4Y' -c --timeout=30 "$1"
  sleep 10
done

# wget --http-user=ggirou --http-password='=J~9r4>eSvq`7VoU*ZQ$5r`sHHFQ$!4Y' -c "http://files.modoki.ovh/movies-nas2/Children/Paws%20of%20Fury%20-%20The%20Legend%20of%20Hank%20%282022%29/Paws%20of%20Fury%20The%20Legend%20of%20Hank%20%282022%29%20MULTi%20VFF%201080p%20BluRay%20EAC3%20Atmos%205.1%20x265-k7.mkv"
