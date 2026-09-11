#!/bin/bash
urls=(
  "https://images.unsplash.com/photo-1586528116311-ad8ed7c663be" # warehouse boxes (B2B)
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31" # server rack (Informatica)
  "https://images.unsplash.com/photo-1504148455328-c376907d081c" # power drill / tools
  "https://images.unsplash.com/photo-1563453392212-326f5e854473" # lightbulb
  "https://images.unsplash.com/photo-1555664424-778a1e5e1b48" # cables / electronics
  "https://images.unsplash.com/photo-1621252179027-94459d278660" # hard hat (safety)
  "https://images.unsplash.com/photo-1558002038-1055907df827" # smart home thermostat
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace" # interior decor
  "https://images.unsplash.com/photo-1530124566582-a618bc2615dc" # hand tools
  "https://images.unsplash.com/photo-1416879598553-333fb7692135" # garden
)

for url in "${urls[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  echo "$status $url"
done
