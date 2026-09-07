#!/usr/bin/env python3
"""Render the printable and Markdown timetable from the canonical JSON file."""

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def period(session):
    start = session["start"] or "TBC"
    end = session["end"] or "TBC"
    return f"{start}–{end}"


def render(data):
    rows = []
    for day in data["days"]:
        for session in day["sessions"]:
            rows.append((day["day"], period(session), session["label"]))

    markdown = [
        f'# {data["title"]}',
        "",
        f'**{data["status"].capitalize()} — for discussion.** {data["notice"]}',
        "",
        '**Disciplines:** ' + ' · '.join(data["disciplines"]),
        "",
        "| Day | Time | Session |",
        "| --- | --- | --- |",
        *[f"| {day} | {time} | {label} |" for day, time, label in rows],
        "",
        *[f"- {note}" for note in data["notes"]],
        "",
        "## Editing",
        "",
        "Edit `operations/timetable.json`, then run `python3 operations/generate_timetable.py` from the project root. "
        "This regenerates `TIMETABLE.md` and `timetable.html`. The website imports the same JSON. "
        "Direct edits to this Markdown file are possible but will be overwritten on regeneration.",
        "",
    ]
    e = html.escape
    table_rows = "\n".join(
        f'<tr><th scope="row">{e(day)}</th><td>{e(time)}</td><td>{e(label)}</td></tr>'
        for day, time, label in rows
    )
    notes = "".join(f"<li>{e(note)}</li>" for note in data["notes"])
    document = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(data["title"])} — provisional</title>
<style>
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: #eee; color: #171717; font-family: Arial, sans-serif; line-height: 1.4; }}
main {{ max-width: 850px; margin: 30px auto; padding: 36px; background: white; border-top: 8px solid #b51f27; }}
.brand {{ font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }}
h1 {{ font-size: 32px; line-height: 1.1; margin: 12px 0 16px; }}
.status {{ font-weight: 700; color: #92202a; }}
p {{ margin: 8px 0 14px; }}
table {{ border-collapse: collapse; width: 100%; font-size: 13px; margin: 20px 0; }}
th, td {{ text-align: left; padding: 6px 10px; border-bottom: 1px solid #ddd; vertical-align: top; }}
thead {{ background: #171717; color: white; }}
tbody th {{ font-weight: 600; width: 22%; }}
td:nth-child(2) {{ white-space: nowrap; width: 26%; font-variant-numeric: tabular-nums; }}
li {{ margin: 5px 0; }}
ul {{ padding-left: 20px; font-size: 12px; }}
footer {{ color: #555; font-size: 11px; margin-top: 20px; }}
@media (max-width: 550px) {{ main {{ margin: 0; padding: 20px 12px; }} th, td {{ padding: 6px; }} h1 {{ font-size: 27px; }} }}
@page {{ size: A4; margin: 12mm; }}
@media print {{ body {{ background: white; }} main {{ margin: 0; padding: 12px 0 0; max-width: none; }} h1 {{ font-size: 26px; }} table {{ margin: 12px 0; font-size: 11px; }} th, td {{ padding: 4px 8px; }} thead {{ color: black; background: white; border-bottom: 2px solid black; }} tr {{ break-inside: avoid; }} p {{ font-size: 12px; }} footer {{ margin-top: 10px; }} }}
</style>
</head>
<body>
<main>
<div class="brand">The Pit Combat Academy</div>
<h1>{e(data["title"])}</h1>
<p class="status">Provisional — for discussion</p>
<p>{e(data["notice"])}</p>
<p><strong>Disciplines:</strong> {e(' · '.join(data["disciplines"]))}</p>
<table>
<thead><tr><th scope="col">Day</th><th scope="col">Time</th><th scope="col">Session</th></tr></thead>
<tbody>{table_rows}</tbody>
</table>
<ul>{notes}</ul>
<footer>Planning document · Not a confirmed class schedule. Print using your browser’s Print command.</footer>
</main>
</body>
</html>
'''
    return "\n".join(markdown), document


if __name__ == "__main__":
    data = json.loads((ROOT / "timetable.json").read_text())
    markdown, document = render(data)
    (ROOT / "TIMETABLE.md").write_text(markdown)
    (ROOT / "timetable.html").write_text(document)
    print("Generated operations/TIMETABLE.md and operations/timetable.html")
