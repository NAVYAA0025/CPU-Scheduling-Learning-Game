# Disk Duel

Disk Duel is an interactive educational game for learning CPU scheduling algorithms through lessons, quizzes, simulations, and visual performance comparisons. It uses plain HTML, CSS, JavaScript, and Python's standard library—no package installs, CDNs, accounts, or internet connection required.

## Features

- **Six stations:** FCFS, SJF, SRTF, Priority, Round Robin, and an algorithm-choice quiz-only station.
- **Short lessons** with a rule, a brief explanation, and an automatically loaded local lecture-video slot.
- **Shuffled quizzes** with explanation feedback based on the exact answer selected. Stations 2–5 also include a scheduler-choice question. Pass a station to open the next one; retry with a new shuffle if needed.
- **Final Level 6:** a prerequisite knowledge check followed by a 10-question algorithm-selection quiz. The quiz does not run the simulator or play a lesson video.
- **Workload lab:** edit up to 12 processes, run one of the five algorithms, view a Gantt chart and completion/turnaround/waiting metrics, or compare all five on the same input.
- **Quick guide** for the rules and scheduling terms; a progress JSON export is available from the map.
- **Offline behavior:** there are no third-party scripts, styles, fonts, or network services. Quiz progress is stored in local browser storage.

## How to Run

### Requirements

- Python 3.8 or newer
- A modern web browser
- No additional Python packages are required.

### Windows

Clone the repository and run:

```bash
python server.py
```
or:
```
py server.py
```
Then open:
```
http://127.0.0.1:8000
```
### Linux / macOS

Clone the repository and run:
```
./start-local.sh
```
Then open:
```
http://127.0.0.1:8000
```
### Custom Port

You can run the server on a different port:
```
python server.py --port 8080
```
Then open:
```
http://127.0.0.1:8080
```
## Scheduling Model

This is a deterministic teaching model for one CPU and whole-number time units:

- **FCFS:** non-preemptive; arrival time, then input-row order for ties.
- **SJF:** non-preemptive; chooses the shortest burst among processes already ready; ties use arrival time, then input order.
- **SRTF:** preemptive; chooses the least remaining burst; ties use arrival time, then input order. Arrivals are checked at whole time units.
- **Priority:** non-preemptive; smaller number means higher priority in this game; ties use arrival time, then input order.
- **Round Robin:** FIFO ready queue with a fixed positive integer quantum. New arrivals during a turn join before an unfinished process is returned to the queue.
- Turnaround time = completion time − arrival time.
- Waiting time = turnaround time − CPU burst time.

The lessons do not claim one scheduler is always best. Outcomes depend on the workload and the goal; real systems also consider factors such as response time, fairness, overhead, and burst-time estimates.

## Project files

```text
disk-duel/
├── index.html      page structure
├── styles.css      night sky, candy buttons, map, train, owl, loader
├── fx.js           starfield, hopping owl buddies, train art, confetti
├── game.js         lessons, quizzes, simulator, map logic
├── server.py / start-local.sh
├── assets/
│   ├── fonts/      Nunito Sans 400/500/700/800 (bundled, works offline)
│   ├── mascot/     owl poses sliced from the mascot sheet
│   ├── favicon.png
│   └── owl-teacher.png
└── lectures/
```
