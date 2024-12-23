#!/bin/sh
# captive portal auto-login script template with credentials as parameters
# Copyright (c) 2020-2022 Dirk Brenken (dev@brenken.org)
# This is free software, licensed under the GNU General Public License v3.

# set (s)hellcheck exceptions
# shellcheck disable=1091,2039,3040

. "/lib/functions.sh"

export LC_ALL=C
export PATH="/usr/sbin:/usr/bin:/sbin:/bin"

# user="${1}"
# password="${2}"
freesession="connexion gratuite"
success='{"statusCode":0}'
# trm_domain="example.com"
trm_useragent="$(uci_get travelmate global trm_useragent "Mozilla/5.0 (Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0")"
trm_maxwait="$(uci_get travelmate global trm_maxwait "30")"
trm_fetch="$(command -v curl)"

# login with credentials
#
# raw_html="$("${trm_fetch}" --user-agent "${trm_useragent}" --referer "http://www.example.com" --connect-timeout $((trm_maxwait / 6)) --silent --show-error --header "Content-Type:application/x-www-form-urlencoded" --data "username=${user}&password=${password}" "http://${trm_domain}")"
# [ -z "${raw_html##*${success}*}" ] && exit 0 || exit 255

# Is redirecting?
key="$("${trm_fetch}" --user-agent "${trm_useragent}" --connect-timeout $((trm_maxwait / 6)) --silent --show-error -I "http://detectportal.firefox.com/canonical.html" | grep -Fi location | sed -r 's/.*key=(.*)/\1/')"
echo $key
[ -z "${key}" ] && exit 0

# Free session available?
raw_html="$("${trm_fetch}" --user-agent "${trm_useragent}" --referer "http://html.osmoziswifi.com/authentication?key=$key" --connect-timeout $((trm_maxwait / 6)) --silent --show-error -L "http://auth.osmoziswifi.com/authentication?key=$key")"
#echo $raw_html
# echo "${raw_html##*${freesession}*}"
if ! echo "$raw_html" | grep "$freesession" > /dev/null; then
  # TODO restart uplink
  echo restart uplink
  exit 1
fi

# Resolve captcha
email="$(cat /dev/urandom | tr -dc 'a-z' | head -c 20)@$(cat /dev/urandom | tr -dc 'a-z' | head -c 16).com"
"${trm_fetch}" --user-agent "${trm_useragent}" --referer "http://auth.osmoziswifi.com/authentication?key=$key" --connect-timeout $((trm_maxwait / 6)) --silent --show-error -d null -H "X-Session-Token: $key" https://auth.osmoziswifi.com/api/auth-portal/v1/captchas
timestamp="$(date +%s)"
captcha="$("${trm_fetch}" --user-agent "${trm_useragent}" --referer "http://html.osmoziswifi.com/authentication?key=$key" --connect-timeout $((trm_maxwait / 6)) --silent --show-error "https://auth.osmoziswifi.com/api/auth-portal/v1/captchas/current?v=$timestamp&session-token=$key" | tesseract - - | sed -E 's/[^A-Z]//g')"
echo $captcha
result="$("${trm_fetch}" --user-agent "${trm_useragent}" --referer "http://html.osmoziswifi.com/authentication?key=$key" --connect-timeout $((trm_maxwait / 6)) --silent --show-error -H 'Content-Type: application/json' -H "X-Session-Token: $key" -d "{\"trial_auth\":{\"email\":\"$email\",\"captchaCode\":\"$captcha\"}}" "https://auth.osmoziswifi.com/api/auth-portal/v1/authentications")"
[ "$result" -eq "${success}" ] && exit 0 || exit 255
