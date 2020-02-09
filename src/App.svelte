<script>
  const Web3 = require('web3')
  const Highcharts = require('highcharts')
  const { CountUp } = require('countup.js')
  const { getLatestPrice, getBlockSource, getPriceSource } = require('./data')

  const startAt = new Date()
  const formattedBlocks = []
  let graphs = {
    totalTransfers: {
      enabled: true,
      type: 'area',
      color: '#a8d8ea',
      getPoint: ({ timestamp, totalTransferredInUSD }) => [
        timestamp,
        totalTransferredInUSD,
      ],
      yAxis: {
        id: 'totalTransfers-axis',
        title: {
          text: 'USD',
        },
        lineWidth: 2,
        lineColor: '#a8d8ea',
        type: 'logarithmic',
        opposite: true,
      },
      tooltip: ({
        totalTransferredInUSD,
        totalTransferredInEther,
        price,
        totalGasFeeInUSD,
        totalTxs,
        blockNumber,
      }) =>
        `<b>$${totalTransferredInUSD.toFixed(2)}</b><br>` +
        `Ethers: ${totalTransferredInEther.toFixed(6)}<br>` +
        `Price: $${price}<br>` +
        `Fees: $${totalGasFeeInUSD.toFixed(2)}<br>` +
        `Transactions: ${totalTxs}<br>` +
        `Block Number: ${blockNumber}<br>`,
    },
    avgGasPrice: {
      enabled: false,
      type: 'line',
      color: '#95e1d3',
      getPoint: ({ timestamp, avgGasPrice }) => [timestamp, avgGasPrice],
      yAxis: {
        id: 'avgGasPrice-axis',
        title: {
          text: 'Gwei',
        },
        lineWidth: 2,
        lineColor: '#95e1d3',
        opposite: true,
      },
      tooltip: ({ avgGasPrice }) => `Average Gas Price: ${avgGasPrice} Gwei`,
    },
    totalTxs: {
      enabled: false,
      type: 'line',
      color: '#fce38a',
      getPoint: ({ timestamp, totalTxs }) => [timestamp, totalTxs],
      yAxis: {
        id: 'totalTxs-axis',
        title: {
          text: 'Transactions',
        },
        lineWidth: 2,
        lineColor: '#fce38a',
        opposite: true,
      },
      tooltip: ({ totalTxs }) => `Transactions: ${totalTxs}`,
    },
  }
  let accumulatedTransferredValue = 0
  let accumulatedFees = 0
  let accumulatedTxs = 0
  let currentPrice
  let priceCountUp
  let transferredValueCountUp
  let feesCountUp
  let txsCountUp
  let canvas
  let chart

  window.onload = () => {
    priceCountUp = new CountUp('current-price', currentPrice, {
      decimalPlaces: 3,
      prefix: '$',
    })
    transferredValueCountUp = new CountUp(
      'accumulated-transfers',
      accumulatedTransferredValue,
      {
        prefix: '$',
      }
    )
    feesCountUp = new CountUp('accumulated-fees', accumulatedFees, {
      prefix: '$',
    })
    txsCountUp = new CountUp('accumulated-txs', accumulatedTxs)

    init()
  }

  async function init() {
    initChart()

    const lastestPrice = await getLatestPrice()
    updatePrice(lastestPrice)

    getPriceSource(10000).subscribe(newPrice => {
      updatePrice(newPrice || currentPrice)
    })

    getBlockSource().subscribe(data => {
      const formattedBlock = formatBlock(data)
      formattedBlocks.push(formattedBlock)
      formattedBlocks.sort((a, b) => a.timestamp - b.timestamp)

      accumulatedTransferredValue += formattedBlock.totalTransferredInUSD
      transferredValueCountUp.update(accumulatedTransferredValue)

      accumulatedFees += formattedBlock.totalGasFeeInUSD
      feesCountUp.update(accumulatedFees)

      accumulatedTxs += formattedBlock.totalTxs
      txsCountUp.update(accumulatedTxs)

      updateChart(formattedBlock)
    })
  }

  function formatEther(wei) {
    return parseFloat(Web3.utils.fromWei(wei))
  }

  function updatePrice(price) {
    currentPrice = price
    priceCountUp.update(price)
  }

  function formatBlock(blockData) {
    const {
      totalTransferredInWei,
      totalGasFeesInWei,
      totalGasLimit,
    } = blockData.transactions.reduce(
      (stats, tx) => {
        stats.totalTransferredInWei = Web3.utils
          .toBN(tx.value)
          .add(stats.totalTransferredInWei)

        const gasBN = Web3.utils.toBN(tx.gas)
        stats.totalGasLimit = stats.totalGasLimit.add(gasBN)

        const priceBN = Web3.utils.toBN(tx.gasPrice)
        stats.totalGasFeesInWei = gasBN.mul(priceBN).add(stats.totalGasFeesInWei)

        return stats
      },
      {
        totalTransferredInWei: Web3.utils.toBN(0),
        totalGasFeesInWei: Web3.utils.toBN(0),
        totalGasLimit: Web3.utils.toBN(0),
      }
    )

    let avgGasPrice = null
    if (totalGasLimit.toNumber() !== 0) {
      avgGasPrice = totalGasFeesInWei
        .div(totalGasLimit)
        .div(Web3.utils.toBN(Web3.utils.unitMap.gwei))
        .toNumber()
    }
  
    const formattedBlock = {
      blockNumber: blockData.number,
      timestamp: blockData.timestamp * 1000,
      totalTransferredInEther: formatEther(totalTransferredInWei),
      totalGasFeeInEther: formatEther(totalGasFeesInWei),
      totalTransferredInUSD: formatEther(totalTransferredInWei) * currentPrice,
      totalGasFeeInUSD: formatEther(totalGasFeesInWei) * currentPrice,
      totalTxs: blockData.transactions.length,
      price: currentPrice,
      avgGasPrice,
    }
  
    return formattedBlock
  }

  function updateChart(formattedBlock) {
    for (const s of chart.series) {
      const graph = graphs[s.userOptions.id]
      if (graph.enabled) {
        s.addPoint(graph.getPoint(formattedBlock))
      }
    }
  }

  function removeGraph(graphId) {
    chart.get(graphId).remove()
    const yAxis = chart.get(graphId + '-axis')
    if (yAxis) {
      yAxis.remove()
    }
  }

  function addGraph(graphId) {
    const graph = graphs[graphId]
    const series = formattedBlocks.map(formattedBlock =>
      graph.getPoint(formattedBlock)
    )

    if (graph.yAxis) {
      chart.addAxis(graph.yAxis)
    }

    chart.addSeries({
      id: graphId,
      type: graph.type,
      data: series,
      color: graph.color,
      yAxis: graph.yAxis ? graph.yAxis.id : undefined,
    })
  }

  function toggleGraph(graphId) {
    const graph = graphs[graphId]
    graph.enabled = !graph.enabled

    // svelte is not smart enough to detect the change inside an object,
    // so it has to do this hack to notify the view changes.
    graphs = graphs
    if (!graph.enabled) removeGraph(graphId)
    else addGraph(graphId)
  }

  function initChart() {
    chart = Highcharts.chart(canvas, {
      chart: {
        type: 'area',
      },
      title: {
        text: `Trends in Ethereum blocks`,
      },
      xAxis: {
        type: 'datetime',
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
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

      series: [],

      tooltip: {
        formatter: function(d) {
          const pointIndex = this.series.data.indexOf(this.point)
          const formattedBlock = formattedBlocks[pointIndex]
          return graphs[this.series.userOptions.id].tooltip(formattedBlock)
        },
      },

      time: {
        useUTC: false,
      },
      credits: {
        enabled: false,
      },
    })

    for (const graphId of Object.keys(graphs)) {
      if (graphs[graphId].enabled) {
        addGraph(graphId)
      }
    }
  }
</script>

<main>
	<div>since: {startAt.toString()}</div>
  <div class="stats-container">
    <div class="stats graph" on:click="{() => toggleGraph('totalTransfers')}">
      <div id='accumulated-transfers' class="value" class:graph-enabled={graphs.totalTransfers.enabled}></div>
      <div class="label">Transferred</div>
    </div>
    <div class="stats graph" on:click="{() => toggleGraph('avgGasPrice')}">
      <div id='accumulated-fees' class="value" class:graph-enabled={graphs.avgGasPrice.enabled}></div>
      <div class="label">Fees</div>
    </div>
    <div class="stats graph" on:click="{() => toggleGraph('totalTxs')}">
      <div id='accumulated-txs' class="value" class:graph-enabled={graphs.totalTxs.enabled}></div>
      <div class="label">Transactions</div>
    </div>
    <div class="stats">
      <div id="current-price" class="value"></div>
      <div class="label">ETH Price</div>
    </div>
  </div>
  <div bind:this={canvas} />
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		margin: 0 auto;
	}
  .stats-container {
    display: flex;
    margin: 50px auto;
  }
  .stats {
    flex: 1;
  }
  .stats.graph {
    cursor: pointer;
  }
  .stats .value {
    font-size: 2rem;
  }
  .stats .label {
    font-size: 0.8rem;
    text-transform: uppercase;
  }
  .stats #accumulated-transfers.graph-enabled {
      color: #a8d8ea
  }
  .stats #accumulated-fees.graph-enabled {
      color: #95e1d3
  }
  .stats #accumulated-txs.graph-enabled {
      color: #fce38a
  }
</style>