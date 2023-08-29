const league_id = "854978776533184512" // 2022
const createCsvWriter = require("csv-writer").createObjectCsvWriter
import _ from "lodash"
// New test
const csv = require("csv-parser")
const fs = require("fs")

const picksFileName = "picks"

function round(value: number, precision: number) {
  var multiplier = Math.pow(10, precision || 0)
  return Math.round(value * multiplier) / multiplier
}

/**
 * Step 1: Squash 2022 stats together
 * Step 2: compute 2022 points
 * Step 3: Squash stats and points into draft data
 */

let filesToRead = ["general", "passing", "scrimmage"]
const getStats = async (filesToRead: string[]): Promise<any> => {
  let allStats: any = {}
  const proms = filesToRead.map(function (filePath) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(`data/stats-${filePath}.csv`)
        .pipe(csv())
        .on("data", (row: any) => {
          if (allStats[row.key]) {
            allStats[row.key] = { ...allStats[row.key], [filePath]: row }
          } else {
            allStats[row.key] = { key: row.key, [filePath]: row }
          }
        })
        .on("end", () => {
          resolve(filePath + " done")
        })
    })
  })
  const outputs = await Promise.all(proms)
  console.log(Object.keys(allStats).length)
  console.log(outputs)
  // const results = await run()
  console.log(`fin all Stats`)
  return allStats
}
const computePoints = async (allStats: Player[]) => {
  if (allStats) {
    console.log("stats found")
  }
  const leagueResponse = await fetch(
    `https://api.sleeper.app/v1/league/${league_id}`
  )
  if (!leagueResponse.ok) {
    throw `computePoints failed`
  }
  const league = await leagueResponse.json()
  const scoringSettings: ScoringSettings = league["scoring_settings"]
  console.log(scoringSettings)

  return Object.values(allStats).map((player: Player) => {
    if (player.general) {
      let pointsPass = isNaN(player.general["Passing Yds"])
        ? 0
        : round(scoringSettings.pass_yd * player.general["Passing Yds"], 1)

      let pointsPassTD = isNaN(player.general["Passing TDs"])
        ? 0
        : round(scoringSettings.pass_td * player.general["Passing TDs"], 1)
      let pointsRec = isNaN(player.general["Receiving Yds"])
        ? 0
        : round(scoringSettings.rec_yd * player.general["Receiving Yds"], 1)
      let pointsRush = isNaN(player.general["Rushing Yds"])
        ? 0
        : round(scoringSettings.rush_yd * player.general["Rushing Yds"], 1)
      let pointsRecTD = isNaN(player.general["Receiving TD"])
        ? 0
        : round(scoringSettings.rec_td * player.general["Receiving TD"], 1)
      let pointsRushTD = isNaN(player.general["Rushing TD"])
        ? 0
        : round(scoringSettings.rush_td * player.general["Rushing TD"], 1)
      let pointsRushFD = 0,
        pointsRecFD = 0
      if (player.scrimmage) {
        //TODO
        pointsRushFD = isNaN(player.general["Rushing 1D"])
          ? 0
          : round(scoringSettings.rush_fd * player.scrimmage["Rushing 1D"], 1)

        pointsRecFD = isNaN(player.general["Receiving 1D"])
          ? 0
          : round(scoringSettings.rec_fd * player.scrimmage["Receiving 1D"], 1)
      }
      // LOL typo - "Passint Int" from PFR data
      let pointsPassInt = isNaN(player.general["Passint Int"])
        ? 0
        : round(scoringSettings.pass_int * player.general["Passint Int"], 1)
      let pointsFumL = isNaN(player.general["FL"])
        ? 0
        : round(scoringSettings.fum_lost * player.general["FL"], 1)

      //WHERE???
      let pointsPass2pt = isNaN(player.general["2PP"])
        ? 0
        : round(scoringSettings.pass_2pt * player.general["2PP"], 1)
      let points2pt = isNaN(player.general["2PM"])
        ? 0
        : //2pt plays are not tracked separately in pro football reference
          round(scoringSettings.rush_2pt * player.general["2PM"], 1)

      player.general.scoring = round(
        pointsRush +
          pointsPass +
          pointsRec +
          pointsRecTD +
          pointsPassTD +
          pointsRushTD +
          pointsRushFD +
          pointsRecFD +
          points2pt +
          pointsPass2pt +
          pointsFumL +
          pointsPassInt,
        1
      )
      player.general.scoring_avg = round(
        player.general.scoring / player.general.G,
        1
      )
      player.general.games = player.general.G
    } else {
      console.log(`${player.key} no general stats.`)
    }
    return player
    // console.log("compute points for ", _.get(player, "general.Player"))
  })
}

const addComputedFields = (pick: any) => {
  let computedPick = {
    ...pick,
    full_name: `${pick.first_name} ${pick.last_name}`,
    keeper_cost: +pick.amount + 3,
    // points_2022: 10,
  }
  return computedPick
}

const getPicksData = async (): Promise<any[]> => {
  const readPicksProm: Promise<any[]> = new Promise((resolve, reject) => {
    let data: any[] = []
    if (fs.existsSync(`${picksFileName}.csv`)) {
      fs.createReadStream(`${picksFileName}.csv`)
        .pipe(csv())
        .on("data", (row: any) => data.push(row))
        .on("end", () => {
          resolve(data)
        })
        .on("error", (err: any) => {
          reject(err)
        })
        .on("entry", (err: any) => {
          reject(err)
        })
    } else {
      reject("not found")
    }
  })
  let picks: any[]
  try {
    picks = await readPicksProm
    return picks
  } catch (e) {
    const draftsResponse = await fetch(
      `https://api.sleeper.app/v1/league/${league_id}/drafts`
    )
    if (!draftsResponse.ok) {
      throw `what the hell bru ${draftsResponse.statusText}`
    }
    const drafts = await draftsResponse.json()
    const draft_id = drafts[0]["draft_id"]
    const picksResponse = await fetch(
      `https://api.sleeper.app/v1/draft/${draft_id}/picks`
    )
    if (!picksResponse.ok) {
      throw `what the hell bru2 ${picksResponse.statusText}`
    }
    picks = await picksResponse.json()
    let fieldMap = {
      amount: "metadata.amount",
      first_name: "metadata.first_name",
      last_name: "metadata.last_name",
      position: "metadata.position",
      slot: "metadata.slot",
      team: "metadata.team",
      years_exp: "metadata.years_exp",
      round: "round",
      roster_id: "roster_id",
      player_id: "player_id",
      picked_by: "picked_by",
      pick_no: "pick_no",
      is_keeper: "is_keeper",
      draft_slot: "draft_slot",
      draft_id: "draft_id",
    }
    let customHeaders = [
      { id: "full_name", title: "FULL_NAME" },
      { id: "keeper_cost", title: "KEEPER_COST" },
      { id: "points_2022", title: "POINTS_2022" },
    ]
    let headers: { id: string; title: string }[] = Object.entries(fieldMap)
      .map(([title, id]) => ({ id: title, title: title.toLocaleUpperCase() }))
      .concat(customHeaders)
    let massagedPicks = _.chain(picks)
      .map(function (pick) {
        let pickedObj = _.pick(pick, Object.values(fieldMap))
        for (let i = 0; i < Object.entries(pickedObj.metadata).length; i++) {
          const [key, value] = Object.entries(pickedObj.metadata)[i]
          pickedObj[key] = value
        }
        delete pickedObj.metadata
        let finishedObj = addComputedFields(pickedObj)
        return finishedObj
      })
      .value()
    const csvWriter = createCsvWriter({
      path: `${picksFileName}.csv`,
      header: headers,
    })
    csvWriter.writeRecords(massagedPicks)
    return massagedPicks
  }
  // .then(() => console.log("The CSV file was written successfully"))
  // console.log(picks)
}
const combineData = async (picks: any[], stats: any[]) => {
  const playerNameMatcher = {
    "DK Metcalf": "D.K. Metcalf",
    "Mitch Trubisky": "Mitchell Trubisky",
    "Michael Pittman": "Michael Pittman Jr.",
    "Brian Robinson": "Brian Robinson Jr.",
    "Gabe Davis": "Gabriel Davis",
    "DJ Moore": "D.J. Moore",
    "Kenneth Walker": "Kenneth Walker III",
    "Joshua Palmer": "Josh Palmer",
    "Ronald Jones": "Ronald Jones II",
  }
  const pickMap = _.keyBy(picks, "FULL_NAME")
  const statMap = _.keyBy(stats, "general.Player")
  for (const name in pickMap) {
    if (Object.prototype.hasOwnProperty.call(pickMap, name)) {
      let pickData = pickMap[name]
      let statData = statMap[name]
      if (!statData && pickData.POSITION !== "DEF") {
        //@ts-ignore
        let matchName = playerNameMatcher[name]
        statData = statMap[matchName]
      }
      pickData.POINTS_2022 = _.get(statData, "general.scoring")
      pickData.POINTS_2022_AVG = _.get(statData, "general.scoring_avg")
      pickData.POINTS_PER_DOLLAR = round(
        _.get(statData, "general.scoring") / pickData.AMOUNT,
        2
      )
      pickData.POINTS_AVG_PER_DOLLAR = round(
        _.get(statData, "general.scoring_avg") / pickData.AMOUNT,
        2
      )
      //TODO: OTHER POINTS? YARDS? STATS?
    }
  }
  //@ts-ignore
  return Object.values(pickMap)
}
const run = async () => {
  const allStats = await getStats(filesToRead)
  const combinedStats = await computePoints(allStats)
  const allPicks = await getPicksData()
  const combinedData = await combineData(allPicks, combinedStats)
  const csvWriter = createCsvWriter({
    path: `combinedData.csv`,
    header: Object.keys(combinedData[0]).map((id) => ({ id, title: id })),
  })
  csvWriter.writeRecords(combinedData)
  console.log("done")
}
run()
