# Skiper Chrome Extension

## Features

- Scans YouTube recommendation cards (home, subscriptions, watch sidebar)
- Fetches transcript-based quality score from Skiper backend
- Masks low-score videos (<5) with black overlay + 💩 while keeping cards clickable
- Adds `Feedback` button near current video title to refine personal relevance prompt

## Local installation

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `extension/` folder
5. Open extension popup and set your relevance prompt

## Notes

- Default backend URL: `https://api.skiper.stefanov.tech`
- For local backend testing use `http://localhost:8000`
