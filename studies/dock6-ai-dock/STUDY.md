# AI Dock Study (dock6)

## What it does
A floating glass "dock" for keeping an eye on several AI agents at once. Each agent is a round orb with a progress ring; agents work through simulated tasks, finish, and sometimes stop to ask the user a question.

## Main components
- **Dock** (`.dock`): vertical pill on the right side holding one row per agent, plus controls (add agent, focus mode).
- **Row / orb** (`.row`, `.orb`, `.ring`): agent icon with a progress ring, orbiting dot while working, and a badge for unseen results or questions.
- **Info panel** (`.info`): slides out on hover or tap with the task name, percentage and a progress bar.
- **Detail window** (`.win`): opens over a blurred scrim with project progress, task steps, the agent's question, results and a message input with attachments.
- **Picker** (`.pick`): "Add to dock" list of extra agents.

## User actions, feedback, states
| Action | Feedback |
|---|---|
| Hover / tap a row | Row background fades in, info panel springs open |
| Click a row | Detail window opens from the orb (scrim + blur) |
| Agent working (`.work`) | Ring fills, orbit dot spins, glyph breathes |
| Agent finishes (`.unseen`) | Green badge pops in, ripple on the orb |
| Agent asks (`.ask`) | Amber badge + repeating ripple, window shows the question with Approve / Skip buttons |
| Low quality (`.low`) | Ring turns red |
| Focus button | Rows collapse into a single summary row |
| Send / drop files | Task is given to that agent; attachments appear as chips |

## Where it lives in the code
Everything is in `index.html`:
- Styles: the `<template id="ai-dock-tpl">` `<style>` block (states are classes like `.work`, `.ask`, `.unseen`, `.focus`).
- Simulation loop: `tick()`, `startTask()`, `finish()`, `next()`, `run()` / `pause()`.
- Rendering: `render()`, `renderSum()`, `winRender()`.
- Window: `openWin()`, `closeWin()`.
- Input: `give()`, `addFiles()`, `buildSend()`, `buildPick()` / `togglePick()`.

## Dependencies
- Google Font **Poppins** (loaded from fonts.googleapis.com). Falls back to system-ui offline.
- No build step, no packages. Open `index.html` in a browser.
