const league_id_2022 = "854978776533184512" // 2022
const league_id_2023 = "972782648546365440" // 2023
const league_id_2024 = "1124814687217676288" // 2024

const createCsvWriter = require("csv-writer").createObjectCsvWriter
const last_year = 2023
const upcoming_year = 2024
import { get } from "lodash"
import League from "./classes/League"
import { getKeeperInc } from "./utils"
// const LeagueBlank = new League({})
const run = async () => {
  const LeagueLast = new League({ input_league_year: last_year })
  await LeagueLast.init()

  // await LeagueLast.downloadDraftData()
  // await LeagueLast.getTransactions()
  let picks = await LeagueLast.getPicksData()
  const LeagueUpcoming = new League({ input_league_year: upcoming_year })
  await LeagueUpcoming.init()
  let keepers = await LeagueUpcoming.getKeepers({ preseason: true })
  let prevKeepers = await LeagueLast.getKeepers({
    postseason: true,
  })

  let csvData = keepers
    .map((k) => {
      // First, check if they are previous keeper.
      const { full_name, fantasy_positions, username } = k
      if (!full_name) {
        return {}
      }
      // compute new keeper costs and years kept
      let prevKeeper = prevKeepers.find((pk) => pk["﻿FULL_NAME"] === full_name)
      if (prevKeeper) {
        let prevCost = +prevKeeper.KEEPER_COST
        let prevYears = +prevKeeper.YEARS_KEPT_EXC
        let newYears = prevYears + 1
        let newInc = getKeeperInc(newYears)
        let newCost = prevCost + newInc
        return {
          full_name,
          fantasy_positions,
          username,
          amount: prevCost,
          keeper_cost: newCost,
          years_kept: newYears,
        }
      }
      // then check if they were a first-time keeper and free agent pickup
      let player = picks.find((p) => p.FULL_NAME === k.full_name)
      if (!player) {
        return { ...k, amount: 5, keeper_cost: 8, years_kept: 0 }
      }
      // Else this is a first-time keeper who was drafted
      let newInc = getKeeperInc(0)
      let keeper_cost = +player.AMOUNT + newInc
      return {
        full_name,
        fantasy_positions,
        username,
        amount: player.AMOUNT,
        keeper_cost: keeper_cost,
        years_kept: 0,
      }
    })
    .filter((k) => "full_name" in k)
  const header = Object.keys(csvData[0]).map((id) => ({ id, title: id }))
  const csvWriter = createCsvWriter({
    path: `keeper_costs.csv`,
    header,
  })
  csvWriter.writeRecords(csvData)
  console.log("run is done")
  //   await LeagueUpcoming.downloadDraftData()
}
run()
