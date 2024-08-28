for each eligible keeper:

- Check the keepers_final_prevseason sheet
- - If found:
    | adjust `keeper_cost` against `amount` of new year based on `years_kept_exc` (0 = add 3 to `amount`, 1 = add 5 to `amount`)
    | increment `years_kept_exc` by 1
- - If not found:
    | add to keeper list: `keeper_cost` = `amount` + 3, `years_kept_exc`
