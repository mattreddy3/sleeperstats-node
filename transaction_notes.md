Adds

- Roster_ID: data.league_transactions_by_player[0].adds[<playerid>]
- Amount: data.league_transactions_by_player[0].metadata.amount
- Timestamp: data.league_transactions_by_player[0].status_updated
- Type: data.league_transactions_by_player[0].type ("draft_pick"/"waiver"/"free_agent")

Drop present

- data.league_transactions_by_player[1].drops !== null
- Timestamp: data.league_transactions_by_player[0].status_updated

Process:

1.
