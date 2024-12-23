#!/bin/bash

key="yOQlk-D8009a-5ivEpCY6Izf72F0VflHEz0."
for i in {1..100}
do
  echo $i
  curl -s -d null -H "X-Session-Token: $key" https://auth.osmoziswifi.com/api/auth-portal/v1/captchas
  echo
  curl -s "https://auth.osmoziswifi.com/api/auth-portal/v1/captchas/current?session-token=$key" > captcha-$i.png
done