# Contract: poll data file key and output lines

## D1. `oldest_age_in_days`

```json
{
  "title": "France — President Emmanuel Macron's approval rating",
  "vote_count": 1000,
  "oldest_age_in_days": 30,
  "data_points": [ … ]
}
```

- Optional. Absent: every data point is replayed, as before.
- A whole number ≥ 0. `0` replays only the latest point (today); `30` replays today and the 30 days before it.
- Measured on the moved dates (the latest point falls on today).

## D2. Refusal (exit 1, nothing written)

```
[populate] Error: "oldest_age_in_days" must be a whole number of at least 0, not -1
[populate] Error: "oldest_age_in_days" must be a whole number of at least 0, not 2.5
[populate] Error: "oldest_age_in_days" must be a whole number of at least 0, not "30"
[populate] Error: "oldest_age_in_days" must be a whole number of at least 0, not null
```

## D3. Kept-points line

Printed after the `Target:` line and before the first write, only when the limit ignores at least one point:

```
[populate] Kept 31 of 3,446 data points (oldest_age_in_days 30)
```

Every other output line is unchanged; the `Done:` and `Votes deleted: … Votes written: …` lines that
`populate-all-polls` reads keep their form.
