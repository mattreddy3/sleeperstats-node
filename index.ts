const league_id_2022 = "854978776533184512" // 2022
const league_id_2023 = "972782648546365440" // 2023
const createCsvWriter = require("csv-writer").createObjectCsvWriter

import League from "./classes/League"
// const LeagueBlank = new League({})
const run = async () => {
  const League22 = new League({ input_league_year: 2022 })
  await League22.init()
  //   await League22.downloadDraftData()
  let picks = await League22.getPicksData()
  const League23 = new League({ input_league_year: 2023 })
  await League23.init()
  let keepers = await League23.getKeepers()
  let csvData = keepers.map((k) => {
    let player = picks.find((p) => p.FULL_NAME === k.full_name)
    if (!player) {
      return { ...k, amount: 5, keeper_cost: 8 }
    }
    let { full_name, fantasy_positions, username } = k
    return {
      full_name,
      fantasy_positions,
      username,
      amount: player.AMOUNT,
      keeper_cost: player.KEEPER_COST,
    }
  })
  const header = Object.keys(csvData[0]).map((id) => ({ id, title: id }))
  const csvWriter = createCsvWriter({
    path: `keeper_costs.csv`,
    header,
  })
  csvWriter.writeRecords(csvData)
  console.log("run is done")
  //   await League23.downloadDraftData()
}
run()
