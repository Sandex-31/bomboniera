/**
 * Smallest useful self-check: the terminal command table is the only piece of
 * real logic that is not visual, so it is the piece worth guarding.
 * Run with: npm test   (uses Vite to resolve TS, no test framework needed)
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });

try {
  const { commands, easterEggs, TOTAL_EGGS } = await vite.ssrLoadModule("/src/data/easterEggs.ts");

  // every command runs and returns printable lines
  for (const c of commands) {
    const out = c.run([]);
    assert.ok(Array.isArray(out), `${c.name} must return an array`);
    assert.ok(
      out.every((l) => typeof l === "string"),
      `${c.name} must return only strings`,
    );
  }

  // help lists every non-secret command
  const help = commands.find((c) => c.name === "help").run([]).join("\n");
  for (const c of commands.filter((c) => !c.secret)) {
    assert.ok(help.includes(c.name), `help is missing ${c.name}`);
  }

  // sudo graduate is the payoff; plain graduate is not
  assert.ok(commands.find((c) => c.name === "sudo").run(["graduate"]).join(" ").includes("🎓"));
  assert.ok(commands.find((c) => c.name === "sudo").run(["reboot"])[0].includes("non trovato"));
  assert.ok(commands.find((c) => c.name === "graduate").run([]).join(" ").includes("sudo"));

  // coffee scales with --years and falls back to a default
  const cups = (years) => Number(commands.find((c) => c.name === "coffee").run(years).join(" ").match(/(\d+) tazze/)[1]);
  assert.equal(cups(["--years", "1"]) * 3, cups(["--years", "3"]));
  assert.ok(cups([]) > 0, "coffee without arguments still prints a number");

  // egg ids are unique and the counter matches
  assert.equal(new Set(easterEggs.map((e) => e.id)).size, easterEggs.length);
  assert.equal(TOTAL_EGGS, easterEggs.length);

  console.log(`ok — ${commands.length} commands, ${TOTAL_EGGS} easter eggs`);


  /* the tap grammar: one threshold decides where a group ends, so what the
     keeper accepts is a shape and not a tempo. These are the timings a thumb
     actually produces — sloppy on purpose. */
  const { SEQUENCE, GROUP_GAP, groupTaps, onTrack, solved } = await vite.ssrLoadModule(
    "/src/data/puzzle.ts",
  );

  assert.deepEqual(groupTaps([]), [], "no taps is no groups");
  assert.deepEqual(groupTaps([0, 200, 400, 1700]), [3, 1], "a clean attempt");
  assert.deepEqual(groupTaps([0, 300, 700, 1750, 1900]), [3, 2], "a slow but unbroken group");
  assert.deepEqual(
    groupTaps([0, GROUP_GAP - 1, GROUP_GAP * 2 - 2]),
    [3],
    "taps just inside the gap stay in one group",
  );
  assert.deepEqual(groupTaps([0, GROUP_GAP]), [1, 1], "a gap of exactly GROUP_GAP splits");

  assert.ok(solved(groupTaps([0, 250, 520, 1600])), "the right shape opens it");
  assert.ok(!solved(groupTaps([0, 250, 520])), "half of it is not it");
  assert.ok(onTrack(groupTaps([0, 250])), "an unfinished group is still on track");
  assert.ok(!onTrack(groupTaps([0, 200, 400, 600])), "one tap too many fails at once");
  assert.ok(!onTrack(groupTaps([0, 1000, 2000])), "too many groups fails");
  assert.ok(!onTrack(groupTaps([0, 1000])), "a group that closed short fails");

  assert.ok(
    SEQUENCE.length > 0 && SEQUENCE.every((n) => Number.isInteger(n) && n > 0),
    "the sequence must be whole groups of at least one tap",
  );

  console.log(`ok — the rhythm reads ${SEQUENCE.length} groups from a sloppy thumb`);

  /* the maze is only worth anything if its one way through is the letter, so
     the letter is not trusted: the maze is solved here and compared. */
  const { buildMaze, solve, letterPath, ROWS, COLS } = await vite.ssrLoadModule("/src/lib/maze.ts");
  const maze = buildMaze();
  const route = solve(maze);
  const letter = letterPath();
  assert.deepEqual(route, letter, "the way through the maze is not the letter any more");

  // and it is a maze, not a corridor: every cell has to be reachable, and
  // there must be no second route (a tree has exactly cells - 1 open walls)
  let opened = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!maze.right[r][c] && c < COLS - 1) opened++;
      if (!maze.down[r][c] && r < ROWS - 1) opened++;
    }
  }
  assert.equal(opened, ROWS * COLS - 1, "the maze has a loop or an island in it");

  // the letter is drawn by hand, so it is the one thing that can quietly go
  // wrong: a stroke laid beside another one welds the corridor to itself and
  // opens a short cut through the middle of it
  for (let i = 0; i < letter.length; i++) {
    for (let j = i + 2; j < letter.length; j++) {
      const gap = Math.abs(letter[i][0] - letter[j][0]) + Math.abs(letter[i][1] - letter[j][1]);
      assert.ok(gap > 1, `the letter touches itself at ${letter[i]} and ${letter[j]}`);
    }
  }


  /* a saved line comes back from storage, which anyone can edit by hand */
  const { validTrail, passable } = await vite.ssrLoadModule("/src/lib/maze.ts");
  assert.ok(validTrail(maze, [maze.entrance]), "the entrance on its own is a valid start");
  assert.ok(validTrail(maze, route), "the solution is a valid trail");
  assert.ok(!validTrail(maze, []), "an empty trail is not a trail");
  assert.ok(!validTrail(maze, "31"), "a string is not a trail");
  assert.ok(!validTrail(maze, [[0, 0]]), "a trail has to start at the entrance");
  assert.ok(!validTrail(maze, [maze.entrance, maze.exit]), "a trail cannot teleport");
  assert.ok(!validTrail(maze, [maze.entrance, ["a", 1]]), "a trail holds whole numbers");
  assert.ok(
    !validTrail(maze, [...route, route[route.length - 2]]),
    "a trail cannot cross itself",
  );
  assert.ok(!passable(maze, maze.entrance, [-1, maze.entrance[1]]), "no walking off the grid");

  console.log(`ok — the maze solves in ${route.length} cells and only that way`);

  /* the three floors of mirrors: every one is walked with the mirrors its
     route implies, and has to come out fully charged at the way up. */
  const { FLOORS, SIZE, charge, complete } = await vite.ssrLoadModule("/src/lib/beam.ts");
  const drawn = new Set();

  FLOORS.forEach((floor, i) => {
    const mirrors = new Map(floor.solution.map((m) => [`${m.cell[0]},${m.cell[1]}`, m.kind]));
    assert.ok(complete(floor, mirrors), `floor ${i + 1} does not light with its own mirrors`);
    assert.equal(floor.budget, floor.solution.length, `floor ${i + 1} hands out spare mirrors`);
    assert.ok(floor.nodes.length >= 4, `floor ${i + 1} has too few power cells to force a route`);

    // with no mirrors at all the light goes straight out of the wall
    assert.ok(!charge(floor, new Map()).arrived, `floor ${i + 1} lights with no mirrors at all`);

    // reaching the way up on a half charge must not count, or the long way
    // round is optional and the figure never gets drawn
    const short = new Map(mirrors);
    const dropped = floor.solution[floor.solution.length - 1];
    short.delete(`${dropped.cell[0]},${dropped.cell[1]}`);
    assert.ok(!complete(floor, short), `floor ${i + 1} completes with a mirror missing`);

    // every power cell has to sit on the route, or the floor is unsolvable
    const onRoute = new Set(floor.figure.map(([r, c]) => `${r},${c}`));
    for (const { cell: [r, c] } of floor.nodes) {
      assert.ok(onRoute.has(`${r},${c}`), `floor ${i + 1} feeds on a cell off its own route`);
      assert.ok(r >= 0 && c >= 0 && r < SIZE && c < SIZE, `floor ${i + 1} feeds off the grid`);
    }

    floor.figure.forEach((cell) => drawn.add(`${cell[0]},${cell[1]}`));
  });
  /*
   * The one that matters: the route has to be the ONLY way through, or the
   * figure is whatever the player happened to draw. It is reconstructed here
   * from nothing but the power cells — each pair of consecutive cells sits on
   * two crossing lines, and with one mirror to spend between them the corner
   * can only be where those lines meet. If that rebuild is the route, there
   * was never a second answer.
   */
  FLOORS.forEach((floor, i) => {
    assert.equal(
      floor.nodes.length,
      floor.budget + 1,
      `floor ${i + 1} does not have one power cell per straight run`,
    );

    const axis = (dir) => (dir % 2 === 0 ? "row" : "col");
    floor.nodes.forEach((node, n) => {
      if (n === 0) return;
      const before = floor.nodes[n - 1];
      assert.notEqual(
        axis(before.dir),
        axis(node.dir),
        `floor ${i + 1} has two power cells in a row on the same axis: no single corner joins them`,
      );
      // the corner is the crossing of the two lines, and there is only one
      const corner =
        axis(before.dir) === "row" ? [before.cell[0], node.cell[1]] : [node.cell[0], before.cell[1]];
      assert.deepEqual(
        corner,
        floor.solution[n - 1].cell,
        `floor ${i + 1} corner ${n} is not where its two power cells say it is`,
      );
    });
  });

  /* the charge has to be tight: enough for the route, never enough to wander */
  FLOORS.forEach((floor, i) => {
    const gaps = [];
    let since = 0;
    const spots = new Set(floor.nodes.map((n) => `${n.cell[0]},${n.cell[1]}`));
    floor.figure.forEach((cell, n) => {
      since += 1;
      if (spots.has(`${cell[0]},${cell[1]}`) || n === floor.figure.length - 1) {
        gaps.push(since);
        since = 0;
      }
    });
    const longest = Math.max(...gaps);
    assert.ok(floor.fuel >= longest, `floor ${i + 1} cannot survive its own route`);
    assert.ok(
      floor.fuel <= longest + 3,
      `floor ${i + 1} carries enough charge to wander off the route`,
    );
  });


  // the floors are one climb: each starts where the one below it stopped
  for (let i = 1; i < FLOORS.length; i++) {
    assert.deepEqual(
      FLOORS[i].source.cell,
      FLOORS[i - 1].riser,
      `floor ${i + 1} does not start where floor ${i} ends`,
    );
  }

  // and no floor may be a recognisable piece on its own: each one has to
  // cross all three rings, which is what stops it from being "the eyelid"
  const ring = ([r, c]) => (Math.abs(r - 8) <= 1 && Math.abs(c - 8) <= 1 ? 2 : Math.abs(r - 8) <= 2 || (c >= 5 && c <= 11 && Math.abs(r - 8) <= 2) ? 1 : 0);
  FLOORS.forEach((floor, i) => {
    const touched = new Set(floor.figure.map(ring));
    assert.ok(touched.size >= 2, `floor ${i + 1} stays in one ring: it would read as a piece`);
  });

  console.log(
    `ok — ${FLOORS.length} floors, ${FLOORS.reduce((n, f) => n + f.budget, 0)} mirrors,` +
      ` ${FLOORS.reduce((n, f) => n + f.nodes.length, 0)} power cells, ${drawn.size} cells drawn`,
  );

  /* ---- the plan of the room still describes the room ------------------ */

  const { SPOTS, PALETTE, CELL, CELLS, HALF: SIDE, MARGIN, cellFor, solvedPlan } =
    await vite.ssrLoadModule("/src/data/room.ts");
  const { readFile: slurp } = await import("node:fs/promises");
  const src = (f) => slurp(new URL(`../${f}`, import.meta.url), "utf8");
  const roomSrc = await src("src/scenes/Room.tsx");
  const planSrc = await src("src/components/Plan.tsx");
  const puzzleSrc = await src("src/scenes/Puzzle.tsx");

  // there is no way to check a drawing against a 3D scene at runtime, so the
  // check is that every number in the plan is still literally in the room
  for (const spot of SPOTS) {
    const stands = new RegExp(`\\[\\s*${spot.x},\\s*[-\\d.]+,\\s*${spot.z}\\s*\\]`);
    assert.ok(stands.test(roomSrc), `nothing stands at ${spot.x}, ${spot.z} any more (${spot.id})`);
    assert.ok(roomSrc.includes(spot.color), `${spot.id} is no longer painted ${spot.color}`);
    assert.ok(PALETTE.includes(spot.color), `${spot.id} wants a colour that is not on the palette`);
  }

  // every wrong colour is a real colour off the room too: a decoy that is
  // obviously not from in there would answer the question by elimination
  for (const color of PALETTE) {
    assert.ok(roomSrc.includes(color), `${color} is on the palette but not in the room`);
  }
  assert.equal(new Set(PALETTE).size, PALETTE.length, "the palette repeats a colour");

  // nothing may stand on a cell line: from the room there would be no telling
  // which side of it the thing is on, and the answer would be a coin toss
  const lines = Array.from({ length: CELLS - 1 }, (_, k) => -SIDE + (k + 1) * CELL);
  for (const spot of SPOTS) {
    for (const [axis, v] of [["x", spot.x], ["z", spot.z]]) {
      const clear = Math.min(...lines.map((l) => Math.abs(v - l)));
      assert.ok(
        clear >= MARGIN,
        `${spot.id} sits ${clear.toFixed(2)} from a cell line on ${axis}: which square is it in?`,
      );
    }
  }

  // and no two of them may share a square
  const squares = new Map();
  for (const spot of SPOTS) {
    const { col, row } = cellFor(spot);
    const id = `${col},${row}`;
    assert.ok(!squares.has(id), `${spot.id} shares a square with ${squares.get(id)}`);
    squares.set(id, spot.id);
  }

  const truth = Object.fromEntries(
    SPOTS.map((s) => [s.id, { ...cellFor(s), color: s.color }]),
  );
  const without = (id) => Object.fromEntries(Object.entries(truth).filter(([k]) => k !== id));
  assert.ok(solvedPlan(truth), "the room itself does not answer its own plan");
  assert.ok(!solvedPlan({}), "an empty plan passes");
  assert.ok(!solvedPlan(without(SPOTS[0].id)), "seven of eight passes");
  assert.ok(
    !solvedPlan({ ...truth, [SPOTS[0].id]: { ...truth[SPOTS[0].id], color: PALETTE[1] } }),
    "a wrong colour in the right square passes",
  );
  assert.ok(
    !solvedPlan({
      ...truth,
      [SPOTS[0].id]: { ...truth[SPOTS[0].id], col: (truth[SPOTS[0].id].col + 1) % CELLS },
    }),
    "the right colour in the wrong square passes",
  );
  assert.ok(
    !solvedPlan({ ...truth, [SPOTS[0].id]: { ...truth[SPOTS[0].id], color: null } }),
    "an uncoloured outline in the right square passes",
  );

  // the panel cannot leak what it does not know: it reads a shape and a name
  // off each spot and never the place or the colour
  for (const leak of ["spot.x", "spot.z", "spot.color"]) {
    assert.ok(!planSrc.includes(leak), `the plan panel reads ${leak}: it could draw the answer`);
  }
  assert.ok(!puzzleSrc.includes("SPOTS"), "the screen face knows where things stand");
  assert.ok(planSrc.includes("onSolved"), "nothing tells the keeper the star is drawn");
  const { starLine, tapeLine } = await vite.ssrLoadModule("/src/data/puzzle.ts");
  assert.ok(starLine.length > 0, "the keeper has nothing to say about the star");
  assert.ok(tapeLine.length > 0, "the keeper never names what the machine drew");
  assert.ok(
    !/\bcorrett|giust|sbagliat/i.test(planSrc),
    "the plan panel says something about being right",
  );

  // the ending: every one of them visited once, and three apart each time,
  // which is the difference between a star and an octagon
  const { STAR, STAR_POINT, STAR_R } = await vite.ssrLoadModule("/src/data/room.ts");
  assert.equal(STAR.length, SPOTS.length, "the star does not have a point per thing");
  assert.equal(new Set(STAR).size, SPOTS.length, "the star visits something twice");
  for (const spot of SPOTS) {
    const point = STAR_POINT[spot.id];
    assert.ok(point, `${spot.id} has nowhere to fly to`);
    assert.ok(
      Math.abs(Math.hypot(point.x, point.z) - STAR_R) < 1e-9,
      `${spot.id} lands off the ring`,
    );
  }
  // the two that have to come to rest on a letter, and on the right one
  for (const [id, want] of [["tesi", [STAR_R, 0]], ["porta", [-STAR_R, 0]]]) {
    const point = STAR_POINT[id];
    assert.ok(
      Math.abs(point.x - want[0]) < 1e-9 && Math.abs(point.z - want[1]) < 1e-9,
      `${id} does not end up on its letter: ${point.x.toFixed(2)}, ${point.z.toFixed(2)}`,
    );
  }

  const round = Object.entries(STAR_POINT)
    .sort(([, a], [, b]) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x))
    .map(([id]) => id);
  for (let i = 0; i < STAR.length; i++) {
    const step =
      (round.indexOf(STAR[(i + 1) % STAR.length]) - round.indexOf(STAR[i]) + round.length) %
      round.length;
    assert.equal(step, 3, "the lines join neighbours: that draws an octagon, not a star");
  }

  console.log(
    `ok — ${SPOTS.length} things on the plan, ${PALETTE.length} colours, none of them confirmed,` +
      ` ${STAR.length} lines into a star`,
  );

  /* ---- the lamps go out exactly one way ------------------------------- */

  const lamps = await vite.ssrLoadModule("/src/lib/lamps.ts");
  const { ANSWER, CELLS: LAMPS, CODE, COLS: LC, START: LIT, dark, flips, press, read } = lamps;
  const lampsSrc = await src("src/components/Lamps.tsx");

  // the whole claim: the machine that flips lamps is invertible, so there is
  // one set of presses that puts the board out and no second one
  const M = Array.from({ length: LAMPS }, () => new Array(LAMPS).fill(0));
  for (let j = 0; j < LAMPS; j++) {
    for (const i of flips(Math.floor(j / LC), j % LC)) M[i][j] = 1;
  }
  let rank = 0;
  for (let col = 0; col < LAMPS && rank < LAMPS; col++) {
    const pivot = M.findIndex((row, r) => r >= rank && row[col]);
    if (pivot < 0) continue;
    [M[rank], M[pivot]] = [M[pivot], M[rank]];
    for (let r = 0; r < LAMPS; r++) {
      if (r !== rank && M[r][col]) for (let k = 0; k < LAMPS; k++) M[r][k] ^= M[rank][k];
    }
    rank++;
  }
  assert.equal(rank, LAMPS, `the lamps have ${2 ** (LAMPS - rank)} solutions, not one`);

  const playOut = (which) =>
    which.reduce(
      (board, on, i) => (on ? press(board, Math.floor(i / LC), i % LC) : board),
      [...LIT],
    );

  assert.ok(!dark(LIT), "the lamps are already out when the panel opens");
  assert.ok(dark(playOut(ANSWER)), "the answer does not put the lamps out");
  assert.deepEqual(read(ANSWER), CODE, "the presses do not spell the code");

  // one press more or less and the board stays lit: no near misses
  for (let i = 0; i < LAMPS; i++) {
    const off = [...ANSWER];
    off[i] = !off[i];
    assert.ok(!dark(playOut(off)), `lamp ${i} can be left out of the answer`);
  }

  // and the panel cannot print what it is never handed
  for (const secret of ["CODE", "ANSWER"]) {
    assert.ok(!lampsSrc.includes(secret), `the lamps panel imports ${secret}`);
  }

  console.log(
    `ok — ${LAMPS} lamps, ${LIT.filter(Boolean).length} lit, one way out of ${2 ** LAMPS}`,
  );

  /* ---- the mountain adds up ------------------------------------------- */

  const ski = await vite.ssrLoadModule("/src/lib/ski.ts");
  const { CODE: DIGITS, GRADES, PISTES, RUNS, STATIONS, lengthOf, solvedSki, stationOf } = ski;

  assert.deepEqual(GRADES, CODE, "the lamps and the pistes disagree about the gradients");

  // exactly one altitude is printed: two would make part of it free, none
  // would make all of it impossible
  assert.equal(STATIONS.filter((s) => s.given).length, 1, "the map gives away the wrong amount");

  // every run measures a whole number of metres, and a believable one
  for (const run of RUNS) {
    const metres = lengthOf(run);
    const drop = Math.abs(stationOf(run.from).alt - stationOf(run.to).alt);
    assert.equal(
      (metres * PISTES[run.piste].grade) / 100,
      drop,
      `${run.from}-${run.to} does not drop what its length says`,
    );
    assert.ok(metres % 10 === 0, `${run.from}-${run.to} is ${metres} m: nobody measures like that`);
    assert.ok(metres >= 200 && metres <= 3000, `${run.from}-${run.to} is ${metres} m long`);
  }

  // and the whole mountain really can be walked out from that one altitude
  const known = new Map(STATIONS.filter((s) => s.given).map((s) => [s.id, s.alt]));
  for (let pass = 0; pass < STATIONS.length; pass++) {
    for (const run of RUNS) {
      const drop = (lengthOf(run) * PISTES[run.piste].grade) / 100;
      // the map says which end is higher by drawing it higher
      const up = stationOf(run.from).y < stationOf(run.to).y ? run.from : run.to;
      const down = up === run.from ? run.to : run.from;
      if (known.has(down) && !known.has(up)) known.set(up, known.get(down) + drop);
      if (known.has(up) && !known.has(down)) known.set(down, known.get(up) - drop);
    }
  }
  for (const station of STATIONS) {
    assert.ok(known.has(station.id), `${station.name} cannot be worked out from the village`);
    assert.equal(known.get(station.id), station.alt, `${station.name} comes out at the wrong height`);
  }

  // higher on the map is higher up the mountain: that is the only thing
  // telling the visitor which way a run runs
  const byHeight = [...STATIONS].sort((a, b) => a.y - b.y);
  for (let i = 1; i < byHeight.length; i++) {
    assert.ok(
      byHeight[i - 1].alt > byHeight[i].alt,
      `${byHeight[i].name} is drawn below something lower than it`,
    );
  }

  const right = Object.fromEntries(STATIONS.map((s) => [s.id, String(s.alt)]));
  assert.ok(solvedSki(right), "the mountain does not answer itself");
  assert.ok(!solvedSki({}), "an empty map passes");
  assert.ok(
    !solvedSki({ ...right, [STATIONS[0].id]: String(STATIONS[0].alt + 10) }),
    "ten metres out passes",
  );
  assert.equal(DIGITS.length, 5, "the code is not five figures");
  assert.ok(DIGITS.every((d) => Number.isInteger(d) && d >= 0 && d <= 9), "the code is not digits");

  // the machine turns up on a desk once the map is done, and the island is
  // told to go and look at it
  const machineSrc = await src("src/components/Machine.tsx");
  assert.ok(
    puzzleSrc.includes("index === MACHINE_DESK && hasMachine"),
    "the machine never reaches a desk",
  );
  assert.ok(
    puzzleSrc.includes("solvedSki(loadSki())"),
    "the machine forgets it was earned between visits",
  );
  assert.ok(puzzleSrc.includes("setPicked(MACHINE_DESK)"), "the machine opens out of sight");
  assert.ok(!machineSrc.includes("CODE"), "the machine knows the code it is not for");

  /* ---- the tape has one reading ---------------------------------------- */

  const tape = await vite.ssrLoadModule("/src/lib/tape.ts");
  const { AMBIGUOUS, BANDS, CIPHER, COMPASS, FORK, SLOTS, follow, solvedTape } = tape;

  // the cipher is the star, not a copy of it
  for (const spot of SPOTS) {
    assert.ok(
      Object.values(COMPASS).flat().includes(spot.color),
      `${spot.id} is on the star but not in the cipher`,
    );
  }
  assert.equal(Object.values(COMPASS).flat().length, SPOTS.length, "the compass lost a point");
  assert.equal(FORK.length, 2, "the ambiguous colour does not mean two directions");
  assert.equal(
    Object.values(CIPHER).filter((d) => d.length > 1).length,
    1,
    "more than one colour is ambiguous: the levers would not be enough",
  );
  assert.equal(
    BANDS.filter((c) => c === AMBIGUOUS).length,
    SLOTS.length,
    "the levers and the brown bands do not match up",
  );

  // and the whole point: of every way the tape can be read, one closes
  const readings = [];
  for (let mask = 0; mask < 1 << SLOTS.length; mask++) {
    const levers = Array.from({ length: SLOTS.length }, (_, i) => Boolean((mask >> i) & 1));
    if (solvedTape(levers)) readings.push(levers);
  }
  assert.equal(readings.length, 1, `the tape has ${readings.length} readings, not one`);

  // a wrong lever must not give itself away at once, or there is nothing to
  // work out: it can be felt for one band at a time
  const trueLevers = readings[0];
  const hidden = [];
  for (let mask = 0; mask < 1 << SLOTS.length; mask++) {
    const levers = Array.from({ length: SLOTS.length }, (_, i) => Boolean((mask >> i) & 1));
    const first = levers.findIndex((v, i) => v !== trueLevers[i]);
    if (first < 0) continue;
    hidden.push(follow(levers).cells.length - 1 - SLOTS[first]);
  }
  const mean = hidden.reduce((a, b) => a + b, 0) / hidden.length;
  assert.ok(mean > 4, `a wrong lever shows after ${mean.toFixed(1)} bands: too easy`);

  // and the answer must not be a row of identical levers, or it is stumbled
  // on rather than worked out
  const answer = SLOTS.map((_, i) => (trueLevers[i] ? FORK[0] : FORK[1]));
  const minority = Math.min(...FORK.map((d) => answer.filter((a) => a === d).length));
  assert.ok(
    minority >= 2,
    `the answer is ${answer.join(" ")}: one lever away from a row of identical ones`,
  );

  assert.ok(
    machineSrc.includes("follow(bank)") && !machineSrc.includes("solvedTape"),
    "the machine decides for itself whether the tape closed",
  );
  assert.ok(
    puzzleSrc.includes("setAboutTape(true)"),
    "nothing names the creature once the machine has drawn it",
  );

  // the two studs have to end up inside the outline, or they are obstacles
  // that never turn into anything
  const { EYES } = tape;
  const outline = follow(trueLevers).cells;
  for (const [ex, ey] of EYES) {
    assert.ok(
      !outline.some(([x, y]) => x === ex && y === ey),
      `the line runs over the stud at ${ex},${ey}`,
    );
    // tested half a cell off the corner, so the ray never grazes a vertex
    const px = ex + 0.5, py = ey + 0.5;
    let inside = false;
    for (let i = 0, j = outline.length - 2; i < outline.length - 1; j = i++) {
      const [xi, yi] = outline[i];
      const [xj, yj] = outline[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    assert.ok(inside, `the stud at ${ex},${ey} ends up outside the figure`);
  }

  console.log(
    `ok — ${BANDS.length} bands, ${SLOTS.length} forks, 1 reading in ${2 ** SLOTS.length},` +
      ` a wrong lever hides for ${mean.toFixed(1)} bands`,
  );

  console.log(
    `ok — ${STATIONS.length} stations, ${RUNS.length} runs, one altitude given, ${DIGITS.length} figures out`,
  );
} finally {
  await vite.close();
}

/* ---------------------------------------------------------------------- */
/* Second pass: render every section off-screen. Catches broken imports,   */
/* bad data shapes and render-time crashes without needing a browser.      */
/* (App/Boot are skipped: they read window.matchMedia at mount.)           */
/* ---------------------------------------------------------------------- */

const vite2 = await createServer({ server: { middlewareMode: true }, appType: "custom" });

try {
  const { renderToString } = await import("react-dom/server");
  const { createElement: h } = await import("react");

  const load = (p) => vite2.ssrLoadModule(p).then((m) => m.default);

  const sections = {
    Exams: [await load("/src/sections/Exams.tsx"), {}],
    Projects: [await load("/src/sections/Projects.tsx"), {}],
    Thesis: [await load("/src/sections/Thesis.tsx"), {}],
    Credits: [await load("/src/sections/Credits.tsx"), {}],
    EasterEggs: [
      await load("/src/sections/EasterEggs.tsx"),
      { found: ["duck"], onOpenSection: () => {}, onClose: () => {} },
    ],
    RoomFallback: [await load("/src/scenes/RoomFallback.tsx"), { onPick: () => {} }],
    Hud: [
      await load("/src/components/Hud.tsx"),
      {
        active: null,
        focus: null,
        foundCount: 1,
        onOpen: () => {},
        onExitFocus: () => {},
        onOpenList: () => {},
        onResetView: () => {},
      },
    ],
    HudFocused: [
      await load("/src/components/Hud.tsx"),
      {
        active: "exams",
        focus: "exams",
        foundCount: 1,
        onOpen: () => {},
        onExitFocus: () => {},
        onOpenList: () => {},
        onResetView: () => {},
      },
    ],
    FocusCard: [
      await load("/src/components/FocusCard.tsx"),
      { section: "thesis", id: "step-0", onClose: () => {}, onMore: () => {} },
    ],
  };

  for (const [name, [Component, props]] of Object.entries(sections)) {
    const html = renderToString(h(Component, props));
    assert.ok(html.length > 50, `${name} rendered almost nothing`);
  }

  // the sections must actually show the data, not just render
  const examsHtml = renderToString(h(sections.Exams[0], {}));
  const { exams } = await vite2.ssrLoadModule("/src/data/exams.ts");
  assert.ok(examsHtml.includes(exams[0].name), "the exam list is not rendering its data");

  const projectsHtml = renderToString(h(sections.Projects[0], {}));
  const { projects } = await vite2.ssrLoadModule("/src/data/projects.ts");
  assert.ok(projectsHtml.includes(projects[0].title), "the project list is not rendering its data");

  // the monitor lists one row per project: the rows, gaps included, stay on the 0.66-high screen
  const roomText = await (await import("node:fs/promises")).readFile(new URL("../src/scenes/Room.tsx", import.meta.url), "utf8");
  const pitch = roomText.match(/ROW_STEP = Math\.min\(([\d.]+), ([\d.]+) \/ Math\.max\(projects\.length/);
  const rowH = roomText.match(/ROW_H = ROW_STEP \* ([\d.]+)/);
  assert.ok(pitch && rowH, "could not read the monitor rows from Room.tsx");
  for (const n of [projects.length, 12]) {
    const step = Math.min(Number(pitch[1]), Number(pitch[2]) / n);
    assert.ok((n - 1) * step + step * Number(rowH[1]) <= 0.66, `${n} projects overflow the monitor`);
  }

  // the close-up card must resolve a picked item back to its real data
  const { exams: allExams } = await vite2.ssrLoadModule("/src/data/exams.ts");
  const cardHtml = renderToString(
    h(sections.FocusCard[0], {
      section: "exams",
      id: allExams[0].id,
      onClose: () => {},
      onMore: () => {},
    }),
  );
  assert.ok(cardHtml.includes(allExams[0].name), "the close-up card is not reading the exam data");

  console.log(`ok — ${Object.keys(sections).length} sections render`);
} finally {
  await vite2.close();
}

/* ---------------------------------------------------------------------- */
/* Third pass: the isometric framing. Projects the room's bounding box      */
/* through the scene camera and checks FitCamera is not cropping it.        */
/* ---------------------------------------------------------------------- */

{
  const { OrthographicCamera, Vector3 } = await import("three");
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/scenes/Room.tsx", import.meta.url), "utf8");

  const num = (re, label) => {
    const m = src.match(re);
    assert.ok(m, `could not read ${label} from Room.tsx`);
    return Number(m[1]);
  };

  const roomW = num(/const ROOM_W = ([\d.]+)/, "ROOM_W");
  const roomH = num(/const ROOM_H = ([\d.]+)/, "ROOM_H");
  const cam3 = src.match(/camera=\{\{ position: \[([-\d.]+), ([-\d.]+), ([-\d.]+)\]/);
  assert.ok(cam3, "could not read the camera position from Room.tsx");
  const half = num(/const HALF = ([\d.]+)/, "HALF");
  const wallH = num(/const WALL_H = ([\d.]+)/, "WALL_H");
  const slabT = num(/const SLAB_T = ([\d.]+)/, "SLAB_T");

  const cam = new OrthographicCamera(-1, 1, 1, -1, 0.1, 90);
  cam.position.set(Number(cam3[1]), Number(cam3[2]), Number(cam3[3]));
  cam.lookAt(0, 0.9, 0);
  cam.updateMatrixWorld(true);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const x of [-half, half])
    for (const y of [-slabT, wallH])
      for (const z of [-half, half]) {
        const v = new Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse);
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      }

  const w = maxX - minX;
  const h = maxY - minY;
  assert.ok(roomW >= w, `ROOM_W ${roomW} crops the room (needs >= ${w.toFixed(2)})`);
  assert.ok(roomH >= h, `ROOM_H ${roomH} crops the room (needs >= ${h.toFixed(2)})`);

  console.log(`ok — room projects to ${w.toFixed(2)} x ${h.toFixed(2)}, framed at ${roomW} x ${roomH}`);
}

/* ---------------------------------------------------------------------- */
/* Fourth pass: the close-ups. Every focus view has to aim at the object    */
/* it belongs to and approach it from the room's open side, or the camera   */
/* flies into a wall and the visitor sees nothing.                          */
/* ---------------------------------------------------------------------- */

{
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/scenes/Room.tsx", import.meta.url), "utf8");

  const vite3 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { CREDITS_SCREEN, FOCUS_VIEWS, ROOM_VIEW } = await vite3.ssrLoadModule(
      "/src/scenes/focus.ts",
    );

    // where each area's hotspot actually stands, read straight out of the scene
    const constant = (name) => {
      const m = src.match(new RegExp(`const ${name} = (.+?);`));
      assert.ok(m, `could not read ${name} from Room.tsx`);
      return Number(m[1]);
    };
    const half = constant("HALF");
    const doorZ = constant("DOOR_Z");
    const doorW = constant("DOOR_W");

    const LABELS = { Progetti: "projects", Esami: "exams", Tesi: "thesis", Grazie: "credits" };
    const spots = {};
    const re = /position=\{\[([-\d.]+), ([-\d.]+), ([-\d.]+)\]\}\s*label="([^"]+)"/g;
    for (const m of src.matchAll(re)) {
      const id = LABELS[m[4]];
      if (id) spots[id] = [Number(m[1]), Number(m[2]), Number(m[3])];
    }

    for (const [id, view] of Object.entries(FOCUS_VIEWS)) {
      assert.ok(view.zoom > 1, `the ${id} close-up does not actually move closer`);

      // the credits are the one view that leaves the room: it aims at the
      // screen outside the doorway, from the far side, so the room-bound
      // checks below would fail it for doing exactly what it should
      if (id === "credits") {
        assert.deepEqual(view.target, CREDITS_SCREEN, "the credits view must aim at the screen");
        assert.ok(CREDITS_SCREEN[0] < -half, "the credits screen must stand outside the wall");
        assert.ok(
          Math.abs(CREDITS_SCREEN[2] - doorZ) < doorW / 2,
          "the credits screen must line up with the doorway",
        );
        // the screen faces -x, so the camera has to stand on that side of it
        assert.ok(
          Math.abs(view.azimuth + Math.PI / 2) < view.spread.azimuth,
          "the credits camera would look at the back of the screen",
        );
        assert.ok(src.includes("<CreditsStage"), "nothing in the room mounts the credits screen");
        continue;
      }

      const spot = spots[id];
      assert.ok(spot, `no hotspot labelled for the ${id} close-up`);

      const dx = view.target[0] - spot[0];
      const dz = view.target[2] - spot[2];
      const off = Math.hypot(dx, dz);
      assert.ok(off < 1.2, `the ${id} camera aims ${off.toFixed(2)} away from its object`);

      // azimuth inside [0, PI/2] keeps the camera off the back and left walls
      assert.ok(
        view.azimuth >= 0 && view.azimuth <= Math.PI / 2,
        `the ${id} camera would sit behind a wall (azimuth ${view.azimuth})`,
      );
      // polar below PI/2 means looking down at the object, never up from the floor
      assert.ok(view.polar > 0.5 && view.polar < Math.PI / 2 + 0.1, `the ${id} camera is upside down`);
    }

    assert.equal(ROOM_VIEW.zoom, 1, "the room view must be the reference zoom");

    // every findable object in the scene must have a matching entry in the
    // data file, and vice versa — the two drift apart silently otherwise
    const { easterEggs } = await vite3.ssrLoadModule("/src/data/easterEggs.ts");
    const used = new Set();
    for (const m of src.matchAll(/kind: "egg", id: "([\w-]+)"/g)) used.add(m[1]);
    for (const m of src.matchAll(/\bid="([\w-]+)"/g)) used.add(m[1]);
    for (const m of src.matchAll(/\{ id: "([\w-]+)",/g)) used.add(m[1]);

    // the cap floats above the case: its idle bob has to bob around the derived
    // height, or the animation quietly puts it back inside the lid every frame
    const cap = src.slice(src.indexOf("function Cap("), src.indexOf("function Dust("));
    assert.ok(/position\.y = CAP_Y \+/.test(cap), "the cap bobs around a hard-coded height");

    // the floating name must come from the data file, never a copy in the scene
    assert.ok(
      !/<Egg[^>]*label=/.test(src),
      "an Egg spells out its own label instead of reading easterEggs.ts",
    );

    // the portal: one threshold, in the data file, read by both sides of it.
    // Two copies of the number is how the room ends up opening on the ninth tap.
    const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");
    for (const file of ["src/scenes/Room.tsx", "src/App.tsx"]) {
      const text = await read(file);
      assert.ok(/import { PORTAL_AT }/.test(text), `${file} does not read PORTAL_AT from data/puzzle.ts`);
      assert.ok(!/PORTAL_AT = d/.test(text), `${file} keeps its own copy of PORTAL_AT`);
    }
    assert.ok(/kind: "portal"/.test(src), "nothing in the room opens the portal");
    assert.ok(/onExit/.test(await read("src/scenes/Puzzle.tsx")), "the room beyond has no way back");

    // a view built inline is a new object every render, and the rig reads a new
    // object as a new place to fly to: the camera then never stops arriving
    assert.ok(
      // one view per pick, built once: a new object every render restarts the flight
      /const view = useMemo\(\s*\(\) =>[^;]*?ISLAND_VIEW[^;]*?\[picked[^\]]*\],?\s*\)/.test(
        await read("src/scenes/Puzzle.tsx"),
      ),
      "the puzzle camera view is rebuilt every render — the flight will loop",
    );

    // the reset and the save have to name the same thing, or one stops
    // undoing the other and the puzzle can never be replayed
    assert.ok(
      !(await read("src/scenes/Puzzle.tsx")).includes("bomboniera.puzzle"),
      "the puzzle room spells out its storage key instead of reading PUZZLE_KEY",
    );

    // the borrowed model is Cobblemon's, under the MPL: say whose and under what
    if (existsSync("src/assets/rotom/cobblemon")) {
      const readme = await read("README.md");
      assert.ok(
        readme.includes("Cobblemon") && /MPL-2\.0/.test(readme),
        "the Rotom model is in the project but its attribution is not in the README",
      );
    }

    // only the scene on its way out may be transformed: a canvas that mounts
    // inside a scaled parent measures itself wrong and keeps the wrong camera
    assert.ok(
      !/warp === "out" ?/.test(await read("src/App.tsx")),
      "the arriving scene is given a transform class again — see the note in global.css",
    );

    for (const egg of easterEggs) {
      assert.ok(used.has(egg.id), `the egg "${egg.id}" is in the data but nothing in the room picks it`);
    }
    for (const id of used) {
      assert.ok(
        easterEggs.some((e) => e.id === id),
        `the room picks "${id}", which is not in easterEggs.ts`,
      );
    }

    console.log(`ok — ${easterEggs.length} findable objects wired to the scene`);

    console.log(`ok — ${Object.keys(FOCUS_VIEWS).length} close-ups aim at their objects`);

    /* the shelf is laid out from constants, so the layout can be replayed
       here: this is what fails the day the exam list outgrows the case. */
    const { exams } = await vite3.ssrLoadModule("/src/data/exams.ts");
    const gaps = JSON.parse(src.match(/const SHELF_GAPS = (\[[^\]]+\])/)[1]);
    const bookShelves = constant("BOOK_SHELVES");
    const inner = constant("CASE_W") - 2 * constant("CASE_SIDE");

    const perShelf = Math.ceil(exams.length / bookShelves);
    const step = Math.min(0.14, (inner - 0.08) / perShelf);
    const spine = Math.min(0.1, step - 0.025);
    const row = (perShelf - 1) * step + spine;
    const tallest = Math.max(...exams.map((e) => 0.3 + ((e.cfu % 5) + 1) * 0.03));

    assert.ok(row <= inner, `${exams.length} exams need ${row.toFixed(2)} of shelf, the case has ${inner}`);
    assert.ok(spine >= 0.05, `${exams.length} exams squeeze the spines down to ${spine.toFixed(3)}`);
    assert.ok(gaps.length > bookShelves, "no level left over for the collection");
    assert.ok(tallest < gaps[0], `the tallest book (${tallest.toFixed(2)}) does not clear the shelf above`);

    console.log(
      `ok — ${exams.length} books on ${bookShelves} shelves: ${row.toFixed(2)} of ${inner.toFixed(2)} used`,
    );
  } finally {
    await vite3.close();
  }
}

/* ------------------------------------------------------------------------ */
/* The terminal on the eye: one word, and the wires that come with it.      */
/* ------------------------------------------------------------------------ */
{
  const vite4 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { accepts } = await vite4.ssrLoadModule("/src/components/Hack.tsx");

    // the word is what was recognised, not how it was typed
    for (const word of ["animal well", "ANIMALWELL", "  Animall  Well ", "animal-well"]) {
      assert.ok(accepts(word), `the terminal refuses "${word}"`);
    }
    for (const word of ["", "animal", "well", "animal wall", "animalwells"]) {
      assert.ok(!accepts(word), `the terminal opens on "${word}"`);
    }

    const { readFile } = await import("node:fs/promises");
    const puzzle = await readFile(new URL("../src/scenes/Puzzle.tsx", import.meta.url), "utf8");


    // and the whole point of the wires: a window stops belonging to a screen
    assert.ok(
      /if \(!linked\) setStack/.test(puzzle),
      "leaving a screen still closes its windows once the screens are wired",
    );

    /* the figure: one fragment per screen, and every one of them with
       something on it and a window to show it through */
    const { PIECES } = await vite4.ssrLoadModule("/src/lib/lost.ts");
    assert.equal(PIECES.length, 5, "there is not one fragment of the figure per screen");
    for (const piece of PIECES) {
      const drawn = (piece.paths?.length ?? 0) + (piece.boxes?.length ?? 0);
      assert.ok(drawn > 0, `the fragment "${piece.title}" draws nothing`);
      const [, , w, h] = piece.view;
      assert.ok(w > 0 && h > 0, `the fragment "${piece.title}" has no window to be seen through`);
    }

    console.log("ok — the terminal takes the word 4 ways, refuses 5 near-misses, 5 fragments drawn");
  } finally {
    await vite4.close();
  }
}

/* ------------------------------------------------------------------------ */
/* The debug jump: every stop lands with exactly the puzzles above it solved. */
/* ------------------------------------------------------------------------ */
{
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const vite5 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { STAGES, jumpTo } = await vite5.ssrLoadModule("/src/lib/stages.ts");
    const puzzle = await vite5.ssrLoadModule("/src/data/puzzle.ts");
    const { buildMaze, validTrail } = await vite5.ssrLoadModule("/src/lib/maze.ts");
    const { FLOORS, complete } = await vite5.ssrLoadModule("/src/lib/beam.ts");
    const { solvedPlan } = await vite5.ssrLoadModule("/src/data/room.ts");
    const { START, COLS, dark, press } = await vite5.ssrLoadModule("/src/lib/lamps.ts");
    const { solvedSki, loadSki } = await vite5.ssrLoadModule("/src/lib/ski.ts");
    const { solvedTape } = await vite5.ssrLoadModule("/src/lib/tape.ts");

    // the reset is stop 0, so every key the puzzle keeps has to be on the list
    const keys = Object.entries(puzzle).filter(([n]) => n.endsWith("_KEY")).map(([, v]) => v);
    assert.deepEqual(new Set(STAGES.map((st) => st.key)), new Set(keys), "a puzzle key is missing from the stops");

    for (let n = 0; n <= STAGES.length; n++) {
      store.set("leftover", "x");
      STAGES.forEach(({ key }) => store.set(key, "stale"));
      jumpTo(n);
      STAGES.forEach(({ key }, i) =>
        assert.equal(store.has(key), i < n, `stop ${n} gets ${key} wrong`),
      );
    }

    // and what the last stop writes is what each screen accepts as solved
    jumpTo(STAGES.length);
    const read = (k) => JSON.parse(store.get(k));
    const maze = buildMaze();
    const trail = read(puzzle.MAZE_KEY);
    assert.ok(validTrail(maze, trail), "the jump draws an impossible maze line");
    assert.deepEqual(trail.at(-1), maze.exit, "the jump stops short of the maze exit");
    const beams = read(puzzle.BEAM_KEY);
    FLOORS.forEach((f, i) =>
      assert.ok(complete(f, new Map(Object.entries(beams[i]))), `the jump leaves floor ${i} dark`),
    );
    assert.ok(solvedPlan(read(puzzle.PLAN_KEY)), "the jump lays out the wrong room");
    const lamps = read(puzzle.LAMPS_KEY);
    const replayed = lamps.pressed.reduce(
      (b, on, i) => (on ? press(b, Math.floor(i / COLS), i % COLS) : b),
      [...START],
    );
    assert.ok(dark(replayed) && dark(lamps.lit), "the jump leaves lamps burning");
    assert.ok(solvedSki(loadSki()), "the jump leaves the mountain blank");
    assert.ok(solvedTape(read(puzzle.MACHINE_KEY)), "the jump sets the levers wrong");
    const { unlocked } = await vite5.ssrLoadModule("/src/lib/sagome.ts");
    assert.ok(unlocked(read(puzzle.LOCK_KEY)), "the jump leaves the lock shut");
    assert.equal(puzzle.floorFrom(store.get(puzzle.FLOOR_KEY)), 1, "the last stop leaves the visitor upstairs");

    // the floor the visitor is on: whatever is stored, it lands on a real floor
    assert.equal(puzzle.floorFrom(null), 0, "never been down is the island");
    assert.equal(puzzle.floorFrom("1"), 1);
    assert.equal(puzzle.floorFrom("0"), 0, "been down and back up is the island");
    for (const bad of ["", "x", "-1", "1.5", String(puzzle.FLOORS), "99"]) {
      assert.equal(puzzle.floorFrom(bad), 0, `"${bad}" must fall back to the island`);
    }

    console.log(`ok — ${STAGES.length + 1} jump stops, each solving exactly the puzzles above it`);
  } finally {
    await vite5.close();
    delete globalThis.localStorage;
  }
}

/* ------------------------------------------------------------------------ */
/* The silhouettes, the word and the lock.                                   */
/* ------------------------------------------------------------------------ */
{
  const vite6 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const s = await vite6.ssrLoadModule("/src/lib/sagome.ts");
    for (const w of ["EYE", "eye", " e y e "]) assert.ok(s.bootAccepts(w), `boot refuses ${w}`);
    for (const w of ["", "eyes", "occhio", "ey"]) assert.ok(!s.bootAccepts(w), `boot opens on ${w}`);

    assert.equal(s.CHARACTERS.length, 11);
    assert.equal(new Set(s.CHARACTERS.map((c) => c.id)).size, 11, "duplicate ids");
    assert.equal(new Set(s.CHARACTERS.map((c) => c.file)).size, 11, "duplicate files");
    for (const c of s.CHARACTERS) {
      assert.match(c.file, /^media\/sagome\/\d\d\.png$/, `${c.id} file name gives it away`);
      for (const n of c.names) assert.equal(s.judge(c.id, n), "bravo", `${c.id} refuses its name ${n}`);
    }
    // the files are not in the order of the list, or the order would give them away
    assert.ok(
      s.CHARACTERS.some((c, i) => c.file !== `media/sagome/${String(i + 1).padStart(2, "0")}.png`),
      "the files follow the list",
    );
    assert.equal(s.judge(s.LOST_ID, "The Lost"), "bravo");
    assert.equal(s.judge(s.LOST_ID, "TOMBINO"), "tombino");
    assert.equal(s.judge(s.LOST_ID, " tombino "), "tombino");
    assert.equal(s.judge("samus", "tombino"), "wrong");
    assert.equal(s.judge("samus", "link"), "wrong");
    assert.equal(s.judge(s.LOST_ID, ""), "wrong");

    assert.deepEqual([...s.LOCK_CODE], [4, 7, 1, 5, 7]);
    assert.deepEqual(s.turn([9, 0, 0, 0, 0], 0, 1), [0, 0, 0, 0, 0]);
    assert.deepEqual(s.turn([0, 0, 0, 0, 0], 4, -1), [0, 0, 0, 0, 9]);
    assert.ok(s.unlocked([4, 7, 1, 5, 7]) && !s.unlocked([4, 7, 1, 5, 6]));

    // what comes back from storage is checked, never trusted
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    const { LOCK_KEY } = await vite6.ssrLoadModule("/src/data/puzzle.ts");
    for (const bad of ["", "nope", "[1,2,3]", "[1,2,3,4,10]", "[1,2,3,4,1.5]", "{}"]) {
      store.set(LOCK_KEY, bad);
      assert.deepEqual(s.loadLock(), [0, 0, 0, 0, 0], `the lock believes ${bad}`);
    }
    store.set(LOCK_KEY, "[4,7,1,5,7]");
    assert.deepEqual(s.loadLock(), [4, 7, 1, 5, 7]);
    delete globalThis.localStorage;

    // the codec the silhouettes are made with gives back what it was given
    const { decode, encode } = await import("./png.mjs");
    const tiny = { width: 3, height: 2, data: Uint8Array.from({ length: 24 }, (_, i) => (i * 37) % 256) };
    const back = decode(encode(tiny));
    assert.equal(back.width, 3);
    assert.equal(back.height, 2);
    assert.deepEqual([...back.data], [...tiny.data], "the png codec loses pixels");

    // a packed 4-bit palette, which is how pixel-art sprites come: three
    // pixels, indices 1, 0, 2, with index 0 see-through
    const { SIGNATURE, chunk } = await import("./png.mjs");
    const { deflateSync } = await import("node:zlib");
    const ihdr = Buffer.from([0, 0, 0, 3, 0, 0, 0, 1, 4, 3, 0, 0, 0]);
    const sprite = decode(
      Buffer.concat([
        SIGNATURE,
        chunk("IHDR", ihdr),
        chunk("PLTE", Buffer.from([0, 0, 0, 255, 0, 0, 0, 255, 0])),
        chunk("tRNS", Buffer.from([0])),
        chunk("IDAT", deflateSync(Buffer.from([0, 0x10, 0x20]))),
        chunk("IEND", Buffer.alloc(0)),
      ]),
    );
    assert.deepEqual([...sprite.data], [255, 0, 0, 255, 0, 0, 0, 0, 0, 255, 0, 255], "a packed palette reads wrong");

    // and every silhouette is black, all of it, and actually a shape
    const { readFileSync } = await import("node:fs");
    for (const c of s.CHARACTERS) {
      const img = decode(readFileSync(new URL(`../public/${c.file}`, import.meta.url)));
      assert.ok(img.width > 0 && img.height > 0 && img.height <= 480, `${c.id} is the wrong size`);
      let solid = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        if (img.data[i + 3] === 0) continue;
        solid++;
        assert.ok(
          img.data[i] === 0 && img.data[i + 1] === 0 && img.data[i + 2] === 0,
          `${c.id} has colour in it`,
        );
      }
      const all = img.width * img.height;
      assert.ok(solid >= all * 0.05, `${c.id} is barely there`);
      assert.ok(all - solid >= all * 0.05, `${c.id} is a block, not a shape`);
    }

    console.log("ok — 11 silhouettes named, EYE boots, TOMBINO on the lost, the lock turns on 47157");
  } finally {
    await vite6.close();
  }
}

/* ------------------------------------------------------- the Bedrock reader
 * Rotom comes as Cobblemon's Bedrock models: boxes, box UVs, bones with
 * pivots. A reader that gets one convention wrong hands back a Rotom in
 * pieces, so the layout of a box UV is pinned, and a whole model has to come
 * out symmetric, standing on the floor, one mesh per cube.
 */
{
  const vite7 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { boxUV, buildGeo } = await vite7.ssrLoadModule("/src/lib/bedrock.ts");
    const { Box3, MeshBasicMaterial } = await import("three");
    const { readFileSync } = await import("node:fs");

    assert.deepEqual(boxUV([0, 0], [2, 3, 4], false), {
      east: [0, 4, 4, 3],
      north: [4, 4, 2, 3],
      west: [6, 4, 4, 3],
      south: [10, 4, 2, 3],
      up: [4, 0, 2, 4],
      down: [6, 4, 2, -4],
    });

    for (const name of ["rotom", "rotom_wash"]) {
      const file = new URL(`../src/assets/rotom/cobblemon/${name}.geo.json`, import.meta.url);
      const geo = JSON.parse(readFileSync(file, "utf8"))["minecraft:geometry"][0];
      const model = buildGeo(geo, new MeshBasicMaterial());
      let cubes = 0;
      model.traverse((o) => {
        if (o.isMesh) cubes++;
      });
      assert.equal(cubes, geo.bones.reduce((n, b) => n + (b.cubes?.length ?? 0), 0), `${name} lost cubes`);
      const box = new Box3().setFromObject(model);
      assert.ok(box.min.y > -0.1 && box.max.y > 0.5, `${name} is not standing on the floor`);
      // the body is symmetric even where the whole is not: the washing
      // machine trails its power cord off to one side
      const body = new Box3();
      model.updateMatrixWorld(true);
      model.getObjectByName("body").children.forEach((o) => o.isMesh && body.expandByObject(o));
      assert.ok(Math.abs(body.min.x + body.max.x) < 0.05, `${name}'s body comes out lopsided`);
    }

    console.log("ok — box UVs laid out like Blockbench, both Rotoms whole and upright");
  } finally {
    await vite7.close();
  }
}

/* ---------------------------------------------------------------- the dive
 * Rotom into the manhole and out of the ceiling below, and back up. The
 * motion starts where it floats, ends out of sight, arrives where it floats,
 * and only an arrival flashes — that flash is when the form changes.
 */
{
  const vite8 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { travel, moveMs } = await vite8.ssrLoadModule("/src/lib/descent.ts");

    const rest = travel(0, "out", "down");
    assert.deepEqual([rest.dy, rest.scale, rest.flash], [0, 1, 0], "the dive does not start where Rotom floats");
    const gone = travel(1, "out", "down");
    assert.ok(gone.dy <= -1.12 && gone.scale < 0.1, "Rotom has not gone into the shaft");
    assert.ok(travel(1, "out", "up").dy > 0, "going up leaves upwards");
    const landed = travel(1, "in", "down");
    assert.deepEqual([landed.dy, landed.scale], [0, 1], "an arrival does not end where Rotom floats");
    assert.ok(travel(0, "in", "down").dy > 0, "arriving from above starts above");
    assert.ok(travel(0, "in", "up").dy < 0, "arriving from below starts below");
    assert.ok(travel(0.5, "in", "down").flash > 0, "an arrival flashes");
    assert.equal(travel(0.5, "out", "down").flash, 0, "a departure flashes");
    assert.deepEqual(travel(2, "out", "down"), travel(1, "out", "down"), "p is not clamped");
    assert.deepEqual(travel(-1, "in", "up"), travel(0, "in", "up"), "p is not clamped");
    assert.ok(moveMs(true) < moveMs(false), "the short way is not shorter");

    console.log("ok — the dive leaves from the float, ends out of sight, and arrivals flash");
  } finally {
    await vite8.close();
  }
}
