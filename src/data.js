// See web3 documentation: https://web3js.readthedocs.io/en/v1.2.4/web3.html
const Web3 = require('web3')
// See RxJS documentation: https://rxjs-dev.firebaseapp.com/api
const { interval, fromEvent } = require('rxjs')
const { mergeMap } = require('rxjs/operators')

const axios = require('axios').default

// This is the RPC endpoint of a mainnet ETH node
const ETHEREUM_MAINNET = 'wss://mainnet.eth.aragon.network/ws'

// See Coinbase API documentation: https://developers.coinbase.com/api/v2#prices
const PRICE_API = 'https://api.coinbase.com/v2/prices/ETH-USD/spot'

const web3 = new Web3(ETHEREUM_MAINNET)

function getBlockSource() {
  return fromEvent(web3.eth.subscribe('newBlockHeaders'), 'data').pipe(
    mergeMap(async ({ number }) => {
      try {
        const block = await web3.eth.getBlock(number, true)
        return block
      } catch (error) {
        console.error(error.message)
      }
    })
  )
}

function getPriceSource(pollInterval) {
  return interval(pollInterval).pipe(mergeMap(() => getLatestPrice()))
}

async function getLatestPrice() {
  try {
    const response = await axios.get(PRICE_API)
    const {
      data: { amount: price },
    } = response.data
    return parseFloat(price)
  } catch (error) {
    console.error(error.message)
  }
}

module.exports = {
  getLatestPrice,
  getBlockSource,
  getPriceSource,
}
