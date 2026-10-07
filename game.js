/* Disk Duel — self-contained, offline-first CPU scheduling game. No libraries or network calls. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const storageKey = 'disk-duel-progress-v1';

  const algorithms = [
    { id: 'fcfs', short: 'FCFS', name: 'First Come, First Served', rule: 'The ready process that arrived earliest gets the CPU first.', compact: 'Arrival order', description: 'Keep the queue in arrival order. Once a process starts, it runs until its CPU burst is done.', note: 'Non-preemptive. When arrival times tie, this game uses the order shown in the table.' },
    { id: 'sjf', short: 'SJF', name: 'Shortest Job First', rule: 'Among the processes already waiting, choose the one with the shortest CPU burst.', compact: 'Shortest available job', description: 'At each time the CPU becomes free, compare the burst times of processes that have already arrived. Pick the shortest; let it finish.', note: 'Non-preemptive. It needs a burst-time estimate; future arrivals cannot interrupt the job already running.' },
    { id: 'srtf', short: 'SRTF', name: 'Shortest Remaining Time First', rule: 'Run the ready process with the least CPU time still to do.', compact: 'Least remaining time', description: 'This is the preemptive, remaining-time version of SJF. Reconsider the choice when a new process arrives.', note: 'Preemptive. The simulator uses the listed CPU burst as known work; real systems usually have to estimate future CPU bursts.' },
    { id: 'priority', short: 'Priority', name: 'Priority Scheduling', rule: 'Choose the ready process with the highest priority.', compact: 'Highest priority', description: 'Use the priority value to decide which ready process goes next. Disk Duel explicitly treats the smaller number as the higher priority.', note: 'Non-preemptive in this learning game. Equal priorities use arrival order, then table order. Some systems use different conventions or preemptive variants.' },
    { id: 'rr', short: 'RR', name: 'Round Robin', rule: 'Give each ready process a turn, up to one time quantum, then rotate.', compact: 'Take turns · quantum', description: 'Move through the ready queue. A process uses at most the chosen quantum; if it still needs CPU time, it joins the back of the queue.', note: 'Preemptive. A smaller quantum often means more frequent turns and switching overhead; a very large quantum can make it resemble FCFS. There is no universally best quantum.' }
  ];

  const levels = [
    { id: 0, algorithm: 'fcfs', name: 'First Come, First Served', short: 'FCFS', station: 'Arrival lane', lede: 'Start with the queue that follows the clock: whoever is ready first gets their turn first.', explanation: 'Picture people lining up for a cozy late-night snack. FCFS keeps the ready processes in arrival order and serves the earliest arrival first. Once a process starts, it uses the CPU until its burst is complete.', points: ['Arrival time (AT) decides the queue order—not the size of the CPU burst.', 'This version is non-preemptive: a running process is not interrupted.', 'When arrivals tie, Disk Duel keeps the order shown in the process table.'], tip: 'If every process arrives together, use the table order as the tie-breaker. FCFS still does not sort by burst time.', assumptions: 'We follow arrival time and then input order. FCFS runs a chosen process to completion; it can leave a short job waiting behind a long one.', video: 'lectures/level-01-fcfs.mp4' },
    { id: 1, algorithm: 'sjf', name: 'Shortest Job First', short: 'SJF', station: 'Short-job bend', lede: 'At each choice, look at the jobs already waiting and pick the one with the shortest CPU burst.', explanation: 'SJF is like choosing the smallest book from the books already on the desk. When the CPU becomes free, compare only the processes that have arrived, then run the shortest burst to completion.', points: ['SJF uses the total CPU burst length of ready processes.', 'It is non-preemptive here: a new short job waits until the current job finishes.', 'Short jobs may wait less in some workloads; long jobs can wait a long time if short jobs keep arriving.'], tip: 'Check who has arrived before comparing burst times. A short process that has not arrived is not ready to run.', assumptions: 'The simulator assumes each burst time is known. This lesson uses non-preemptive SJF and uses arrival time, then table order, to break equal-burst ties.', video: 'lectures/level-02-sjf.mp4' },
    { id: 2, algorithm: 'srtf', name: 'Shortest Remaining Time First', short: 'SRTF', station: 'Switching tunnel', lede: 'SRTF keeps checking the work still left. A newly arrived shorter job can take over the CPU.', explanation: 'SRTF is the preemptive form of SJF. When a process arrives, compare its CPU time with the remaining time of the process currently running. The least remaining work runs; a paused process keeps the work it has already completed.', points: ['Compare remaining time—not each process’s original burst time.', 'A running process can be paused when a shorter remaining job arrives.', 'A preempted process keeps its remaining work and waits to be scheduled again.'], tip: 'Subtract the work already done before comparing. For example, 9 units total minus 4 completed leaves 5 units.', assumptions: 'The simulator checks arrivals at each whole time unit. On equal remaining times it favors earlier arrival, then table order. Burst lengths are treated as known for this exercise.', video: 'lectures/level-03-srtf.mp4' },
    { id: 3, algorithm: 'priority', name: 'Priority Scheduling', short: 'Priority', station: 'Owl lookout', lede: 'When importance is the rule, let the priority value—not job length—guide the next choice.', explanation: 'Every ready process has a priority number. For this game, smaller numbers mean higher priority. Choose the highest-priority ready process, then let it finish before making the next non-preemptive choice.', points: ['Priority and burst time are different pieces of information.', 'Disk Duel uses smaller number = higher priority; always check the convention.', 'A process with low priority may wait a long time if higher-priority work keeps arriving.'], tip: 'Read the convention first: in Disk Duel, priority 1 is higher than priority 4.', assumptions: 'This learning level uses non-preemptive priority scheduling and the explicit convention that smaller numbers mean higher priority. Equal priorities use arrival order, then table order.', video: 'lectures/level-04-priority.mp4' },
    { id: 4, algorithm: 'rr', name: 'Round Robin', short: 'RR', station: 'Last platform', lede: 'Round Robin shares the CPU in turns. The size of each turn is called the time quantum.', explanation: 'Ready processes wait in a queue. Each gets the CPU for up to one time quantum. If it finishes sooner, it leaves the system; if it still has work, it goes to the back of the queue for another turn.', points: ['A time quantum sets the maximum length of one turn.', 'If a process is unfinished when its quantum expires, it joins the back of the ready queue.', 'A very small quantum means frequent turns but more switching; a very large one can behave more like FCFS.'], tip: 'After one turn, subtract the CPU time actually used. Put an unfinished process at the back—not the front—of the ready queue.', assumptions: 'The simulator uses a single CPU, FIFO ready queue, and one fixed quantum. New arrivals during a turn join the queue in arrival order before the unfinished process is re-queued.', video: 'lectures/level-05-round-robin.mp4', tipVideo: 'lectures/level-05-round-robin-tip.mp4' },
    { id: 5, algorithm: 'choice', name: 'Choose the Right Scheduler', short: 'CHOOSE', station: 'Final destination', lede: 'Use the workload’s main requirement to choose the scheduler. This final destination is a quiz-only challenge.', explanation: 'Before choosing an algorithm, ask what the workload needs most: strict arrival order, shortest work, shortest work left, importance, or regular turns. The best rule depends on the workload, not on a universal winner.', points: ['FCFS suits strict arrival order.', 'SJF suits known short ready jobs.', 'SRTF suits preemptive shortest remaining work.', 'Priority suits explicit importance values.', 'Round Robin suits workloads that need recurring turns.'], tip: 'Match the workload first, then match the scheduling behavior. A short-run workload and a long-running interactive workload need different answers.', assumptions: 'This level does not run a simulation. It tests whether you can select the correct scheduler for each scenario.', quizOnly: true }
  ];

  function question(prompt, options, answer, feedback, context = '', hint = '') {
    return { prompt, options, answer, feedback, context, hint };
  }
  const bank = [
    [
      // Level 1 (FCFS) — from the new question set. Listed easy → hard.
      question('Three processes are waiting to execute:\nP1 — arrival 0, burst 8\nP2 — arrival 2, burst 3\nP3 — arrival 4, burst 1\nWhich process executes first under FCFS?', ['P1', 'P2', 'P3', 'P3 because it has the shortest burst time'], 0, ['Correct: P1 arrives at time 0, before P2 and P3. FCFS serves the earliest arrival first.', 'P2 arrives at time 2, after P1.', 'P3 arrives at time 4, after both P1 and P2.', 'Choosing the shortest burst is the idea behind SJF, not FCFS.'], 'Who gets the CPU first?', 'FCFS cares about arrival order, not burst time.'),
      question('Consider:\nP1 — arrival 4, burst 5\nP2 — arrival 0, burst 3\nP3 — arrival 2, burst 2\nP4 — arrival 1, burst 4\nWhat is the FCFS execution order?', ['P1 → P2 → P3 → P4', 'P2 → P4 → P3 → P1', 'P2 → P3 → P4 → P1', 'P4 → P2 → P3 → P1'], 1, ['P1 arrives last, so it cannot be first.', 'Correct: arrival times are P2 = 0, P4 = 1, P3 = 2, P1 = 4, so the order is P2 → P4 → P3 → P1.', 'P3 arrives after P4.', 'P4 arrives after P2.'], 'Find the FCFS order', 'Ignore burst times. Sort the processes by arrival time.'),
      question('All three processes arrive before the CPU starts:\nP1 — arrival 0, burst 2\nP2 — arrival 1, burst 10\nP3 — arrival 2, burst 1\nWhich process runs second under FCFS?', ['P1', 'P2', 'P3', 'P3 because it is shortest'], 1, ['P1 runs first.', 'Correct: the arrival order is P1 → P2 → P3, so P2 is the second process to run.', 'P3 arrives third.', 'FCFS doesn’t choose the shortest process.'], 'Burst time trap', 'Once you know the arrival order, forget the burst times.'),
      question('Consider:\nP1 — arrival 0, burst 4\nP2 — arrival 1, burst 3\nP3 — arrival 2, burst 2\nWhich Gantt chart represents FCFS?', ['P1 0–4 | P2 4–7 | P3 7–9', 'P1 0–4 | P3 4–6 | P2 6–9', 'P2 0–3 | P1 3–7 | P3 7–9', 'P3 0–2 | P1 2–6 | P2 6–9'], 0, ['Correct: P1 arrives first and runs 0–4. By time 4, both P2 and P3 have arrived, and P2 arrived earlier, so the order is P1 → P2 → P3.', 'P3 cannot jump ahead of P2.', 'P2 has not arrived at time 0.', 'P3 has not arrived at time 0.'], 'Gantt chart', 'P1 starts first. When it finishes, P2 has been waiting longer than P3.'),
      question('Under FCFS:\nP1 — arrival 0, burst 6\nP2 — arrival 1, burst 3\nP3 — arrival 2, burst 2\nWhat is the waiting time of P3?', ['2', '7', '9', '11'], 1, ['2 is P3’s burst time.', 'Correct: the FCFS order is P1 (0–6) → P2 (6–9) → P3 (9–11). P3 arrives at 2 but starts at 9, so waiting time = start − arrival = 9 − 2 = 7.', '9 is P3’s start time, not its waiting time.', '11 is P3’s completion time.'], 'Calculate waiting time', 'First find when P3 actually starts executing.'),
      question('Consider:\nP1 — burst 30\nP2 — burst 2\nP3 — burst 2\nP4 — burst 2\nAll arrive at time 0, and FCFS executes P1 first.\nWhat problem is illustrated?', ['Starvation', 'Convoy effect', 'Excessive context switching', 'Priority inversion'], 1, ['P2–P4 are delayed, but they eventually run. P1 isn’t starving anyone forever.', 'Correct: the short processes wait behind the long one — P1 (30) → P2 (2) → P3 (2) → P4 (2). Many short processes stuck behind a long process is the classic convoy effect.', 'FCFS generally has very few context switches.', 'No priorities are involved.'], 'Recognizing the convoy effect', 'Think about what happens to the three tiny processes behind P1.')
    ],
    [
      question('All processes are ready at time 0:\nP1 — burst 7\nP2 — burst 3\nP3 — burst 5\nP4 — burst 2\nWhich process does SJF select first?', ['P1', 'P2', 'P3', 'P4'], 3, ['P1 needs 7 units.', 'P2 needs 3 units.', 'P3 needs 5 units.', 'Correct: the burst times are P4 = 2 < P2 = 3 < P3 = 5 < P1 = 7, so P4 has the shortest burst.'], 'Choose the shortest job', 'SJF means the process with the shortest burst among the available processes.'),
      question('Consider:\nP1 — arrival 0, burst 8\nP2 — arrival 1, burst 2\nP3 — arrival 2, burst 1\nAt time 0, P1 starts running. What happens under non-preemptive SJF?', ['P1 is immediately replaced by P3', 'P1 finishes, then P3 runs', 'P2 runs immediately at time 1', 'P3 runs at time 2 and P1 resumes later'], 1, ['That would be preemption, which SJF does not do.', 'Correct: P1 starts at time 0 and cannot be preempted. At time 8, P2 needs 2 and P3 needs 1, so P3 runs next.', 'P2 cannot interrupt P1.', 'P3 cannot preempt P1 in non-preemptive SJF.'], 'SJF with arrivals', 'Non-preemptive means that once a process starts, it is not interrupted.'),
      question('A process needs 100 ms of CPU time. Short processes continuously arrive: 2 ms, 1 ms, 3 ms, 2 ms, 1 ms, …\nThe scheduler always selects the shortest available process.\nWhat is the biggest risk for the 100-ms process?', ['Convoy effect', 'Starvation', 'Excessive time quantum', 'Deadlock'], 1, ['The convoy effect is when short jobs wait behind a long job, usually in FCFS.', 'Correct: the long process can keep being postponed by newly arriving short jobs.', 'SJF does not use a time quantum.', 'No circular resource dependency is described.'], 'SJF’s weakness', 'What happens if short jobs never stop arriving?')
    ],
    [
      question('P1 is running with 8 ms remaining.\nP2 arrives with a burst time of 3 ms.\nWhat does SRTF do?', ['Continue P1 until it finishes', 'Switch to P2', 'Ignore P2', 'Run P1 and P2 simultaneously'], 1, ['That’s what non-preemptive SJF would do.', 'Correct: P2 has 3 ms remaining versus P1’s 8 ms.', 'SRTF considers newly arrived processes.', 'A single CPU executes one process at a time.'], 'The key difference', 'Compare the remaining time, not the original arrival order.'),
      question('P1 is running with 4 ms remaining.\nP2 arrives and requires 7 ms.\nWhat happens?', ['P2 preempts P1', 'P1 continues', 'P2 always runs because it is newer', 'Both execute together'], 1, ['P2 is longer.', 'Correct: P1 has only 4 ms remaining.', 'Arrival time alone doesn’t determine SRTF.', 'One CPU can’t execute both simultaneously.'], 'When SRTF does NOT preempt', 'SRTF doesn’t automatically prefer new processes. It compares remaining times.'),
      question('P1 has an original burst time of 12 ms. It has already executed for 5 ms.\nP2 arrives with a burst time of 4 ms.\nWhich process does SRTF prefer?', ['P1', 'P2', 'Both', 'Whichever arrived first'], 1, ['P1 has 12 − 5 = 7 ms remaining, more than P2.', 'Correct: P1 has 12 − 5 = 7 ms remaining and P2 needs only 4 ms, so P2 is shorter.', 'SRTF selects the shortest remaining process.', 'Arrival order isn’t the main selection rule.'], 'Calculate remaining time', 'First calculate P1’s remaining time.')
    ],
    [
      question('Smaller number = higher priority.\nP1 — burst 2, priority 4\nP2 — burst 15, priority 1\nP3 — burst 5, priority 3\nWhich process runs first?', ['P1', 'P2', 'P3', 'P1 because it is shortest'], 1, ['P1 is shortest but has lower priority.', 'Correct: priority 1 is the highest.', 'Priority 3 is below priority 1.', 'That’s SJF reasoning.'], 'Priority beats burst time', 'The question says Priority Scheduling. Don’t accidentally use SJF.'),
      question('Smaller number = higher priority. Priority Scheduling is non-preemptive.\nP1 — arrival 0, burst 5, priority 2\nP2 — arrival 1, burst 3, priority 2\nP3 — arrival 2, burst 4, priority 1\nWhich process runs second?', ['P1', 'P2', 'P3', 'P2 and P3 together'], 2, ['P1 already ran first.', 'P3 has higher priority than P2.', 'Correct: P1 starts at time 0 and runs until time 5. At time 5, P2 has priority 2 and P3 has priority 1, so P3 runs next.', 'One CPU runs one process at a time.'], 'Priority tie', 'P1 starts at time 0. Can P3 interrupt it?'),
      question('A low-priority process has been waiting for a long time.\nNew high-priority processes keep arriving.\nWhat problem may occur?', ['Convoy effect', 'Starvation', 'Context-switch overhead caused by quantum', 'SJF optimization'], 1, ['The convoy effect is associated with long jobs blocking short ones.', 'Correct: the low-priority process may wait indefinitely.', 'Priority Scheduling does not use a time quantum.', 'SJF is a different scheduling algorithm.'], 'Priority starvation', 'Is the low-priority process getting a chance to execute?')
    ],
    [
      question('In Round Robin, what does the time quantum determine?', ['The maximum amount of CPU time a process gets in one turn', 'The total CPU time a process can ever receive', 'The priority of a process', 'The burst time of a process'], 0, ['Correct: a process can use up to one quantum before being moved to the back if it still has work.', 'A process can receive many turns.', 'Priority is a different scheduling concept.', 'Burst time is the amount of CPU work the process requires.'], 'What does the quantum actually control?', 'Think of the quantum as the length of a process’s turn.'),
      question('Ready queue: P1 → P2 → P3\nP1 — burst 5\nP2 — burst 4\nP3 — burst 3\nTime quantum = 2\nWhat are the first three CPU turns?', ['P1 → P1 → P1', 'P1 → P2 → P3', 'P3 → P2 → P1', 'P2 → P3 → P1'], 1, ['P1 must go to the back after its quantum.', 'Correct: the ready queue rotates P1 → P2 → P3.', 'This reverses the queue.', 'P1 is first.'], 'First rotation', 'Each unfinished process gets up to one quantum before going to the back.'),
      question('P1 needs 1 ms. The time quantum is 4 ms.\nWhat happens when P1 gets the CPU?', ['P1 runs for 4 ms', 'P1 runs for 1 ms and finishes', 'P1 is skipped', 'P1 runs for 3 ms'], 1, ['P1 only needs 1 ms.', 'Correct: it finishes before its quantum expires.', 'P1 is ready and gets its turn.', 'There is no reason to run it for 3 ms after it has only 1 ms of work.'], 'Process finishes before quantum', 'A quantum is a maximum time, not a requirement to run that long.'),
      question('P1 needs 7 ms. Quantum = 3 ms.\nHow much CPU time does P1 still need after its first turn?', ['3 ms', '4 ms', '7 ms', '10 ms'], 1, ['3 ms is the amount P1 already used.', 'Correct: 7 − 3 = 4 ms remain.', '7 ms was the original burst.', 'CPU time is subtracted, not added.'], 'Remaining time', 'Subtract the CPU time it just received.'),
      question('Ready queue: P1 → P2 → P3\nP1 — burst 5\nP2 — burst 3\nP3 — burst 2\nQuantum = 2.\nWhich execution sequence is correct?', ['P1 → P2 → P3 → P1 → P2 → P1', 'P1 → P1 → P2 → P2 → P3', 'P3 → P2 → P1 → P3 → P2', 'P1 → P2 → P3 → P2 → P1'], 0, ['Correct: P1 uses 2 (3 left), P2 uses 2 (1 left), P3 finishes, P1 uses 2 (1 left), P2 finishes, P1 finishes. This follows the ready-queue rotation.', 'P1 cannot immediately take another turn.', 'The initial ready queue is reversed.', 'P2 and P1 are in the wrong order after P3.'], 'Complete RR simulation', 'Write down the remaining time after every turn.'),
      question('A system has 20 CPU-bound processes. The Round Robin quantum is reduced from 10 ms to 1 ms.\nWhat is the most likely effect?', ['Fewer context switches', 'More context switches', 'Round Robin becomes SJF', 'Processes stop being preempted'], 1, ['A smaller quantum means processes are switched more frequently.', 'Correct: more frequent turns mean more context switches.', 'Changing the quantum doesn’t turn RR into SJF.', 'Round Robin remains preemptive.'], 'Small quantum', 'Ask yourself how often the CPU must move from one process to another.'),
      question('A Round Robin scheduler uses a quantum of 1000 ms. Every process in the workload needs less than 100 ms of CPU time.\nWhat will the scheduling behavior most closely resemble?', ['SJF', 'SRTF', 'FCFS', 'Priority Scheduling'], 2, ['No shortest-job comparison occurs.', 'There is no shortest-remaining-time comparison.', 'Correct: every process finishes before its quantum expires, so each effectively completes its turn before the next one runs. The behavior becomes similar to FCFS.', 'No priorities are involved.'], 'Very large quantum', 'Will any process actually use up its quantum?'),
      question('A desktop workload is interactive. Two configurations are tested:\n1 ms quantum — context switches: very high, responsiveness: excellent\n20 ms quantum — context switches: moderate, responsiveness: good\nWhich is likely to provide the better overall balance?', ['1 ms', '20 ms', 'Both must be identical', 'Quantum has no effect'], 1, ['Although responsiveness may be excellent, extremely frequent context switches can waste CPU time.', 'Correct: 20 ms can provide good responsiveness while avoiding excessive switching.', 'The two configurations clearly have different behavior.', 'Quantum directly affects scheduling behavior.'], 'Choosing between two quanta', 'Think about the trade-off between responsiveness and context-switch overhead.')
    ]
  ];

  // Comparison sets (shown after the basic set). Each list is kept in easy → hard order.
  const comparisonBank = {
    1: [
      question('All processes arrive at time 0:\nP1 — burst 10\nP2 — burst 2\nP3 — burst 4\nWhich algorithm produces the lower average waiting time?', ['FCFS', 'SJF', 'Both are equal', 'Cannot determine'], 1, ['FCFS gives a higher average waiting time.', 'Correct: FCFS runs P1 → P2 → P3 with waits 0, 10, 12 (average 7.33). SJF runs P2 → P3 → P1 with waits 0, 2, 6 (average 2.67).', 'The averages are different.', 'Enough information is provided to calculate both.'], 'FCFS vs SJF', 'Work out the order under each algorithm.'),
      question('Which workload gives SJF the least opportunity to improve the average waiting time compared with FCFS, assuming all processes arrive together?', ['2, 3, 50, 60', '5, 5, 5, 5', '1, 20, 30, 40', '2, 50, 3, 80'], 1, ['Very different burst times give SJF a significant opportunity to help short jobs.', 'Correct: every job takes 5 units, so every ordering gives the same waiting times.', 'The burst times differ a lot, so SJF has a big opportunity to improve on FCFS.', 'The burst times differ a lot, so SJF has a big opportunity to improve on FCFS.'], 'When SJF has little advantage', 'If every process has the same length, changing their order doesn’t matter much.'),
      question('A batch system has these characteristics:\nAll jobs are available at the beginning.\nBurst times are known accurately.\nJob lengths vary greatly.\nGoal: minimize average waiting time.\nWhich is the best choice?', ['FCFS', 'SJF', 'Round Robin', 'Priority'], 1, ['FCFS ignores burst length.', 'Correct: this workload matches SJF’s main strength.', 'Round Robin is mainly useful for fair time sharing.', 'No importance/priority requirement is given.'], 'Choose between FCFS and SJF', 'Which algorithm is specifically designed to put shorter jobs ahead of longer jobs?')
    ],
    2: [
      question('Consider:\nP1 — arrival 0, burst 10\nP2 — arrival 3, burst 2\nWhich statement is correct?', ['SJF and SRTF must produce exactly the same execution', 'SRTF can run P2 before P1 finishes, while SJF cannot', 'SJF is preemptive but SRTF is not', 'SRTF ignores burst time'], 1, ['They can differ when a new shorter process arrives.', 'Correct: SRTF can interrupt P1 when P2 arrives.', 'The opposite is true.', 'SRTF is based on remaining burst time.'], 'SJF vs SRTF', 'The important word is preemptive.'),
      question('Consider:\nP1 — arrival 0, burst 8\nP2 — arrival 2, burst 4\nP3 — arrival 3, burst 1\nWhich process executes immediately after P3 finishes?', ['P1', 'P2', 'P3 again', 'CPU becomes idle'], 1, ['P1 has 6 ms remaining, more than P2.', 'Correct: P1 runs 0–2 (6 ms left). At time 2, P2 (4 ms) preempts P1. At time 3, P3 (1 ms) preempts P2 (3 ms left). P3 finishes at time 4, and P2 has only 3 ms remaining versus P1’s 6 ms.', 'P3 has already finished.', 'P1 and P2 are still waiting, so the CPU is not idle.'], 'Full SRTF simulation', 'Track how much work P1 and P2 have remaining when P3 arrives.'),
      question('A server uses SRTF. Short requests arrive frequently while long requests are running.\nWhat is a likely consequence?', ['More preemptions and context switches', 'No process can ever be preempted', 'Every process gets exactly one equal turn', 'Processes are executed strictly by arrival time'], 0, ['Correct: new short jobs can repeatedly preempt the current process.', 'SRTF is explicitly preemptive.', 'Equal time turns describe Round Robin.', 'Strict arrival order describes FCFS.'], 'Why more context switches?', 'What happens whenever a newly arriving process is shorter than the current one?')
    ],
    3: [
      question('A payment system has:\nBackup — 2 ms, Low priority\nPayment validation — 20 ms, High priority\nThe requirement: payment validation must execute before background backup tasks, regardless of burst time.\nWhich algorithm best matches the requirement?', ['FCFS', 'SJF', 'SRTF', 'Priority Scheduling'], 3, ['FCFS cares about arrival order.', 'SJF would favor the 2-ms backup.', 'SRTF also favors shorter remaining work.', 'Correct: Priority Scheduling allows importance to determine execution order.'], 'Importance vs length', 'What property does the requirement explicitly say matters?'),
      question('At time 0:\nP1 — burst 2, priority 5\nP2 — burst 8, priority 1\nP3 — burst 3, priority 4\nWhich algorithm chooses a different first process from SJF?', ['FCFS', 'Priority Scheduling', 'SJF', 'All choose P1'], 1, ['No arrival order difference is specified.', 'Correct: SJF chooses P1 because it has burst 2, while Priority chooses P2 because priority 1 is highest.', 'SJF definitely chooses P1.', 'Priority chooses P2.'], 'Priority vs SJF', 'First find who SJF chooses, then find who Priority chooses.'),
      question('P1 is currently running with priority 3. At time 4, P2 arrives with priority 1.\nYour system uses non-preemptive Priority Scheduling.\nWhat happens?', ['P2 immediately preempts P1', 'P1 continues until it finishes', 'P2 is ignored forever', 'Both execute simultaneously'], 1, ['Immediate preemption would require a preemptive priority scheduler.', 'Correct: P1 continues because the scheduler is non-preemptive.', 'P2 will be considered when the CPU becomes available.', 'A single CPU cannot execute both simultaneously.'], 'Preemptive vs non-preemptive', 'The word non-preemptive is important.')
    ],
    4: [
      question('A computer is shared by many users running terminals, text editors, browsers, and IDEs.\nUsers complain if one CPU-heavy program makes everyone else’s applications freeze.\nWhich algorithm is the best fit?', ['FCFS', 'SJF', 'SRTF', 'Round Robin'], 3, ['A long process can block everyone behind it.', 'SJF favors short jobs and can starve long jobs.', 'SRTF can favor short jobs but may repeatedly preempt long ones.', 'Correct: RR provides regular CPU turns and good fairness for interactive workloads.'], 'Interactive workload', 'Which algorithm repeatedly gives each ready process a turn?'),
      question('A server has a long-running process. Every few milliseconds, very short requests arrive.\nThe main objective is to let short requests finish quickly, even if that means interrupting the long process.\nWhich is the best choice?', ['FCFS', 'SJF', 'SRTF', 'Round Robin'], 2, ['FCFS would let the long process continue.', 'Non-preemptive SJF cannot interrupt the running process.', 'Correct: SRTF can preempt the long process when a shorter job arrives.', 'RR gives everyone a turn, but doesn’t specifically choose the shortest remaining job.'], 'Short jobs arriving dynamically', 'The short requests arrive while another process is already running.'),
      question('A system has: emergency shutdown, network processing, background backup, and log cleanup.\nThe requirement: emergency tasks must be handled before background work, even if they require more CPU time.\nWhich algorithm best matches the requirement?', ['FCFS', 'SJF', 'Priority Scheduling', 'Round Robin'], 2, ['Arrival order doesn’t represent importance.', 'SJF would favor shorter jobs regardless of importance.', 'Correct: Priority Scheduling explicitly represents importance.', 'RR focuses on fairness, not criticality.'], 'Critical tasks', 'What matters more here: length, arrival order, or importance?'),
      question('A batch server has 10 jobs. All jobs arrive before execution begins. Their CPU bursts are accurately known: 2, 3, 4, 5, 40, 50, 60, 70, 80, 100\nThe only goal is to minimize average waiting time.\nWhich algorithm is the best choice?', ['FCFS', 'SJF', 'Priority Scheduling', 'Round Robin'], 1, ['FCFS ignores the huge differences in burst times.', 'Correct: SJF is designed to minimize average waiting time when burst times are known and jobs are available.', 'No importance/priority information is given.', 'RR is primarily useful for fair time sharing and responsiveness.'], 'Final comparison', 'There is no requirement for fairness, priority, or interactive response. What metric is being optimized?')
    ]
  };

  // Level 6 — from Format.pdf. Order is deliberate (easy → hard); do not shuffle.
  const level6Quiz = [
    question('A batch server receives 5 jobs. All jobs are ready at the same time, and their CPU burst times are known accurately.\nP1 = 40 ms · P2 = 5 ms · P3 = 8 ms · P4 = 3 ms · P5 = 25 ms\nThe main objective is to minimize average waiting time. Which algorithm is most appropriate?', ['FCFS', 'SJF', 'Priority Scheduling', 'Round Robin'], 1, ['FCFS runs in arrival order. It doesn’t care that P4 needs only 3 ms.', 'Correct: SJF selects the process with the shortest CPU burst first: P4(3) → P2(5) → P3(8) → P5(25) → P1(40). This minimizes average waiting time when all processes are available and burst times are known.', 'No priority information is given. The important factor here is burst length.', 'Round Robin is designed mainly for fair CPU sharing and responsiveness, not minimum average waiting time.'], 'Batch Processing — Known Burst Times', 'If you know exactly how long every job will take, which algorithm can put the shortest jobs first?'),
    question('A university has 50 students sharing a server. Their processes include browsers, terminals, editors, and IDEs. Processes continuously arrive and finish.\nEvery process should get CPU time. No process should monopolize the CPU. Users should experience good response time.\nWhich algorithm is most appropriate?', ['FCFS', 'SJF', 'Round Robin', 'Priority Scheduling'], 2, ['A long process can hold the CPU while everyone else waits.', 'Short jobs get preference, but fairness isn’t guaranteed.', 'Correct: Round Robin gives each process a time quantum — P1 → P2 → P3 → P4 → P1 → P2 → … — which provides fairness and good responsiveness.', 'Low-priority processes may wait indefinitely if high-priority work keeps arriving.'], 'Interactive Computer Lab', 'Think about multiple users who all need a chance to use the CPU.'),
    question('An industrial control system has these processes:\nP1 Temperature monitoring — High\nP2 Emergency shutdown — Very High\nP3 Data logging — Low\nP4 Display update — Medium\nP5 Statistics — Low\nEmergency and safety-critical tasks must run before ordinary tasks. Which algorithm is most appropriate?', ['SJF', 'FCFS', 'Priority Scheduling', 'Round Robin'], 2, ['A low-priority task could be shorter than an emergency task and incorrectly run first.', 'Arrival order doesn’t represent importance.', 'Correct: the workload explicitly gives each task a priority. Emergency shutdown should take precedence over logging, statistics, etc.', 'Round Robin provides fairness, but emergency tasks may need preferential treatment.'], 'Emergency System', 'Does CPU burst length matter here, or does the importance of the task matter?'),
    question('A small accounting system receives jobs in this order: Payroll → Invoice → Report → Backup. The jobs are roughly similar in size.\nThe administrator wants extremely simple scheduling, low scheduling overhead, and jobs handled in arrival order.\nWhich algorithm should be used?', ['SRTF', 'FCFS', 'Round Robin', 'Priority Scheduling'], 1, ['SRTF requires comparing remaining burst times and can cause more preemption.', 'Correct: FCFS simply processes Payroll → Invoice → Report → Backup. It is easy to implement and has very little scheduling complexity.', 'Round Robin is unnecessary if fairness among interactive users isn’t needed.', 'No priority requirement exists.'], 'Simple Batch Queue', 'The administrator isn’t asking for optimization—just simplicity and arrival order.'),
    question('A CPU is currently executing P1 with 100 ms remaining. Then:\nt = 10 ms → P2 arrives, needs 4 ms\nt = 15 ms → P3 arrives, needs 2 ms\nt = 20 ms → P4 arrives, needs 3 ms\nThe system wants short jobs to finish as quickly as possible, even if a long job is already running. Which algorithm is best?', ['FCFS', 'SJF (non-preemptive)', 'SRTF', 'Round Robin'], 2, ['P1 continues until completion.', 'Non-preemptive SJF doesn’t interrupt P1.', 'Correct: SRTF is the preemptive version of SJF. When P2 arrives, P1 has 90 ms left and P2 needs 4 ms, so P2 gets the CPU because it has the shortest remaining time. Later, P3 may preempt P2 if appropriate.', 'Round Robin uses a time quantum rather than choosing based on shortest remaining time.'], 'Long Process + Short Arrivals', 'A short process arrives while another process is already running. Which algorithm can interrupt the current process?'),
    question('P1 = 200 ms is waiting. While it waits, new short processes keep arriving: P2 = 2 ms, P3 = 1 ms, P4 = 3 ms, P5 = 2 ms, P6 = 1 ms, …\nThe scheduler always chooses the process with the shortest remaining CPU burst.\nWhat is the biggest problem P1 may experience?', ['Convoy effect', 'Starvation', 'Excessive fairness', 'Deadlock'], 1, ['The convoy effect is typically associated with FCFS, where short processes wait behind a long process.', 'Correct: P1 may continuously lose to newly arriving short processes (Short → Short → Short → … while P1 waits). A process is repeatedly denied CPU access, so P1 can wait for a very long time.', 'The problem is actually a lack of fairness for P1.', 'No resource dependency or circular waiting exists.'], 'Starvation Scenario', 'What happens to a long process if short processes keep arriving?'),
    question('A system receives:\nt = 0 → P1 arrives, 20 ms\nt = 2 → P2 arrives, 3 ms\nThe requirement is that when P2 arrives, P1 should immediately give up the CPU so P2 can finish first.\nWhich algorithm should be selected?', ['FCFS', 'SJF', 'SRTF', 'Priority'], 2, ['P1 continues until completion.', 'SJF is non-preemptive, so P1 continues once started.', 'Correct: at t = 2, P1 has 18 ms remaining and P2 needs 3 ms. SRTF compares remaining times and preempts P1: P1 → P2 → P1. The shortest remaining job gets the CPU immediately.', 'No priority information is given.'], 'Choosing Between SJF and SRTF', 'The important word is “immediately.”'),
    question('Four users are running CPU-heavy programs: User A — video processing, User B — compilation, User C — simulation, User D — data analysis. All four programs can run for several seconds.\nNo user should get the CPU for a long continuous period. Each user should get regular opportunities to execute.\nWhich algorithm is most suitable?', ['FCFS', 'SJF', 'Priority', 'Round Robin'], 3, ['One CPU-intensive process could run for a very long time.', 'Long-running processes could be heavily disadvantaged.', 'No difference in importance is specified.', 'Correct: with a quantum of 20 ms, the order is A → B → C → D → A → B → C → D → …, so each user receives regular CPU time. Round Robin is designed for fair CPU sharing.'], 'CPU Sharing Among Users', 'Imagine giving each user a small slice of CPU time repeatedly.'),
    question('A server has:\nP1 — Backup · 5 ms · Low\nP2 — Payment validation · 20 ms · High\nP3 — Log cleanup · 3 ms · Low\nThe organization says payment validation must run before less important tasks, even when those tasks have shorter CPU bursts.\nWhich algorithm is most appropriate?', ['SJF', 'Priority Scheduling', 'FCFS', 'Round Robin'], 1, ['SJF would favor P3 because it is only 3 ms.', 'Correct: P2 has higher importance. Even though P1 and P3 have shorter bursts, P2 should run first. This is exactly what priority scheduling is designed for.', 'FCFS depends only on arrival order.', 'Round Robin gives everyone CPU slices rather than explicitly prioritizing critical work.'], 'Critical Task vs Short Task', 'What does the organization explicitly say matters more: burst time or importance?'),
    question('A mobile operating system has this workload: P1 — long computation, P2 — short user interaction, P3 — short user interaction, P4 — medium computation, P5 — short user interaction. New processes can arrive at any time.\nRequirements: (1) interactive apps should respond quickly, (2) no process should be ignored indefinitely, (3) CPU time should be shared fairly, (4) context-switch overhead should be reasonable.\nWhich algorithm is the best overall choice?', ['FCFS', 'SJF', 'SRTF', 'Round Robin'], 3, ['P1 could make interactive processes wait a long time.', 'SJF favors short jobs and can starve long jobs.', 'SRTF gives excellent response to short jobs but can cause starvation and potentially many context switches.', 'Correct: Round Robin provides fairness (every process gets CPU time), responsiveness (interactive processes don’t wait for long jobs), bounded waiting (processes repeatedly get a turn), and controlled overhead (an appropriately chosen quantum avoids excessive context switching).'], 'Final Challenge — Choose the Best Overall', 'Which algorithm was specifically designed for fair CPU sharing among processes that need regular response?')
  ];

  const sampleWorkload = [
    { id: 'P1', arrival: 0, burst: 7, priority: 3 },
    { id: 'P2', arrival: 2, burst: 3, priority: 2 },
    { id: 'P3', arrival: 4, burst: 1, priority: 1 },
    { id: 'P4', arrival: 4, burst: 5, priority: 2 }
  ];

  let progress = loadProgress();
  let currentLevel = 0;
  let currentView = 'journey';
  let activeQuiz = null;
  let finalQuizProgress = null;
  let toastTimer = null;

  function loadProgress() {
    const blank = { points: 0, cleared: [], best: {}, unlockedThrough: 0, bestStreak: 0, quizzes: 0, hasSeenGuide: false };
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!data || typeof data !== 'object') return blank;
      return { ...blank, ...data, cleared: Array.isArray(data.cleared) ? data.cleared : [], best: data.best && typeof data.best === 'object' ? data.best : {}, hasSeenGuide: Boolean(data.hasSeenGuide) };
    } catch { return blank; }
  }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { showToast('This browser could not save progress. Your current visit still works.'); }
    renderProgress();
  }
  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function setView(name, focus = true) {
    if (currentView === 'notes' && name !== 'notes') {
      progress.hasSeenGuide = true;
      persist();
    }
    currentView = name;
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
    $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === name));
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    if (window.Owl) { Owl.layout(name); Owl.view(name); }
    if (name === 'journey') setTimeout(arriveAtStop, 420);
    if (focus) {
      const h = $(`#view-${name} h1`);
      if (h) { h.setAttribute('tabindex', '-1'); setTimeout(() => h.focus({ preventScroll: true }), 80); }
    }
  }
  let transitionBusy = false;
  const tips = ['Smaller priority number = higher priority in this game.', 'Round Robin: unfinished jobs go to the back of the queue.', 'SRTF compares the work still left, not the original burst.', 'FCFS follows arrival order, nothing else.', 'SJF picks the shortest job among those already waiting.'];
  function showScreenLoader(message, duration = 720) {
    const loader = $('#screen-loader'), wait = matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : duration;
    $('#loader-title').textContent = message; $('#loader-tip').textContent = tips[Math.floor(Math.random() * tips.length)];
    loader.style.setProperty('--dur', `${wait}ms`);
    loader.hidden = false; loader.classList.remove('leaving', 'visible'); void loader.offsetWidth;
    return new Promise(resolve => {
      requestAnimationFrame(() => loader.classList.add('visible'));
      setTimeout(() => { loader.classList.add('leaving'); setTimeout(() => { loader.hidden = true; loader.classList.remove('visible', 'leaving'); resolve(); }, 320); }, wait);
    });
  }
  function openLesson(index) {
    if (index > progress.unlockedThrough) { showToast('Finish the previous station to open this carriage.'); return; }
    currentLevel = index; renderStations();
    if (levels[index].quizOnly) openLevel6();
    else { renderLesson(); setView('lesson'); }
  }
  function boardAtStation(index) {
    if (index > progress.unlockedThrough || transitionBusy) return;
    transitionBusy = true;
    showScreenLoader(`Next stop: ${levels[index].short}`, 620).then(() => { openLesson(index); transitionBusy = false; });
  }

  const STOPS = [[.23, .10], [.75, .20], [.24, .39], [.75, .58], [.32, .80], [.82, .90]];
  let shownStop = 0, trainReady = false;
  function placeTrain(f, animate) {
    const t = $('#train-car'), [x, y] = STOPS[f], right = x > .5;
    t.classList.toggle('flip', right);
    t.style.left = `${(x + (right ? -.235 : .235)) * 100}%`; t.style.top = `${y * 100}%`;
    if (animate) { t.classList.add('moving'); setTimeout(() => t.classList.remove('moving'), 1500); }
  }
  function arriveAtStop() {
    if (currentView !== 'journey') return;
    const f = Math.min(progress.unlockedThrough, 5), cur = $('.station.current');
    if (f > 0 && cur) cur.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (shownStop !== f) { shownStop = f; placeTrain(f, true); Owl.say('cheer', `Next stop: ${levels[f].short}!`, 5000); }
  }
  function renderStations() {
    const host = $('#station-list'), segs = $('#track-segs'), NS = 'http://www.w3.org/2000/svg';
    host.replaceChildren(); segs.replaceChildren();
    for (let i = 0; i < levels.length - 1; i++) {
      const [x1, y1] = STOPS[i], [x2, y2] = STOPS[i + 1], ym = (y1 + y2) * 500;
      const d = `M${x1 * 640} ${y1 * 1000}C${x1 * 640} ${ym} ${x2 * 640} ${ym} ${x2 * 640} ${y2 * 1000}`;
      ['tk-ties', `tk-rail${progress.cleared.includes(i) ? ' done' : ''}`, 'tk-gap'].forEach(cls => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('class', cls); segs.append(p); });
    }
    levels.forEach((level, index) => {
      const cleared = progress.cleared.includes(index), locked = index > progress.unlockedThrough, [x, y] = STOPS[index];
      const total = index === 5 ? 10 : index ? 6 : 3, stars = cleared ? ((progress.best[index] || 0) >= total ? 3 : 2) : 0;
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.level = index; button.disabled = locked;
      button.className = `station ${x > .5 ? 'right' : 'left'}${index === 5 ? ' destination' : ''}${index === progress.unlockedThrough && !cleared ? ' current' : ''}${cleared ? ' cleared' : ''}${locked ? ' locked' : ''}`;
      button.style.left = `${x * 100}%`; button.style.top = `${y * 100}%`;
      button.setAttribute('aria-label', `Station ${index + 1}: ${level.short}${locked ? ', locked' : cleared ? `, cleared with ${stars} stars` : ''}`);
      button.innerHTML = `<span class="stars" aria-hidden="true">${[0, 1, 2].map(n => `<i class="${n < stars ? 'on' : ''}">★</i>`).join('')}</span><span class="station-node">${cleared ? '✓' : locked ? '🔒' : index + 1}</span><span class="station-label"><b>${level.short}</b><small>${level.station}</small></span>`;
      host.append(button);
    });
    const stopsCleared = progress.cleared.length;
    $('#overall-progress').style.width = `${stopsCleared * (100 / levels.length)}%`;
    $('#progress-label').textContent = `${stopsCleared} / ${levels.length} cleared`;
    if (!trainReady) { trainReady = true; shownStop = Math.min(progress.unlockedThrough, levels.length - 1); placeTrain(shownStop); }
  }
  function renderProgress() {
    $('#header-score').textContent = progress.points;
    renderStations();
  }

  function loadVideo(video, frame, empty, path) {
    video.pause(); video.removeAttribute('src'); video.load(); frame.classList.remove('has-video'); empty.hidden = false;
    video.dataset.localPath = path;
    video.src = path;
    video.addEventListener('loadedmetadata', function onReady() {
      if (video.dataset.localPath === path) { frame.classList.add('has-video'); empty.hidden = true; }
      video.removeEventListener('loadedmetadata', onReady);
    });
    video.addEventListener('error', function onMissing() {
      if (video.dataset.localPath === path) { frame.classList.remove('has-video'); empty.hidden = false; }
      video.removeEventListener('error', onMissing);
    }, { once: true });
  }

  function loadLecture(level) {
    loadVideo($('#lecture-video'), $('#video-frame'), $('#video-empty'), level.video);
    const tipPanel = $('#extra-tip-panel');
    tipPanel.hidden = !level.tipVideo;
    if (level.tipVideo) loadVideo($('#extra-tip-video'), $('#extra-tip-frame'), $('#extra-tip-empty'), level.tipVideo);
  }

  function renderLesson() {
    const level = levels[currentLevel], algo = algorithms.find(a => a.id === level.algorithm);
    $('#lesson-level-pill').textContent = `STATION ${currentLevel + 1} OF ${levels.length}`;
    $('#lesson-algorithm-label').textContent = currentLevel === levels.length - 1 ? `THE FINAL STOP · ${algo.short}` : `THE ${['FIRST','SECOND','THIRD','FOURTH','FIFTH'][currentLevel]} STOP · ${algo.short}`;
    $('#lesson-title').textContent = level.name;
    $('#lesson-lede').textContent = level.lede;
    $('#lesson-rule').textContent = level.rule;
    $('#lesson-explanation').textContent = level.explanation;
    $('#owl-tip').textContent = level.tip;
    const points = $('#lesson-points'); points.replaceChildren();
    level.points.forEach(text => { const item = document.createElement('div'); item.className = 'memory-point'; item.textContent = text; points.append(item); });
    loadLecture(level);
  }

  function sample(list, count) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy.slice(0, count);
  }
  function startQuiz() {
    document.querySelectorAll('video').forEach(video => video.pause());
    // Pick 3 at random from each pool, but keep the pool's easy → hard order.
    const pick = list => sample(list, 3).sort((a, b) => list.indexOf(a) - list.indexOf(b));
    const core = pick(bank[currentLevel]).map(q => ({ ...q, kind: 'algorithm' }));
    const comparison = currentLevel > 0 ? pick(comparisonBank[currentLevel]).map(q => ({ ...q, kind: 'choice' })) : [];
    const questions = [...core, ...comparison]; // basic set first, then the comparison set
    wrongRun = 0; finalQuizProgress = null; activeQuiz = { questions, index: 0, correct: 0, points: 0, streak: 0, answered: false, selected: null };
    $('#quiz-result').hidden = true; $('#quiz-card').hidden = false; $('.quiz-layout').hidden = false; $('#buddy').classList.remove('final-results-hidden'); setView('quiz'); renderQuestion();
  }
  function renderQuestion() {
    const quiz = activeQuiz, q = quiz.questions[quiz.index], total = quiz.questions.length;
    quiz.answered = false; quiz.selected = null;
    $('#quiz-progress-label').textContent = `QUESTION ${quiz.index + 1} OF ${total}`;
    const finalQuiz = currentLevel === levels.length - 1;
    $('#quiz-topic').textContent = finalQuiz ? 'FINAL DESTINATION · ALGORITHM CHOICE' : q.kind === 'choice' ? 'WHICH SCHEDULER FITS?' : `${levels[currentLevel].short} · PRACTICE STOP`;
    $('#quiz-score-live').textContent = `✦ ${quiz.points} points`;
    $('#quiz-meter-fill').style.width = `${(quiz.index / total) * 100}%`;
    $('#quiz-title').textContent = 'Let’s think it through';
    $('#quiz-context').textContent = q.context || '';
    $('#question-text').textContent = q.prompt; $('#question-text').style.whiteSpace = 'pre-line';
    $('#answer-feedback').hidden = true; $('#answer-feedback').className = 'answer-feedback';
    $('#quiz-count-hint').textContent = 'Pick one. The owl will explain your choice.';
    const options = $('#answer-options'); options.replaceChildren();
    q.options.forEach((text, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'answer-option';
      const letter = document.createElement('span'); letter.className = 'option-letter'; letter.textContent = String.fromCharCode(65 + index);
      const label = document.createElement('span'); label.textContent = text;
      button.append(letter, label); button.addEventListener('click', () => selectAnswer(index)); options.append(button);
    });
    $('#quiz-next').disabled = true; $('#quiz-next').textContent = 'Check answer';
    $('#quiz-side-tip').textContent = q.hint || levels[currentLevel].tip;
    $('#quit-quiz').textContent = finalQuiz ? '← Before you choose' : '← Lesson';
  }
  function selectAnswer(index) {
    if (activeQuiz.answered) return;
    activeQuiz.selected = index;
    $$('.answer-option').forEach((button, i) => button.classList.toggle('selected', i === index));
    $('#quiz-next').disabled = false;
  }
  let wrongRun = 0;
  function react(correct, quiz) {
    if (!window.Owl) return;
    const el = $$('.answer-option')[quiz.selected], r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const x = r.left + r.width / 2;
    if (correct) { wrongRun = 0; Owl.say('wink', ['Yes! Nicely done.', 'Spot on!', 'You nailed it!', 'Brilliant!'][quiz.correct % 4]); Owl.burst(x, r.top, 34); Owl.pop('+10', x, r.top); }
    else { wrongRun++; wrongRun > 1 ? Owl.say('smug', 'That was an interesting answer…') : Owl.say('confused', 'Hmm, not quite. Check the hint!'); }
  }
  function checkAnswer() {
    const quiz = activeQuiz, q = quiz.questions[quiz.index];
    if (!quiz.answered) {
      if (quiz.selected == null) return;
      quiz.answered = true;
      const correct = quiz.selected === q.answer;
      const feedback = $('#answer-feedback');
      feedback.hidden = false; feedback.classList.toggle('wrong', !correct);
      const heading = document.createElement('strong'); heading.textContent = correct ? 'Correct!' : 'Not quite.';
      const body = document.createElement('span'); body.textContent = q.feedback[quiz.selected]; feedback.replaceChildren(heading, body);
      $$('.answer-option').forEach((button, i) => { button.disabled = true; if (i === q.answer) button.classList.add('correct'); else if (i === quiz.selected) button.classList.add('incorrect'); });
      if (correct) {
        quiz.correct++;
        quiz.points += 10;
        quiz.streak++;
        if (currentLevel === levels.length - 1) {
          finalQuizProgress.correct.add(q);
          finalQuizProgress.totalPoints += 10;
        }
        progress.bestStreak = Math.max(progress.bestStreak, quiz.streak);
        $('#quiz-side-tip').textContent = 'Nice work. Keep going.';
      }
      else { quiz.streak = 0; $('#quiz-side-tip').textContent = 'Use the clue on the next one.'; }
      $('#quiz-score-live').textContent = `✦ ${quiz.points} points`;
      $('#quiz-count-hint').textContent = correct ? 'Correct · +10' : 'Keep going'; react(correct, quiz);
      $('#quiz-next').textContent = quiz.index === quiz.questions.length - 1 ? 'See my results' : 'Next question →';
      persist();
    } else {
      quiz.index++;
      if (quiz.index >= quiz.questions.length) finishQuiz(); else renderQuestion();
    }
  }
  function finishQuiz() {
    const quiz = activeQuiz, total = quiz.questions.length;
    const finalQuiz = currentLevel === levels.length - 1;
    const resultCorrect = finalQuiz ? finalQuizProgress.correct.size : quiz.correct;
    const resultTotal = finalQuiz ? finalQuizProgress.questions.length : total;
    const threshold = finalQuiz ? 7 : Math.ceil(total * 2 / 3 - 1e-9);
    const passed = resultCorrect >= threshold;
    progress.points += quiz.points; progress.quizzes++;
    progress.best[currentLevel] = Math.max(progress.best[currentLevel] || 0, resultCorrect);
    if (passed && !progress.cleared.includes(currentLevel)) progress.cleared.push(currentLevel);
    if (passed) progress.unlockedThrough = Math.max(progress.unlockedThrough, Math.min(levels.length - 1, currentLevel + 1));
    persist();
    if (window.Owl && !finalQuiz) { if (passed) { Owl.say('cheer', 'Level complete!', 6000); Owl.burst(innerWidth / 2, innerHeight / 3, 130); } else if (quiz.correct === 0) Owl.say('smug', 'That was an interesting round…', 5000); else Owl.say('confused', 'So close! Try again.', 5000); }
    $('#quiz-card').hidden = true; const result = $('#quiz-result'); result.hidden = false; result.replaceChildren();
    result.classList.remove('final-result', 'passed', 'near-pass', 'not-passed');
    if (finalQuiz) {
      result.classList.add('final-result', passed ? 'passed' : resultCorrect === 6 ? 'near-pass' : 'not-passed');
      const owl = document.createElement('img');
      const owlWrap = document.createElement('div'); owlWrap.className = 'result-owl-wrap';
      owl.className = 'result-owl';
      owl.src = passed ? 'assets/mascot/cheer.png' : resultCorrect === 6 ? 'assets/mascot/face-hint.png' : 'assets/mascot/face-smug.png';
      owl.alt = passed ? 'Happy owl celebrating' : resultCorrect === 6 ? 'Owl with a spark of inspiration' : 'Determined owl';
      owlWrap.append(owl);
      result.append(owlWrap);
      $('.quiz-layout').hidden = true;
      $('#buddy').classList.add('final-results-hidden');
    } else {
      $('.quiz-layout').hidden = false;
      $('#buddy').classList.remove('final-results-hidden');
    }
    const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = passed ? (finalQuiz ? 'FINAL DESTINATION REACHED' : 'STATION CLEARED') : finalQuiz ? 'FINAL CHALLENGE · NOT CLEARED YET' : 'ONE MORE PRACTICE RUN';
    const h = document.createElement('h2');
    h.textContent = passed
      ? (finalQuiz ? 'You’ve cleared the final challenge!' : `You’ve cleared ${levels[currentLevel].short}!`)
      : finalQuiz && resultCorrect === 6
        ? 'You’re so close!'
        : `You got ${resultCorrect} of ${resultTotal} this time.`;
    const message = document.createElement('p');
    message.textContent = passed
      ? (finalQuiz ? 'All six stops cleared! You matched the workloads to the right scheduling algorithms.' : `Next stop: ${levels[currentLevel + 1].short}.`)
      : finalQuiz && resultCorrect === 6
        ? 'You just need one more right answer to pass. Retry the questions you missed.'
        : finalQuiz
          ? `Get ${threshold - resultCorrect} more right to pass. You’ll only redo questions you missed.`
          : `Get ${threshold} right to clear this stop. Try again — questions shuffle.`;
    const stats = document.createElement('div'); stats.className = 'result-summary';
    [[`${resultCorrect}/${resultTotal}`, 'right'], [`+${finalQuiz ? finalQuizProgress.totalPoints : quiz.points}`, 'points']].forEach(([value, label]) => { const box = document.createElement('div'); box.className = 'result-stat'; const b = document.createElement('b'); b.textContent = value; const small = document.createElement('small'); small.textContent = label; box.append(b, small); stats.append(box); });
    const actions = document.createElement('div'); actions.className = 'result-actions';
    const retry = document.createElement('button'); retry.className = 'button button-primary'; retry.textContent = passed ? (finalQuiz ? 'See map' : 'Next stop →') : finalQuiz ? 'Retry missed questions →' : 'Try again'; retry.addEventListener('click', () => passed && !finalQuiz ? boardAtStation(currentLevel + 1) : passed ? setView('journey') : finalQuiz ? startLevel6Quiz(true) : startQuiz());
    const lab = document.createElement('button'); lab.className = 'button button-outline'; lab.textContent = 'Lab'; lab.addEventListener('click', () => setView('lab'));
    const journey = document.createElement('button'); journey.className = 'button button-quiet'; journey.textContent = 'Map'; journey.addEventListener('click', () => setView('journey'));
    actions.append(retry, lab, journey); result.append(eyebrow, h, message, stats, actions);
    $('#quiz-meter-fill').style.width = '100%'; $('#quiz-progress-label').textContent = 'ROUND COMPLETE';
  }

  function buildProcessRows(rows = sampleWorkload) {
    const body = $('#process-rows'); body.replaceChildren();
    rows.forEach((proc, index) => {
      const tr = document.createElement('tr');
      const fields = [['id', 'Process name', proc.id, 'text'], ['arrival', 'Arrival time', proc.arrival, 'number'], ['burst', 'CPU burst time', proc.burst, 'number'], ['priority', 'Priority (smaller is higher)', proc.priority, 'number']];
      fields.forEach(([key, label, value, type]) => {
        const td = document.createElement('td'); const input = document.createElement('input'); input.type = type; input.value = value; input.dataset.field = key; input.setAttribute('aria-label', `${label} for row ${index + 1}`);
        if (type === 'number') { input.min = key === 'burst' ? '1' : '0'; input.step = '1'; }
        if (key === 'id') input.className = 'process-id'; td.append(input); tr.append(td);
      });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-process'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove process ${proc.id}`); remove.addEventListener('click', () => { if ($('#process-rows').children.length <= 1) { showWorkloadError('Keep at least one process in the workload.'); return; } tr.remove(); });
      const td = document.createElement('td'); td.append(remove); tr.append(td); body.append(tr);
    });
    $('#workload-error').textContent = '';
  }
  function readWorkload() {
    const rows = $$('#process-rows tr');
    if (!rows.length) throw new Error('Add at least one process.');
    if (rows.length > 12) throw new Error('Keep the workload to 12 processes or fewer so the chart stays readable.');
    const procs = rows.map((tr, order) => {
      const get = key => $(`[data-field="${key}"]`, tr).value.trim();
      const id = get('id'), arrival = Number(get('arrival')), burst = Number(get('burst')), priority = Number(get('priority'));
      if (!id) throw new Error(`Give process ${order + 1} a name.`);
      if (!Number.isInteger(arrival) || arrival < 0) throw new Error(`${id}: arrival time must be a whole number of 0 or more.`);
      if (!Number.isInteger(burst) || burst < 1) throw new Error(`${id}: CPU time must be a whole number of at least 1.`);
      if (!Number.isInteger(priority) || priority < 0) throw new Error(`${id}: priority must be a whole number of 0 or more.`);
      return { id, arrival, burst, priority, order, remaining: burst, completion: null };
    });
    if (new Set(procs.map(p => p.id.toLowerCase())).size !== procs.length) throw new Error('Each process needs a different name.');
    return procs;
  }
  function showWorkloadError(text) { $('#workload-error').textContent = text; }
  function addSegment(segments, id, start, end) {
    if (end <= start) return;
    const last = segments[segments.length - 1];
    if (last && last.id === id && last.end === start) last.end = end;
    else segments.push({ id, start, end });
  }
  const byArrival = (a, b) => a.arrival - b.arrival || a.order - b.order;
  function simulate(input, algoId, quantum = 2) {
    const ps = input.map(p => ({ ...p, remaining: p.burst, completion: null }));
    const segments = []; let time = 0;
    const markDone = p => { p.completion = time; p.remaining = 0; };
    if (algoId === 'fcfs' || algoId === 'sjf' || algoId === 'priority') {
      let done = 0;
      while (done < ps.length) {
        const ready = ps.filter(p => p.remaining > 0 && p.arrival <= time);
        if (!ready.length) {
          const next = Math.min(...ps.filter(p => p.remaining > 0).map(p => p.arrival));
          if (next > time) { addSegment(segments, 'IDLE', time, next); time = next; }
          continue;
        }
        ready.sort((a,b) => {
          if (algoId === 'fcfs') return byArrival(a,b);
          if (algoId === 'sjf') return a.burst - b.burst || byArrival(a,b);
          return a.priority - b.priority || byArrival(a,b);
        });
        const p = ready[0], start = time; time += p.remaining; addSegment(segments, p.id, start, time); markDone(p); done++;
      }
    } else if (algoId === 'srtf') {
      let done = 0;
      while (done < ps.length) {
        const ready = ps.filter(p => p.remaining > 0 && p.arrival <= time).sort((a,b) => a.remaining - b.remaining || byArrival(a,b));
        if (!ready.length) {
          const next = Math.min(...ps.filter(p => p.remaining > 0).map(p => p.arrival));
          if (next > time) { addSegment(segments, 'IDLE', time, next); time = next; }
          continue;
        }
        const p = ready[0]; addSegment(segments, p.id, time, time + 1); p.remaining--; time++;
        if (p.remaining === 0) { markDone(p); done++; }
      }
    } else if (algoId === 'rr') {
      const incoming = [...ps].sort(byArrival); let nextIndex = 0, done = 0; const ready = [];
      while (done < ps.length) {
        while (nextIndex < incoming.length && incoming[nextIndex].arrival <= time) ready.push(incoming[nextIndex++]);
        if (!ready.length) {
          const next = incoming[nextIndex].arrival;
          if (next > time) { addSegment(segments, 'IDLE', time, next); time = next; }
          continue;
        }
        const p = ready.shift(), start = time, used = Math.min(quantum, p.remaining);
        time += used; p.remaining -= used; addSegment(segments, p.id, start, time);
        // New arrivals during this turn join before the unfinished process is returned to the queue.
        while (nextIndex < incoming.length && incoming[nextIndex].arrival <= time) ready.push(incoming[nextIndex++]);
        if (p.remaining > 0) ready.push(p); else { markDone(p); done++; }
      }
    } else throw new Error('Choose a scheduling algorithm.');

    const metrics = ps.sort((a,b) => a.order - b.order).map(p => {
      const turnaround = p.completion - p.arrival;
      return { id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, completion: p.completion, turnaround, waiting: turnaround - p.burst };
    });
    const averageWaiting = metrics.reduce((sum, p) => sum + p.waiting, 0) / metrics.length;
    const averageTurnaround = metrics.reduce((sum, p) => sum + p.turnaround, 0) / metrics.length;
    return { algoId, segments, metrics, averageWaiting, averageTurnaround, end: time };
  }

  function renderSchedule(result, target, quantum = 2) {
    const algo = algorithms.find(a => a.id === result.algoId); target.replaceChildren();
    const meta = document.createElement('div'); meta.className = 'gantt-meta';
    const tags = [`<b>${algo.short}</b> · ${algo.compact}`, `Finish time <b>${result.end}</b>`, ...(result.algoId === 'rr' ? [`Quantum <b>${quantum}</b>`] : [])];
    tags.forEach(text => { const span = document.createElement('span'); span.innerHTML = text; meta.append(span); });
    const scroller = document.createElement('div'); scroller.className = 'gantt-scroll';
    const track = document.createElement('div'); track.className = 'gantt-track';
    const ids = [...new Set(result.metrics.map(m => m.id))];
    result.segments.forEach(seg => {
      const block = document.createElement('div'); block.className = `gantt-segment${seg.id === 'IDLE' ? ' idle' : ''}`;
      const width = Math.max(45, (seg.end - seg.start) * 43); block.style.width = `${width}px`;
      if (seg.id !== 'IDLE') { const i = ids.indexOf(seg.id); const hue = [41, 147, 193, 18, 274, 94, 330, 212, 6, 170, 30, 248][i % 12]; block.style.background = `hsl(${hue} 43% 70%)`; }
      const label = document.createElement('span'); label.textContent = seg.id === 'IDLE' ? 'Waiting' : seg.id; block.append(label); track.append(block);
    });
    const ticks = document.createElement('div'); ticks.className = 'gantt-ticks';
    result.segments.forEach((seg, i) => { const tick = document.createElement('span'); tick.className = 'gantt-tick'; tick.style.width = `${Math.max(45, (seg.end - seg.start) * 43)}px`; tick.textContent = String(seg.start); ticks.append(tick); if (i === result.segments.length - 1) { const final = document.createElement('span'); final.className = 'gantt-tick'; final.style.width = '20px'; final.textContent = String(seg.end); ticks.append(final); } });
    scroller.append(track, ticks); target.append(meta, scroller);
    const table = document.createElement('table'); table.className = 'metric-table';
    table.innerHTML = '<thead><tr><th>Process</th><th>Arrival</th><th>CPU time</th><th>Finish (CT)</th><th>Turnaround</th><th>Waiting</th></tr></thead>';
    const tbody = document.createElement('tbody');
    result.metrics.forEach(row => { const tr = document.createElement('tr'); [row.id, row.arrival, row.burst, row.completion, row.turnaround, row.waiting].forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); }); tbody.append(tr); });
    table.append(tbody); target.append(table);
    const avg = document.createElement('div'); avg.className = 'metric-summary'; avg.innerHTML = `Average waiting time <b>${fmt(result.averageWaiting)}</b> · Average turnaround <b>${fmt(result.averageTurnaround)}</b>`; target.append(avg);
  }
  function fmt(value) { return Number(value.toFixed(2)).toString(); }
  function runSimulation() {
    $('#workload-error').textContent = '';
    let workload; try { workload = readWorkload(); } catch (error) { showWorkloadError(error.message); return; }
    const algoId = $('#algorithm-select').value, quantum = Number($('#quantum-input').value);
    if (algoId === 'rr' && (!Number.isInteger(quantum) || quantum < 1)) { showWorkloadError('Round Robin quantum must be a whole number of at least 1.'); return; }
    try {
      const result = simulate(workload, algoId, quantum);
      $('#result-title').textContent = `${algorithms.find(a => a.id === algoId).short} · ${workload.length} process${workload.length === 1 ? '' : 'es'}`;
      renderSchedule(result, $('#single-result'), quantum);
      $('#comparison-results').hidden = true; $('#compare-all').textContent = 'Compare all five'; $('#simulation-results').hidden = false;
      $('#simulation-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { showWorkloadError(error.message || 'Could not simulate that workload.'); }
  }
  function compareAll() {
    const button = $('#compare-all'), panel = $('#comparison-results');
    if (!panel.hidden) { panel.hidden = true; button.textContent = 'Compare all five'; return; }
    let workload; try { workload = readWorkload(); } catch (error) { showWorkloadError(error.message); return; }
    const quantum = Number($('#quantum-input').value);
    if (!Number.isInteger(quantum) || quantum < 1) { showWorkloadError('Round Robin quantum must be a whole number of at least 1.'); return; }
    const results = algorithms.map(a => simulate(workload, a.id, quantum));
    panel.replaceChildren(); const h = document.createElement('h3'); h.textContent = 'Average waiting time · same workload'; panel.append(h);
    const grid = document.createElement('div'); grid.className = 'compare-grid'; const min = Math.min(...results.map(r => r.averageWaiting));
    results.forEach(r => { const algo = algorithms.find(a => a.id === r.algoId), card = document.createElement('div'); card.className = `compare-card${r.averageWaiting === min ? ' best' : ''}`; const name = document.createElement('b'); name.textContent = algo.short; const value = document.createElement('strong'); value.textContent = fmt(r.averageWaiting); const small = document.createElement('small'); small.textContent = `avg. wait · finish ${r.end}${r.averageWaiting === min ? ' · lowest here' : ''}`; card.append(name, value, small); grid.append(card); });
    panel.append(grid); panel.hidden = false; button.textContent = 'Hide comparison';
  }

  function renderNotes() {
    const host = $('#algorithm-notes'); host.replaceChildren();
    algorithms.forEach((algo, index) => { const card = document.createElement('article'); card.className = 'algorithm-note'; const n = document.createElement('span'); n.className = 'note-number'; n.textContent = `STOP ${String(index + 1).padStart(2, '0')}`; const h = document.createElement('h2'); h.textContent = `${algo.short} · ${algo.name}`; const p = document.createElement('p'); p.textContent = algo.description; const code = document.createElement('code'); code.textContent = algo.note; card.append(n, h, p, code); host.append(card); });
  }

  function renderLevel6Guide() {
    const guide = $('#choice-guide'); guide.replaceChildren();

    const algorithms = [
      ['FCFS', 'Jobs are similar and simplicity matters', 'A long job can block many short jobs.'],
      ['SJF', 'You want minimum average waiting time', 'Long jobs can starve, and burst time must be estimated.'],
      ['SRTF', 'Lots of short or interactive jobs arrive dynamically', 'Long jobs may starve, and context switches increase.'],
      ['Priority', 'Some tasks are genuinely more important', 'Low-priority tasks can starve.'],
      ['Round Robin', 'Many users or processes need fair CPU access', 'A tiny quantum adds overhead; a huge one behaves like FCFS.']
    ];

    const cards = document.createElement('div'); cards.className = 'choice-guide-cards';
    algorithms.forEach(([name, best, avoid], index) => {
      const card = document.createElement('article'); card.className = 'choice-guide-card';
      const heading = document.createElement('div'); heading.className = 'choice-guide-heading';
      const number = document.createElement('span'); number.className = 'choice-guide-number'; number.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('h3'); title.textContent = name;
      heading.append(number, title);

      const details = document.createElement('div'); details.className = 'choice-guide-details';
      [['Best for', best, 'best'], ['Watch out', avoid, 'avoid']].forEach(([label, text, type]) => {
        const item = document.createElement('div'); item.className = `choice-guide-detail ${type}`;
        const caption = document.createElement('span'); caption.className = 'choice-guide-label'; caption.textContent = label;
        const description = document.createElement('p'); description.textContent = text;
        item.append(caption, description); details.append(item);
      });
      card.append(heading, details); cards.append(card);
    });

    const actions = document.createElement('section'); actions.className = 'level6-cta';
    const copy = document.createElement('div'); copy.className = 'level6-cta-copy';
    const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = 'READY FOR THE FINAL CHALLENGE?';
    const title = document.createElement('h3'); title.textContent = 'Put your scheduler instincts to the test.';
    const description = document.createElement('p'); description.textContent = 'Choose the algorithm that best fits each workload.';
    copy.append(eyebrow, title, description);
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'start-level6-quiz';
    button.className = 'button button-primary';
    button.textContent = 'Test your knowledge →';
    button.addEventListener('click', () => startLevel6Quiz());
    actions.append(copy, button);

    guide.append(cards, actions);
  }

  function openLevel6() {
    currentLevel = 5;
    renderLevel6Guide();
    setView('level6');
  }

  function startLevel6Quiz(retryMissed = false) {
    document.querySelectorAll('video').forEach(video => video.pause());
    if (!finalQuizProgress || (!retryMissed && finalQuizProgress.correct.size === finalQuizProgress.questions.length)) {
      const questions = [...level6Quiz];
      finalQuizProgress = { questions, correct: new Set(), totalPoints: 0 };
    }
    const questions = finalQuizProgress.questions.filter(question => !finalQuizProgress.correct.has(question));
    if (!questions.length) return;
    wrongRun = 0;
    activeQuiz = { questions, index: 0, correct: 0, points: 0, streak: 0, answered: false, selected: null };
    $('#quiz-result').hidden = true;
    $('#quiz-card').hidden = false;
    $('.quiz-layout').hidden = false;
    $('#buddy').classList.remove('final-results-hidden');
    setView('quiz');
    renderQuestion();
  }

  // Navigation and actions
  $$('.nav-link').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $$('[data-open-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.openView)));
  $('#continue-journey').addEventListener('click', () => boardAtStation(Math.min(progress.unlockedThrough, 5)));
  $('#start-quiz').addEventListener('click', startQuiz);
  $('#quiz-next').addEventListener('click', checkAnswer);
  $('#quit-quiz').addEventListener('click', () => setView(currentLevel === levels.length - 1 ? 'level6' : 'lesson'));
  $('#add-process').addEventListener('click', () => { const rows = $$('#process-rows tr').map(tr => ({ id: $('[data-field="id"]', tr).value, arrival: $('[data-field="arrival"]', tr).value, burst: $('[data-field="burst"]', tr).value, priority: $('[data-field="priority"]', tr).value })); if (rows.length >= 12) { showWorkloadError('The chart supports up to 12 processes at a time.'); return; } rows.push({ id: `P${rows.length + 1}`, arrival: 0, burst: 3, priority: 3 }); buildProcessRows(rows); });
  $('#reset-workload').addEventListener('click', () => buildProcessRows());
  $('#algorithm-select').innerHTML = algorithms.map(a => `<option value="${a.id}">${a.short} — ${a.name}</option>`).join('');
  $('#algorithm-select').addEventListener('change', () => { const algo = algorithms.find(a => a.id === $('#algorithm-select').value); $('#quantum-control').hidden = algo.id !== 'rr'; $('#algorithm-explainer').textContent = algo.note; });
  $('#algorithm-select').value = 'fcfs'; $('#algorithm-explainer').textContent = algorithms[0].note; $('#quantum-control').hidden = true;
  $('#run-simulation').addEventListener('click', runSimulation);
  $('#compare-all').addEventListener('click', compareAll);
  $('#export-progress').addEventListener('click', () => {
    const payload = { game: 'Disk Duel', exportedAt: new Date().toISOString(), progress };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'disk-duel-progress.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); showToast('Progress copy saved to your device.');
  });
  // Boot
  buildProcessRows(); renderNotes(); renderLevel6Guide(); renderProgress();
  // Initialize journey station actions after their buttons are created.
  $('#station-list').addEventListener('click', event => { const button = event.target.closest('[data-level]'); if (button && !button.disabled) boardAtStation(Number(button.dataset.level)); });
  const initialView = progress.hasSeenGuide ? 'journey' : 'notes';
  currentView = initialView;
  setView(initialView, false);
  if (window.Owl) Owl.preload();
  showScreenLoader('Waking up the night train…', 2800);
})();