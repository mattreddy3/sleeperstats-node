import csv from "csv-parser"
import fs from "fs"
const createCsvWriter = require("csv-writer").createObjectCsvWriter
import _ from "lodash"
import { readFile } from "fs/promises"
const addComputedFields = (pick: any) => {
  let computedPick = {
    ...pick,
    full_name: `${pick.first_name} ${pick.last_name}`,
    // keeper_cost: +pick.amount + 3,
    // points_2022: 10,
  }
  return computedPick
}
export default class League {
  public league_id: string
  public league_year: number
  private _filesToRead = ["general", "passing", "scrimmage"]
  private picksFileName = "picks"
  private _apiBase = "https://api.sleeper.app/v1"
  private _scoringSettings?: ScoringSettings
  private _league: null | {} = null
  private _rosters: null | any[] = null
  private _playerRef: null | Record<string, any> = null
  initialized = false
  constructor({
    input_league_id,
    input_league_year,
  }: {
    input_league_id?: string
    input_league_year?: number
  }) {
    input_league_id ? (this.league_id = input_league_id) : (this.league_id = "")
    input_league_year
      ? (this.league_year = input_league_year)
      : (this.league_year = 0)
    if (!this.league_year && !this.league_id) {
      throw `Must provide either league id or league year.`
    }
  }
  init = async () => {
    if (this.initialized) {
      console.info(`League ${this.league_id} Already initialized`)
      return true
    }
    this._playerRef = JSON.parse(await readFile("data/player-ref.json", "utf8"))
    let api_base = this._apiBase
    if (this.league_year && !this.league_id) {
      const leaguesResponse = await fetch(
        `${api_base}/user/854978436689702912/leagues/nfl/${this.league_year}`
      )
      if (leaguesResponse.ok) {
        const leagues = await leaguesResponse.json()
        // assumes only one league
        this.league_id = leagues[0].league_id
        this._scoringSettings = leagues[0].scoring_settings
        this._league = leagues[0]
      } else {
        throw leaguesResponse.statusText
      }
    } else if (!this.league_year && this.league_id) {
      const leagueResponse = await fetch(`${api_base}/league/${this.league_id}`)
      if (!leagueResponse.ok) {
        console.error(`computePoints failed`)
        return this
      }
      const league = await leagueResponse.json()
      if (!this.league_year) {
        this.league_year = league.season
      }
      this._scoringSettings = league["scoring_settings"]
      this._league = league
    }
    this.initialized = true
  }
  private fetchRosters = async () => {
    const rosterRes = await fetch(
      `${this._apiBase}/league/${this.league_id}/rosters`
    )
    if (!rosterRes.ok) {
      throw `No rosters for league ${this.league_id} year ${this.league_year}`
    }
    let rosters = await rosterRes.json()
    const usersRes = await Promise.all(
      rosters.map((r: any) => {
        let owner = r.owner_id
        return fetch(`${this._apiBase}/user/${owner}`)
      })
    )
    const users = await Promise.all(
      usersRes.filter((res) => res.ok).map((res) => res.json())
    )
    const userMap = _.keyBy(users, "user_id")
    rosters = rosters.map((r: any) => {
      let owner = r.owner_id
      let user = userMap[r.owner_id]
      return { ...r, username: user.username }
    })
    this._rosters = rosters
    return rosters
  }
  private getRosters = async (): Promise<any[]> => {
    if (this._rosters === null) {
      await this.fetchRosters()
    }
    //@ts-ignore
    return this._rosters
  }
  private round = (value: number, precision: number) => {
    var multiplier = Math.pow(10, precision || 0)
    return Math.round(value * multiplier) / multiplier
  }
  private getStats = async (filesToRead: string[]): Promise<any> => {
    let allStats: any = {}
    let league_yr_temp = this.league_year
    const proms = filesToRead.map(function (filePath) {
      return new Promise((resolve, reject) => {
        fs.createReadStream(`data/stats-${filePath}_${league_yr_temp}.csv`)
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
  private computePoints = async (allStats: Player[]) => {
    if (allStats) {
      console.log("stats found")
    }
    if (!this._scoringSettings) {
      throw `Scoring settings not found for league ${this.league_id} year ${this.league_year}`
    }
    let scoringSettings = this._scoringSettings
    return Object.values(allStats).map((player: Player) => {
      if (player.general) {
        let pointsPass = isNaN(player.general["Passing Yds"])
          ? 0
          : this.round(
              scoringSettings.pass_yd * player.general["Passing Yds"],
              1
            )

        let pointsPassTD = isNaN(player.general["Passing TDs"])
          ? 0
          : this.round(
              scoringSettings.pass_td * player.general["Passing TDs"],
              1
            )
        let pointsRec = isNaN(player.general["Receiving Yds"])
          ? 0
          : this.round(
              scoringSettings.rec_yd * player.general["Receiving Yds"],
              1
            )
        let pointsRush = isNaN(player.general["Rushing Yds"])
          ? 0
          : this.round(
              scoringSettings.rush_yd * player.general["Rushing Yds"],
              1
            )
        let pointsRecTD = isNaN(player.general["Receiving TD"])
          ? 0
          : this.round(
              scoringSettings.rec_td * player.general["Receiving TD"],
              1
            )
        let pointsRushTD = isNaN(player.general["Rushing TD"])
          ? 0
          : this.round(
              scoringSettings.rush_td * player.general["Rushing TD"],
              1
            )
        let pointsRushFD = 0,
          pointsRecFD = 0
        if (player.scrimmage) {
          //TODO
          pointsRushFD = isNaN(player.general["Rushing 1D"])
            ? 0
            : this.round(
                scoringSettings.rush_fd * player.scrimmage["Rushing 1D"],
                1
              )

          pointsRecFD = isNaN(player.general["Receiving 1D"])
            ? 0
            : this.round(
                scoringSettings.rec_fd * player.scrimmage["Receiving 1D"],
                1
              )
        }
        // LOL typo - "Passint Int" from PFR data
        let pointsPassInt = isNaN(player.general["Passint Int"])
          ? 0
          : this.round(
              scoringSettings.pass_int * player.general["Passint Int"],
              1
            )
        let pointsFumL = isNaN(player.general["FL"])
          ? 0
          : this.round(scoringSettings.fum_lost * player.general["FL"], 1)

        //WHERE???
        let pointsPass2pt = isNaN(player.general["2PP"])
          ? 0
          : this.round(scoringSettings.pass_2pt * player.general["2PP"], 1)
        let points2pt = isNaN(player.general["2PM"])
          ? 0
          : //2pt plays are not tracked separately in pro football reference
            this.round(scoringSettings.rush_2pt * player.general["2PM"], 1)

        player.general.scoring = this.round(
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
        player.general.scoring_avg = this.round(
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

  getPicksData = async (): Promise<any[]> => {
    const readPicksProm: Promise<any[]> = new Promise((resolve, reject) => {
      let data: any[] = []
      if (fs.existsSync(`${this.picksFileName}_${this.league_year}.csv`)) {
        fs.createReadStream(`${this.picksFileName}_${this.league_year}.csv`)
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
        `${this._apiBase}/league/${this.league_id}/drafts`
      )
      if (!draftsResponse.ok) {
        throw `what the hell bru ${draftsResponse.statusText}`
      }
      const drafts = await draftsResponse.json()
      const draft_id = drafts[0]["draft_id"]
      const picksResponse = await fetch(
        `${this._apiBase}/draft/${draft_id}/picks`
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
        // { id: "points_2022", title: "POINTS_2022" },
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
        path: `${this.picksFileName}_${this.league_year}.csv`,
        header: headers,
      })
      csvWriter.writeRecords(massagedPicks)
      return massagedPicks
    }
    // .then(() => console.log("The CSV file was written successfully"))
    // console.log(picks)
  }
  private combineData = async (picks: any[], stats: any[]) => {
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
        pickData.POINTS_PER_DOLLAR = this.round(
          _.get(statData, "general.scoring") / pickData.AMOUNT,
          2
        )
        pickData.POINTS_AVG_PER_DOLLAR = this.round(
          _.get(statData, "general.scoring_avg") / pickData.AMOUNT,
          2
        )
        //TODO: OTHER POINTS? YARDS? STATS?
      }
    }
    //@ts-ignore
    return Object.values(pickMap)
  }
  /**
   * Step 1: Squash 2022 stats together
   * Step 2: compute 2022 points
   * Step 3: Squash stats and points into draft data
   */
  downloadDraftData = async () => {
    const allStats = await this.getStats(this._filesToRead)
    const combinedStats = await this.computePoints(allStats)
    const allPicks = await this.getPicksData()
    const combinedData = await this.combineData(allPicks, combinedStats)
    console.log("writing league", this.league_id)
    if (Array.isArray(combinedData) && combinedData.length === 0) {
      console.warn(
        "No data for league",
        this.league_id,
        "in year",
        this.league_year
      )
      return
    }
    const csvWriter = createCsvWriter({
      path: `combinedData_${this.league_year}.csv`,
      header: Object.keys(combinedData[0]).map((id) => ({ id, title: id })),
    })
    csvWriter.writeRecords(combinedData)
    console.log("done")
  }
  downloadKeeperData = async (ops: { preseason?: boolean }) => {
    let keepers = await this.getKeepers(ops)
    console.log(keepers)
  }
  private addPlayerData = async (ids: any[]): Promise<any[]> => {
    let playerRef = this._playerRef
    let that = this
    return Promise.all(
      ids.map(async (id) => {
        //@ts-ignore
        let ref = playerRef[id]
        if (ref) {
          let transactionHistory = await that._getPlayerTransactionHistory(id)
          if (transactionHistory.find((t: any) => !t.pre_trade_deadline)) {
            return []
          }
          // if a transaction exists past trade deadline - not a keeper
          return ref
        } else {
          return []
        }
      })
    )
  }
  /**
   *
   * This feature gets keepers or list of players eligible to be kept
   * For "pre-season" list of eligible keepers, use {preseason:true}
   * @param {preseason:boolean, postseason:boolean} `preseason` flag to get list of eligible keepers. `postseason` flag to get final keepers. Default `false` for both
   * @returns list of keepers
   */
  getKeepers = async ({
    preseason = false,
    postseason = false,
  }: {
    preseason?: boolean
    postseason?: boolean
  }): Promise<any[]> => {
    const rosters = await this.getRosters()
    let keeperMap: Record<number, any> = {}
    let keeperList: any[] = []
    // For postseason, just get the final csv from the dataset
    if (postseason) {
      return new Promise((resolve, reject) => {
        let data: any[] = []
        fs.createReadStream(`data/keepers_final_${this.league_year}.csv`)
          .pipe(csv())
          .on("data", (row: any) => {
            // console.log(row)
            data.push(row)
          })
          .on("end", () => {
            console.log(`${this.league_year} keepers done`)
            resolve(data)
          })
          .on("error", (err: any) => {
            reject(err)
          })
      })
    }
    for (let index = 0; index < rosters.length; index++) {
      const roster = rosters[index]
      let keepers: any[] = preseason ? roster.players : roster.keepers
      let filledKeepers = await this.addPlayerData(keepers)
      keeperMap[roster.username] = filledKeepers
      keeperList = keeperList.concat(
        filledKeepers.map((k) => {
          k.username = roster.username
          return k
        })
      )
    }
    return keeperList
    // return keeperMap
  }

  private _getPlayerTransactionQuery = (player_id: string) => {
    return {
      operationName: "league_transactions_by_player",
      variables: {},
      query: `query league_transactions_by_player {
      league_transactions_by_player(league_id: "${this.league_id}", player_id: "${player_id}") {
        adds
        consenter_ids
        created
        creator
        drops
        league_id
        leg
        metadata
        roster_ids
        settings
        status
        status_updated
        transaction_id
        draft_picks
        type
        player_map
        waiver_budget
      }
    }`,
    }
  }
  private _getPlayerTransactionHistory = async (player_id: string) => {
    let res = await fetch("https://sleeper.com/graphql", {
      headers: {
        accept: "application/json",
        "accept-language":
          "en,en-US;q=0.9,ca;q=0.8,de;q=0.7,fr;q=0.6,nl;q=0.5,es;q=0.4",
        authorization:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdmF0YXIiOiI4MmFlYzhlODExYjgzOWI4ZWMyNWQ3YjQ1OGFmZDU3YiIsImRpc3BsYXlfbmFtZSI6Im1yZWRkeSIsImV4cCI6MTc1NjAyMDExNSwiaXNfYm90IjpudWxsLCJpc19tYXN0ZXIiOm51bGwsInJlYWxfbmFtZSI6bnVsbCwidXNlcl9pZCI6ODU0OTc4NDM2Njg5NzAyOTEyfQ.f14miEoyDGJZdG4gvPpk8XU6tgWGpTZkOUUTywTYijM",
        "content-type": "application/json",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "x-sleeper-graphql-op": "league_transactions_by_player",
        cookie:
          "__spdt=19caecc06cb84947925de63aaacab096; intercom-id-xstxtwfr=d92b1228-1ceb-4c58-a263-ef4780fc7bf5; intercom-device-id-xstxtwfr=264b9045-099c-46ba-8d36-03e356f4609b; OptanonAlertBoxClosed=2024-08-24T07:21:58.620Z; _ga=GA1.1.710020635.1724511692; _ga_D47X7ML72N=GS1.1.1724511692.1.1.1724511749.3.0.0; OptanonConsent=isGpcEnabled=1&datestamp=Sun+Aug+25+2024+11%3A54%3A29+GMT%2B0200+(Central+European+Summer+Time)&version=202404.1.0&browserGpcFlag=1&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0003%3A0%2CC0001%3A1%2CC0002%3A0%2CC0004%3A0&geolocation=ES%3BMD&AwaitingReconsent=false; intercom-session-xstxtwfr=TEc3TFcrVDZsZXVSUWNXQUROSVY2YW0yN1hQZ3RkSllNb0g3alh0VUxBMVpYd3MzOHUwTjZQN1FWREgzNUNWeS0tWkNGc2VUMmNiUFY3RFQ2WlI0S2tyUT09--1ba80f1f7f64bc0ea22267a8a6c5b7ae4a55e974",
        Referer: "https://sleeper.com/leagues/1124814687217676288/predraft",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: JSON.stringify(this._getPlayerTransactionQuery(player_id)),
      method: "POST",
    })
    if (res.ok) {
      let data = await res.json()
      let returnData = data.data.league_transactions_by_player.map((t: any) => {
        return {
          amount: _.get(t, "metadata.amount"), // 0 unless draft
          trans_type: _.get(t, "type"),
          timestamp: _.get(t, "status_updated"),
          pre_trade_deadline:
            new Date(_.get(t, "status_updated")) <
            new Date("2023-11-21T00:00:00.000Z"),
          action:
            _.get(t, "adds") && _.get(t, `adds.${player_id}`) ? "add" : "drop",
        }
      })
      return returnData
    }
  }
}
