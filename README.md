# Implementation

The submitted implementation is a web page that renders the real-time ether transfers within every Ethereum block using a area chart.

It uses the chart library `highcharts` for flexibility in chart rendering, while the front end framework is `svelte` for the simplicity purpose. It uses `webpack` for bundling the web app.

The implementations are mainly located in `/src/data.js` and `/src/App.svelte`. There are some changes to the `/src/data.js` to encapsulate the necessary streaming API for both blocks and price data sources. The frontend code `/src/App.svelte` subscribes to the data API and customizes the data structures for the display needs.

Below is the preview
![preview](/screenshot.png?raw=true "Preview")

## Setup

`npm i`

## Development

`npm run dev`

It will start a live reloading development environment. You can access the web page on **http://localhost:5000** on a browser. Whenever there is a code change, it will refresh the web page.

## Build

`npm run build`

This command will bundle the code into the `/public` folder for a server to serve the web page in the public.