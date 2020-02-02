<script>
  const Web3 = require('web3')
  const Highcharts = require('highcharts')
  const { CountUp } = require('countup.js')
  const { getLatestPrice, getBlockSource, getPriceSource } = require('./data')

  const startAt = new Date()
  const series = []
  let accumulatedTransferredValue = 0
  let currentPrice
  let canvas
  let chart
  let priceCountUp
  let transferredValueCountUp

  window.onload = () => {
    priceCountUp = new CountUp('current-price', currentPrice, {
      decimalPlaces: 3,
      prefix: '$',
    })
    transferredValueCountUp = new CountUp(
      'accumulated-value',
      accumulatedTransferredValue,
      {
        prefix: '$',
      }
    )

    init()
  }

  async function init() {
    currentPrice = await getLatestPrice()

    getPriceSource(10000).subscribe(newPrice => {
      currentPrice = newPrice || currentPrice
      priceCountUp.update(currentPrice)
    })

    getBlockSource().subscribe(data => {
      const totalTransferredInWei = data.transactions.reduce((cum, tx) => {
        return Web3.utils.toBN(tx.value).add(cum)
      }, Web3.utils.toBN(0))

      const totalGasFeesInWei = data.transactions.reduce((cum, tx) => {
        const gasBN = Web3.utils.toBN(tx.gas)
        const priceBN = Web3.utils.toBN(tx.gasPrice)
        return gasBN.mul(priceBN).add(cum)
      }, Web3.utils.toBN(0))

      const newBlock = {
        blockNumber: data.number,
        timestamp: data.timestamp * 1000,
        totalTransferredInEther: formatEther(totalTransferredInWei),
        totalGasFeeInEther: formatEther(totalGasFeesInWei),
        totalTransferredInUSD: formatEther(totalTransferredInWei) * currentPrice,
        totalGasFeeInUSD: formatEther(totalGasFeesInWei) * currentPrice,
        totalTxs: data.transactions.length,
        price: currentPrice,
      }
      series.push(newBlock)

      accumulatedTransferredValue += newBlock.totalTransferredInUSD
      transferredValueCountUp.update(accumulatedTransferredValue)

      chart.series[0].addPoint([
        newBlock.timestamp,
        newBlock.totalTransferredInUSD,
      ])
    })

    chart = createChart()
  }

  function formatEther(wei) {
    return parseFloat(Web3.utils.fromWei(wei))
  }

  function createChart() {
    return Highcharts.chart(canvas, {
      chart: {
        type: 'area',
      },
      title: {
        text: `Transferred values in Ethereum blocks`,
      },
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        title: {
          text: 'USD',
        },
        type: 'logarithmic',
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        area: {
          fillColor: {
            linearGradient: {
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 1,
            },
            stops: [
              [0, Highcharts.getOptions().colors[0]],
              [
                1,
                Highcharts.Color(Highcharts.getOptions().colors[0])
                  .setOpacity(0)
                  .get('rgba'),
              ],
            ],
          },
        },
        marker: {
          radius: 2,
        },
        lineWidth: 1,
        states: {
          hover: {
            lineWidth: 1,
          },
        },
        threshold: null,
      },

      series: [
        {
          name: 'Transferred values',
          data: [],
        },
      ],

      tooltip: {
        formatter: function(d) {
          const pointIndex = this.series.data.indexOf(this.point)
          const {
            blockNumber,
            totalTransferredInEther,
            totalTransferredInUSD,
            totalTxs,
            price,
          } = series[pointIndex]

          return (
            `<b>$${totalTransferredInUSD.toFixed(2)}</b><br>` +
            `Ethers: ${totalTransferredInEther.toFixed(6)}<br>` +
            `Price: $${price}<br>` +
            `Fees: $${totalTransferredInUSD.toFixed(2)}<br>` +
            `Transactions: ${totalTxs}<br>` +
            `Block Number: ${blockNumber}<br>`
          )
        },
      },

      time: {
        useUTC: false,
      },
      credits: {
        enabled: false,
      },
    })
  }
</script>

<main>
	<h1>Transferred value: <span id='accumulated-value'></span></h1>
	<div>since: {startAt.toString()}</div>
  <br>
	<div>Current Price: <span id='current-price'></span></div>
  <br>
  <div bind:this={canvas} />
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		margin: 0 auto;
	}
</style>