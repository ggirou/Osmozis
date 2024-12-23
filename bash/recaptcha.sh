#!/bin/bash -e

export LC_ALL=C

key=`curl -s -I "http://detectportal.firefox.com/canonical.html" | grep -Fi location | sed -r 's/.*key=(.*)/\1/'`
[ -z "${key}" ] && exit 0
echo $key

curl -s -d null -H "X-Session-Token: $key" https://auth.osmoziswifi.com/api/auth-portal/v1/captchas
echo
captcha=`curl -s "https://auth.osmoziswifi.com/api/auth-portal/v1/captchas/current?v=0&session-token=$key" | tesseract - - | sed -E 's/[^A-Z]//g'`
echo $captcha

email="`cat /dev/urandom | tr -dc 'a-z' | head -c 20`@`cat /dev/urandom | tr -dc 'a-z' | head -c 16`.com"
echo $email

curl -s -H 'Content-Type: application/json' -H "X-Session-Token: $key" -d "{\"trial_auth\":{\"email\":\"$email\",\"captchaCode\":\"$captcha\"}}" https://auth.osmoziswifi.com/api/auth-portal/v1/authentications
