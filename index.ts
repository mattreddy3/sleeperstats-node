const league_id_2022 = "854978776533184512" // 2022
const league_id_2023 = "972782648546365440" // 2023

import League from "./classes/League"
// const LeagueBlank = new League({})
const run = async () => {
  const League22 = new League({ input_league_year: 2022 })
  await League22.init()
  await League22.downloadDraftData()
  const League23 = new League({ input_league_year: 2023 })
  await League23.init()

  //   await League23.downloadDraftData()
}
run()
