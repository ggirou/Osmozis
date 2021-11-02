#!/bin/bash

addr=$( for i in ~1 "~0" "~0" "~0" "~0" "~0" ; do echo $(( $RANDOM & 255 & $i )) ; done | xargs printf '%02X:%02X:%02X:%02X:%02X:%02X\n' )
echo "$addr"

iwconfig wlan0 essid off
ifconfig wlan0 down; ifconfig wlan0 hw ether $addr; sudo ifconfig wlan0 up
iwconfig wlan0 essid on
iwconfig wlan0 essid $1
