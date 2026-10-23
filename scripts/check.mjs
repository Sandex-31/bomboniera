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
    const { STAGES, WIPED, jumpTo } = await vite5.ssrLoadModule("/src/lib/stages.ts");
    const puzzle = await vite5.ssrLoadModule("/src/data/puzzle.ts");
    const { buildMaze, validTrail } = await vite5.ssrLoadModule("/src/lib/maze.ts");
    const { FLOORS, complete } = await vite5.ssrLoadModule("/src/lib/beam.ts");
    const { solvedPlan } = await vite5.ssrLoadModule("/src/data/room.ts");
    const { START, COLS, dark, press } = await vite5.ssrLoadModule("/src/lib/lamps.ts");
    const { solvedSki, loadSki } = await vite5.ssrLoadModule("/src/lib/ski.ts");
    const { solvedTape } = await vite5.ssrLoadModule("/src/lib/tape.ts");

    // the reset is stop 0, so every key the puzzle keeps has to be on the list
    const keys = Object.entries(puzzle).filter(([n]) => n.endsWith("_KEY")).map(([, v]) => v);
    assert.deepEqual(
      new Set([...STAGES.map((st) => st.key), ...WIPED]),
      new Set(keys),
      "a puzzle key is missing from the stops",
    );

    for (let n = 0; n <= STAGES.length; n++) {
      store.set("leftover", "x");
      [...STAGES.map((st) => st.key), ...WIPED].forEach((key) => store.set(key, "stale"));
      jumpTo(n);
      // a key can carry more than one stop (the phrases of Babel do): it is
      // there if any stop up to here writes it
      STAGES.forEach(({ key }) =>
        assert.equal(store.has(key), STAGES.slice(0, n).some((st) => st.key === key), `stop ${n} gets ${key} wrong`),
      );
      WIPED.forEach((key) => assert.ok(!store.has(key), `stop ${n} leaves ${key} behind`));
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
    // the walls of the well: four, each its own way round the hall
    const { WALL_ANGLES } = await vite5.ssrLoadModule("/src/scenes/well/wall.ts");
    const turns = Object.values(WALL_ANGLES).map((a) => Math.round((((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) * 100));
    assert.equal(Object.keys(WALL_ANGLES).length, 4, "the well has four walls");
    assert.equal(new Set(turns).size, 4, "two walls of the well stand on the same angle");
    // the well comes right after the press, and the last stop leaves the visitor in it
    const labels = STAGES.map((st) => st.label);
    assert.equal(labels[labels.indexOf("pressa") + 1], "quarto piano", "the well is not the stop after the press");
    // and the hall comes right after the mural, and the last stop leaves the visitor in it
    assert.equal(labels[labels.indexOf("murale") + 1], "quinto piano", "the hall is not the stop after the mural");
    // every spot of the hall is a finger wide on a phone, and no two hit areas swallow each other
    const aula = await vite5.ssrLoadModule("/src/scenes/aula/spots.ts");
    assert.ok(aula.TAP_W * (390 / aula.FIT_W) >= 44, "a spot of the hall is under 44 px on a phone");
    const spots = Object.entries(aula.SPOTS);
    assert.equal(spots.length, 11, "the hall has ten exams and the desk");
    for (const [a, { position: p }] of spots) {
      for (const [b, { position: q }] of spots) {
        if (a < b) assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) >= aula.TAP_W - 1e-9, `${a} and ${b} stand too close to tap apart`);
      }
    }
    assert.equal(puzzle.floorFrom(store.get(puzzle.FLOOR_KEY)), 4, "the last stop leaves the visitor in the hall");
    // and the way back down from Babel is open, not a sarcophagus still to fill
    const { titlesDone } = await vite5.ssrLoadModule("/src/data/babel.ts");
    assert.ok(titlesDone(read(puzzle.TITLES_KEY)), "the jump leaves the sarcophagus shut");
    // and the machines of the third floor are as their stops left them
    const { boilersFrom, solvedBoilers } = await vite5.ssrLoadModule("/src/lib/boilers.ts");
    assert.deepEqual(boilersFrom(store.get(puzzle.BOILERS_KEY)), solvedBoilers(), "the jump leaves a boiler cold");
    const pipes = await vite5.ssrLoadModule("/src/lib/pipes.ts");
    const lit = { tondo: true, triangolo: true, quadrato: true };
    assert.ok(pipes.solved(pipes.flow(pipes.pipesFrom(store.get(puzzle.PIPES_KEY)), lit)), "the jump leaves the pipes wrong");
    const gears = await vite5.ssrLoadModule("/src/lib/gears.ts");
    const board = gears.spin(gears.gearsFrom(store.get(puzzle.GEARS_KEY)), true);
    assert.ok(Object.values(board.shafts).every((v) => v === "ok"), "the jump leaves the gears wrong");
    const hoist = await vite5.ssrLoadModule("/src/lib/hoist.ts");
    const hung = hoist.hoistFrom(store.get(puzzle.HOIST_KEY));
    assert.ok(hoist.tilt(hung) === 0 && hung.piece, "the jump leaves the hoist down");
    const card = await vite5.ssrLoadModule("/src/lib/card.ts");
    const organ = card.organFrom(store.get(puzzle.ORGAN_KEY));
    assert.ok(card.assembled(organ.lectern) && organ.played, "the jump leaves the organ unplayed");
    const thePress = await vite5.ssrLoadModule("/src/lib/press.ts");
    assert.ok(thePress.pressFrom(store.get(puzzle.PRESS_KEY)).pulled, "the jump leaves the press up");

    // the floor the visitor is on: whatever is stored, it lands on a real floor
    assert.equal(puzzle.floorFrom(null), 0, "never been down is the island");
    assert.equal(puzzle.floorFrom("1"), 1);
    assert.equal(puzzle.floorFrom("2"), 2);
    assert.equal(puzzle.floorFrom("3"), 3, "the well is a floor");
    assert.equal(puzzle.floorFrom("4"), 4, "the hall is a floor");
    assert.equal(puzzle.floorFrom("5"), 0, "there is nothing below the hall");
    assert.equal(puzzle.floorFrom("0"), 0, "been down and back up is the island");
    for (const bad of ["", "x", "-1", "1.5", String(puzzle.FLOORS), "99"]) {
      assert.equal(puzzle.floorFrom(bad), 0, `"${bad}" must fall back to the island`);
    }
    // the deepest floor ever reached, which makes the first trip down the long one
    assert.equal(puzzle.depthFrom(null), 0, "never been down");
    assert.equal(puzzle.depthFrom("2"), 2);
    assert.equal(puzzle.depthFrom("3"), 3, "the well is a depth");
    assert.equal(puzzle.depthFrom("4"), 4, "the hall is a depth");
    for (const bad of ["", "x", "-1", "1.5", "5", "99"]) {
      assert.equal(puzzle.depthFrom(bad), 0, `"${bad}" is no depth`);
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

    for (const name of ["rotom", "rotom_wash", "rotom_heat", "rotom_frost", "rotom_fan"]) {
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

    console.log("ok — box UVs laid out like Blockbench, all three Rotoms whole and upright");
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

    // catching fire in the machine room: it heats, burns, vanishes in smoke,
    // and only behind the smoke does it change
    const { burn, BURN_MS } = await vite8.ssrLoadModule("/src/lib/descent.ts");
    assert.deepEqual(burn(0), { heat: 0, shake: 0, flames: 0, smoke: 0, swapped: false }, "it starts as itself");
    const end = burn(BURN_MS);
    assert.deepEqual(
      [end.heat, end.shake, end.flames, end.smoke],
      [0, 0, 0, 0],
      "something is left burning",
    );
    assert.ok(end.swapped, "it comes out of the smoke unchanged");
    const swap = Array.from({ length: BURN_MS }, (_, ms) => ms).find((ms) => burn(ms).swapped);
    assert.ok(burn(swap).smoke >= 0.9, "the form changes where it can be seen");
    assert.ok(burn(1800).flames > 0.5 && burn(1800).heat > 0.5, "it is not burning before the smoke");
    assert.ok(BURN_MS >= 4000 && BURN_MS <= 5000, "not the four to five seconds of the spec");
    assert.deepEqual(burn(-5), burn(0), "ms is not clamped");
    assert.deepEqual(burn(BURN_MS + 999), end, "ms is not clamped");

    console.log("ok — the dive leaves from the float, ends out of sight, arrivals flash, and the burn hides its swap");
  } finally {
    await vite8.close();
  }
}

/* ----------------------------------------------------------- scenes hold
 * During a scene the camera does not move for the visitor. The wrapper div
 * stops taps, but a drag that starts on the keeper's bubble bubbles up to the
 * controls' own listener, so the controls themselves have to be switched off
 * for as long as the scene lasts, on every floor.
 */
{
  const { readFileSync } = await import("node:fs");
  for (const file of ["src/scenes/Puzzle.tsx", "src/scenes/Babel.tsx", "src/scenes/Engine.tsx"]) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const controls = src.match(/<OrbitControls\s[\s\S]*?\/>/)?.[0] ?? "";
    assert.match(controls, /enabled=\{!flying && !scene( && [^}]+)?\}/, `${file}: the camera can be turned during a scene`);
  }
  console.log("ok — no floor lets the camera turn during a scene");
}

/* ---------------------------------------------------------- the alphabets
 * The six scripts of the second floor: one symbol per letter of the Italian
 * alphabet, none shared, none that could pass for punctuation.
 */
{
  const vite9 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { ALPHABETS, LETTERS, tokens, bare, glyph } = await vite9.ssrLoadModule("/src/lib/scripts.ts");
    assert.equal(LETTERS, "abcdefghilmnopqrstuvz");
    const seen = new Set();
    for (const [name, symbols] of Object.entries(ALPHABETS)) {
      assert.equal(symbols.length, 21, `${name} has not 21 symbols`);
      assert.equal(new Set(symbols).size, 21, `${name} repeats a symbol`);
      for (const s of symbols) {
        assert.ok(!seen.has(s), `${s} is in two alphabets`);
        assert.ok(!" ,.…?!'’-".includes(s), `${name}: ${s} looks like punctuation`);
        seen.add(s);
      }
    }
    assert.equal(ALPHABETS.blocchi[14], "▤", "the r of the blocks is not ▤");
    assert.deepEqual(tokens("Così!"), [{ letter: 2 }, { letter: 12 }, { letter: 16 }, { letter: 8 }, { text: "!" }]);
    assert.throws(() => tokens("k"), "a letter the alphabets lack got through");
    assert.equal(bare("L'umanità è"), "lumanitae");
    assert.equal(glyph("stelle", 0), "✳");
    console.log("ok — the alphabets");
  } finally {
    await vite9.close();
  }
}

/* ---------------------------------------------------------- the languages
 * The six wall phrases and the chats that teach their scripts. The promise
 * the floor makes: no letter of a phrase is ever a blind guess. Each one has
 * turned up, in that phrase's script, in at least two different words of the
 * chats the visitor can read by then — and every chat between two peoples
 * has a word both of them say, which is what confirms a guess.
 */
{
  const vite10 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { tokens, bare, fold, LETTERS } = await vite10.ssrLoadModule("/src/lib/scripts.ts");
    const { PHRASES, CHATS, unlockedChats, acceptsPhrase, titleOf, titlesDone } =
      await vite10.ssrLoadModule("/src/data/babel.ts");
    const { langFrom } = await vite10.ssrLoadModule("/src/data/puzzle.ts");

    assert.deepEqual(
      PHRASES.map((p) => p.script),
      ["egizi", "stelle", "blocchi", "tubi", "onde", "esagrammi"],
    );
    assert.deepEqual(
      PHRASES.map((p) => p.text),
      [
        "Perché sente sempre la musica?",
        "il furtivo Pigmeo, così facilmente dimenticato",
        "Se vinci, vivrai. Se perdi, morirai. Se non combatti, non puoi vincere.",
        "Preferisco essere una scimmia senza cervello che un mostro senza cuore.",
        "L'umanità è nata sulla Terra. Non è mai stato destinato a morire qui",
        "Il tempo passa, le persone si muovono... Come il corso di un fiume, non finisce mai.",
      ],
    );
    PHRASES.forEach((p) => tokens(p.text));

    assert.ok(acceptsPhrase(0, "perche sente sempre la MUSICA"));
    assert.ok(acceptsPhrase(4, "l umanita e nata sulla terra non e mai stato destinato a morire qui"));
    assert.ok(!acceptsPhrase(0, "perche sente"));

    assert.equal(titleOf("L'attacco dei giganti"), 2);
    assert.equal(titleOf("ocarina of time"), 5);
    assert.equal(titleOf("baby driver"), 0);
    assert.equal(titleOf("halo"), null);
    const six = ["Interstellar", "dark souls", "Dragon Ball Z", "Zelda", "Attack on Titans", "Baby Driver"];
    assert.ok(titlesDone(six));
    assert.ok(!titlesDone([...six.slice(0, 5), "dark souls 1"]), "a title typed twice counted twice");

    const phases = (solved) => [...new Set(unlockedChats(solved).map((c) => c.phase))].sort();
    assert.deepEqual(phases([]), [0]);
    assert.deepEqual(phases([2]), [0, 3]);

    assert.deepEqual(langFrom(null), []);
    assert.deepEqual(langFrom("x"), []);
    assert.deepEqual(langFrom("[7]"), []);
    assert.deepEqual(langFrom("[1,1]"), []);
    assert.deepEqual(langFrom("[0,2]"), [0, 2]);

    assert.equal(new Set(CHATS.map((c) => c.id)).size, CHATS.length, "two chats share an id");
    const words = (text) => fold(text).split(/[^a-z]+/).filter(Boolean);

    for (const c of CHATS) {
      c.lines.forEach((l) => tokens(l.text));
      const all = bare(c.lines.map((l) => l.text).join(" "));
      PHRASES.forEach((p, i) =>
        assert.ok(!all.includes(bare(p.text)), `chat ${c.id} gives away phrase ${i + 1} whole`),
      );
      if (c.who[0] !== c.who[1]) {
        const said = (by) => new Set(c.lines.filter((l) => l.by === by).flatMap((l) => words(l.text)));
        const a = said(0);
        assert.ok([...said(1)].some((w) => a.has(w)), `mixed chat ${c.id} has no word both say`);
      }
    }

    // the chats of each phase, as the spec lays them out
    const at = (k) => CHATS.filter((c) => c.phase === k);
    assert.equal(at(0).length, 3);
    assert.ok(at(0).every((c) => c.who[0] === "egizi" && c.who[1] === "egizi"));
    for (let k = 1; k < 6; k++) {
      const s = PHRASES[k].script;
      const earlier = PHRASES.slice(0, k).map((p) => p.script);
      assert.ok(at(k).filter((c) => c.who[0] === s && c.who[1] === s).length >= 2, `phase ${k}: too few ${s} chats`);
      const mixed = at(k).filter((c) => c.who[0] !== c.who[1]);
      assert.ok(mixed.length >= 1, `phase ${k}: no mixed chat`);
      assert.ok(
        mixed.every((c) => c.who.includes(s) && c.who.some((w) => earlier.includes(w))),
        `phase ${k}: a mixed chat is not ${s} with an earlier people`,
      );
    }

    // coverage: every letter of a phrase, twice over, in its script, before it is due
    PHRASES.forEach((p, i) => {
      const heard = CHATS.filter((c) => c.phase <= i).flatMap((c) =>
        c.lines.filter((l) => c.who[l.by] === p.script).flatMap((l) => words(l.text)),
      );
      for (const ch of new Set(bare(p.text))) {
        const n = new Set(heard.filter((w) => w.includes(ch))).size;
        assert.ok(n >= 2, `phrase ${i + 1} (${p.script}): «${ch}» is in ${n} word(s) of the chats before it`);
      }
    });
    assert.ok(LETTERS.length === 21);
    console.log(`ok — the languages: ${CHATS.length} chats, every letter learnable before it is needed`);
  } finally {
    await vite10.close();
  }
}

/* ---------------------------------------------------------- the hieroglyphs
 * Drawn, not typed: 21 paths, one per letter, shared by the terminal (SVG)
 * and the wall (Path2D), so they have to be plain path data.
 */
{
  const vite11 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { HIEROGLYPHS } = await vite11.ssrLoadModule("/src/lib/hieroglyphs.ts");
    assert.equal(HIEROGLYPHS.length, 21);
    for (const d of HIEROGLYPHS) assert.match(d, /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/);
    assert.equal(new Set(HIEROGLYPHS).size, 21, "two hieroglyphs are the same drawing");
    console.log("ok — 21 hieroglyphs");
  } finally {
    await vite11.close();
  }
}

/* ---------------------------------------------------------- the folk
 * Every message of every chat has a beat for the figures to act it out, and
 * every loop a beat can name has an animation.
 */
{
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  const vite13 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { CHATS } = await vite13.ssrLoadModule("/src/data/babel.ts");
    const { BEATS, LOOPS, actAt } = await vite13.ssrLoadModule("/src/data/acting.ts");
    for (const c of CHATS) assert.equal(BEATS[c.id]?.length, c.lines.length, `chat «${c.id}»: one beat per message`);
    assert.deepEqual(Object.keys(BEATS).sort(), CHATS.map((c) => c.id).sort(), "beats for a chat that is not there");
    for (const l of LOOPS) assert.ok(css.includes(`.folk__fig--l-${l} `), `no animation for the loop «${l}»`);
    // what a figure does carries on until a beat changes it
    const beats = [{ a: { p: "point", h: "sword" }, show: ["army"] }, { a: { f: "sad" } }, { a: { h: null }, show: [] }];
    assert.deepEqual(actAt(beats, 1).a, { p: "point", f: "sad", x: 0, h: "sword", l: null });
    assert.deepEqual(actAt(beats, 1).show, ["army"]);
    assert.deepEqual(actAt(beats, 2), { a: { p: "point", f: "sad", x: 0, h: null, l: null }, b: actAt([], 0).b, show: [] });
    assert.equal(actAt(beats, -1).a.p, "stand");
    console.log(`ok — every message acted out, ${LOOPS.length} loops animated`);
  } finally {
    await vite13.close();
  }
}

/* ---------------------------------------------------------- windows below
 * Downstairs the island's windows are put out of sight, not closed. The
 * floor's own windows must not go with them — but must still clear out of
 * the way of a scene like every other window.
 */
{
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  const babel = readFileSync(new URL("../src/scenes/Babel.tsx", import.meta.url), "utf8");
  assert.ok(css.includes(".stage.is-below .win:not(.win--floor)"), "downstairs hides the floor's own windows too");
  const wins = babel.match(/<Window\b[\s\S]*?>/g) ?? [];
  assert.ok(wins.length >= 1, "the floor opens no windows");
  for (const w of wins) assert.match(w, /className="win--floor"/, "a window of the floor is hidden downstairs");
  console.log(`ok — the floor's ${wins.length} windows show downstairs`);
}

/* ---------------------------------------------------------- the sarcophagus
 * A slot lights when it names one of the six works, unless an earlier slot
 * already named that same work: the same title twice lights once.
 */
{
  const vite12 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { rightSlots } = await vite12.ssrLoadModule("/src/data/babel.ts");
    const { sarcLine } = await vite12.ssrLoadModule("/src/data/puzzle.ts");
    assert.deepEqual(
      rightSlots(["Zelda", "halo", "ocarina of time", "", "Interstellar", "dark souls"]),
      [true, false, false, false, true, true],
    );
    assert.ok(sarcLine.startsWith("Rotom:"));
    console.log("ok — the sarcophagus lights each work once");
  } finally {
    await vite12.close();
  }
}

/* ---------------------------------------------------------- the machine room
 * The third floor: five machines worked by hand, each with its rules in a
 * module of its own. What makes each one hard is checked here, not trusted.
 */
{
  const vite13 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    /* the boilers: one damper position per boiler lets the needle be caught
       in the green, and the smoke is what tells the three positions apart */
    const b = await vite13.ssrLoadModule("/src/lib/boilers.ts");
    assert.equal(new Set(b.RIGHT_DAMPERS).size, 3, "two boilers want the same damper");
    const catchable = (d, right) =>
      Array.from({ length: 8000 }, (_, ms) => b.rise(d, right, ms)).some((n) => b.release(n) === "lit");
    for (const right of b.RIGHT_DAMPERS) {
      for (const d of [0, 1, 2]) {
        assert.equal(catchable(d, right), d === right, `damper ${d} on a boiler wanting ${right}`);
      }
      assert.deepEqual(
        new Set([0, 1, 2].filter((d) => d !== right).map((d) => b.smoke(d, right))).has("grigio"),
        false,
        "a wrong damper smokes like the right one",
      );
      assert.equal(b.smoke(right, right), "grigio");
      // the green lasts long enough for a thumb, with the right damper
      const inGreen = Array.from({ length: 8000 }, (_, ms) => b.rise(right, right, ms)).filter(
        (n) => b.release(n) === "lit",
      ).length;
      assert.ok(inGreen >= 600, `the green lasts only ${inGreen} ms`);
      // and held on, it ends in the red
      assert.equal(b.release(b.rise(right, right, 8000)), "spat", "pumping on never blows");
    }
    assert.notEqual(b.smoke(2, 0), b.smoke(0, 2), "too little and too much air smoke the same");
    assert.equal(b.release(0), "out");
    assert.deepEqual(b.boilersFrom(null), b.COLD);
    for (const bad of ["x", "{}", '{"lit":[true],"dampers":[0,0,0],"doors":[1,0,0],"drawer":false,"piece":false}'])
      assert.deepEqual(b.boilersFrom(bad), b.COLD, `${bad} is not a boiler room`);
    assert.equal(
      b.boilersFrom(JSON.stringify({ ...b.COLD, piece: true })).piece,
      false,
      "a piece out of a drawer never opened",
    );
    const lit = b.boilersFrom(JSON.stringify(b.solvedBoilers()));
    assert.deepEqual(b.steamOf(lit), { tondo: true, triangolo: true, quadrato: true });
    assert.deepEqual(b.steamOf(b.COLD), { tondo: false, triangolo: false, quadrato: false });
    console.log("ok — the boilers: one damper each, told by the smoke, a green a thumb can catch");

    /* the pipes: one way through and no other. The search grows the three
       lines out from their inlets, deciding each piece only when steam gets
       to it, so pieces off the way are never counted twice. */
    const p = await vite13.ssrLoadModule("/src/lib/pipes.ts");
    const all = { tondo: true, triangolo: true, quadrato: true };
    const ways = (() => {
      const st = { turns: [...p.START.turns], switches: [...p.START.switches], valves: [...p.START.valves] };
      const outletAt = new Map(Object.entries(p.OUTLETS).map(([o, r]) => [r, o]));
      const inletAt = new Map(Object.entries(p.INLETS).map(([l, r]) => [r, l]));
      const step = { [p.N]: [0, -1], [p.E]: [1, 0], [p.S]: [0, 1], [p.WEST]: [-1, 0] };
      const found = [];
      const options = (x, y) => {
        const piece = p.GRID[y][x];
        const i = y * p.W + x;
        if (piece.kind === "rot") {
          const seen = new Set();
          return [0, 1, 2, 3].filter((k) => {
            const m = p.turn(p.BASE[piece.shape], k);
            return !seen.has(m) && seen.add(m);
          }).map((k) => () => (st.turns[i] = k));
        }
        if (piece.kind === "switch") {
          const s = p.SWITCHES.indexOf(i);
          return [true, false].map((v) => () => (st.switches[s] = v));
        }
        if (piece.kind === "valve") {
          const v = p.VALVES.indexOf(i);
          return [true, false].map((o) => () => (st.valves[v] = o));
        }
        return [() => {}];
      };
      const key = (x, y, entry) =>
        p.GRID[y][x].kind === "bridge" ? `${x},${y},${entry === p.N || entry === p.S ? "|" : "-"}` : `${x},${y}`;
      const run = (queue, decided, owner, reached) => {
        while (queue.length) {
          const [x, y, entry, line] = queue.pop();
          if (x < 0) {
            if (inletAt.get(y) !== line) return;
            continue;
          }
          if (x >= p.W) {
            const out = outletAt.get(y);
            if (!out) return;
            reached[line].add(out);
            continue;
          }
          if (y < 0 || y >= p.H || !p.GRID[y][x]) return;
          const cell = `${x},${y}`;
          if (!decided.has(cell)) {
            for (const choose of options(x, y)) {
              choose();
              run(
                [...queue, [x, y, entry, line]],
                new Set([...decided, cell]),
                new Map(owner),
                Object.fromEntries(Object.entries(reached).map(([l, r]) => [l, new Set(r)])),
              );
            }
            return;
          }
          const next = p.through(st, x, y, entry);
          if (next === "leak") return;
          const k = key(x, y, entry);
          if (owner.has(k)) {
            if (owner.get(k) !== line) return;
            continue;
          }
          owner.set(k, line);
          if (next === "sealed") continue;
          for (const d of next) queue.push([x + step[d][0], y + step[d][1], p.opposite(d), line]);
        }
        if (Object.entries(reached).every(([l, r]) => r.size === 1 && r.has(l))) {
          found.push(
            [...decided].sort().map((c) => {
              const [x, y] = c.split(",").map(Number);
              const i = y * p.W + x;
              return `${c}:${p.sidesOf(st, x, y)}:${st.switches[p.SWITCHES.indexOf(i)] ?? ""}:${st.valves[p.VALVES.indexOf(i)] ?? ""}`;
            }).join(" "),
          );
        }
      };
      run(
        Object.entries(p.INLETS).map(([l, r]) => [0, r, p.WEST, l]),
        new Set(),
        new Map(),
        { tondo: new Set(), triangolo: new Set(), quadrato: new Set() },
      );
      return new Set(found);
    })();
    assert.equal(ways.size, 1, `the pipes have ${ways.size} ways through, not one`);
    const right = p.solvedPipes();
    assert.ok(p.solved(p.flow(right, all)), "the stored way through is not one");
    assert.deepEqual(p.flow(right, all).leaks, [], "the way through leaks");
    assert.ok(!p.solved(p.flow(p.START, all)), "the panel comes solved");
    right.switches.forEach((_, k) => {
      const wrong = { ...right, switches: right.switches.map((v, j) => (j === k ? !v : v)) };
      assert.ok(!p.solved(p.flow(wrong, all)), `switch ${k} does not matter`);
    });
    right.valves.forEach((_, k) => {
      const wrong = { ...right, valves: right.valves.map((v, j) => (j === k ? !v : v)) };
      assert.ok(!p.solved(p.flow(wrong, all)), `valve ${k} does not matter`);
    });
    assert.ok(right.valves.includes(true) && right.valves.includes(false), "every valve is shut, or every one open");
    // a valve opened onto a dead end leaks; two lines run together mix
    const open = { ...right, valves: right.valves.map(() => true) };
    assert.ok(p.flow(open, all).leaks.length > 0, "an open dead end does not leak");
    const crossed = { ...right, switches: right.switches.map((v, j) => (j === 0 ? !v : v)) };
    assert.ok(Object.values(p.flow(crossed, all).outlets).some((o) => o !== "ok"), "a wrong lever goes unnoticed");
    // a cold boiler sends nothing, and its outlet is dead even with the way right
    assert.equal(p.flow(right, { ...all, tondo: false }).outlets.tondo, "none");
    assert.equal(p.flow(right, { ...all, tondo: false }).outlets.triangolo, "ok");
    assert.deepEqual(p.pipesFrom(null), p.START);
    for (const bad of ["x", "{}", JSON.stringify({ ...right, turns: [9] })]) assert.deepEqual(p.pipesFrom(bad), p.START);
    assert.deepEqual(p.pipesFrom(JSON.stringify(right)), right);
    const turnable = p.GRID.flat().filter((q) => q?.kind === "rot").length;
    console.log(
      `ok — the pipes: ${turnable} pieces to turn, ${p.SWITCHES.length} switches, ${p.VALVES.length} valves, one way through`,
    );

    /* the gears: every way the rack can be put on the pegs, and only one
       that turns all three shafts as their plates ask */
    const g = await vite13.ssrLoadModule("/src/lib/gears.ts");
    const boards = [];
    const counts = { 1: 0, 2: 0, 3: 0 };
    const stock = { 1: 0, 2: 0, 3: 0 };
    g.RACK.forEach((r) => stock[r]++);
    const pegs = g.PEGS.map((_, i) => i).filter((i) => i !== g.MOTOR.peg);
    const place = (i, state) => {
      if (i === pegs.length) {
        const sp = g.spin(state, true);
        if (Object.values(sp.shafts).every((v) => v === "ok")) boards.push(state);
        return;
      }
      place(i + 1, state);
      for (const size of [1, 2, 3]) {
        if (counts[size] >= stock[size] || !g.fits(state, pegs[i], size)) continue;
        // which rack gear of that size goes there does not matter
        const gear = g.RACK.findIndex((r, k) => r === size && !Object.values(state.placed).includes(k));
        counts[size]++;
        place(i + 1, { ...state, placed: { ...state.placed, [pegs[i]]: gear } });
        counts[size]--;
      }
    };
    place(0, g.EMPTY);
    assert.equal(boards.length, 1, `the gears turn right ${boards.length} ways, not one`);
    const geared = g.solvedGears();
    assert.ok(Object.values(g.spin(geared, true).shafts).every((v) => v === "ok"), "the stored board does not turn right");
    const used = Object.keys(geared.placed).length;
    assert.ok(used >= 6, `only ${used} gears to place`);
    assert.ok(used < g.RACK.length, "no spare gear to mislead");
    assert.ok(Object.values(geared.placed).includes(g.PIECE_BEHIND), "the piece behind the rack is never uncovered");
    assert.deepEqual(new Set(g.SHAFTS.map((s) => s.pace)).size, 2, "every plate asks the same pace");
    assert.deepEqual(new Set(g.SHAFTS.map((s) => s.dir)).size, 2, "every plate turns the same way");
    // with no steam nothing turns; take one gear out and its shaft stops
    assert.ok(Object.values(g.spin(geared, false).shafts).every((v) => v === "still"));
    const [firstPeg] = Object.keys(geared.placed);
    const fewer = { ...geared, placed: Object.fromEntries(Object.entries(geared.placed).filter(([k]) => k !== firstPeg)) };
    assert.ok(Object.values(g.spin(fewer, true).shafts).some((v) => v !== "ok"), "a gear more or less changes nothing");
    assert.deepEqual(g.gearsFrom(JSON.stringify(geared)), geared);
    assert.deepEqual(g.gearsFrom(null), g.EMPTY);
    for (const bad of ["x", "{}", '{"placed":{"0":0,"2":0},"piece":false}', '{"placed":{"0":0,"2":6},"piece":false}'])
      assert.deepEqual(g.gearsFrom(bad), g.EMPTY, `${bad} is not a board that can be built`);
    console.log(`ok — the gears: ${g.PEGS.length} pegs, ${g.RACK.length} in the rack, ${used} to place, one way to turn all three`);

    /* the hoist: one way to level the beam, and the scale enough to find it */
    const h = await vite13.ssrLoadModule("/src/lib/hoist.ts");
    const w = h.weightsForTest();
    const things = [...h.OBJECTS];
    const levels = [];
    let settings = 0;
    const hang = (i, used, where) => {
      if (i === things.length) {
        settings++;
        if (h.tilt({ ...h.START, where }) === 0) levels.push({ ...where });
        return;
      }
      hang(i + 1, used, { ...where, [things[i]]: "posto" });
      for (let k = 1; k <= h.NOTCHES; k++) {
        if (!used.has(k)) hang(i + 1, new Set([...used, k]), { ...where, [things[i]]: k });
      }
    };
    hang(0, new Set(), {});
    assert.equal(levels.length, 1, `the beam levels ${levels.length} ways`);
    assert.deepEqual(levels[0], h.solvedHoist().where, "the stored way does not level the beam");
    const hung = things.filter((t) => typeof levels[0][t] === "number");
    assert.ok(hung.length >= 3, "the beam levels with fewer than three things");
    const heaviestOut = [...hung].sort((a, b) => w[b] - w[a]);
    assert.ok(
      !heaviestOut.every((t, k) => k === 0 || levels[0][t] < levels[0][heaviestOut[k - 1]]),
      "the answer is just the heaviest the furthest out",
    );
    // what the scale can show: one or two things a pan, which side goes down
    const singles = things.map((_, i) => [i]);
    const pairs = things.flatMap((_, i) => things.map((_, j) => (i < j ? [i, j] : null)).filter(Boolean));
    const loads = [...singles, ...pairs];
    const shown = (ws) =>
      loads.flatMap((a) =>
        loads
          .filter((b) => !b.some((x) => a.includes(x)))
          .map((b) => Math.sign(b.reduce((s, x) => s + ws[x], 0) - a.reduce((s, x) => s + ws[x], 0))),
      );
    const truth = shown(things.map((t) => w[t]));
    const alike = [];
    const pick = (ws) => {
      if (ws.length === things.length) {
        if (shown(ws).every((v, k) => v === truth[k])) alike.push(ws);
        return;
      }
      for (let v = 1; v <= 12; v++) if (!ws.includes(v)) pick([...ws, v]);
    };
    pick([]);
    assert.equal(alike.length, 1, `${alike.length} sets of weights look the same on the scale`);
    // the scale and the beam read the same weights
    const scale = { ...h.START, where: { ...h.START.where, palla: "sinistra", ruota: "destra", secchio: "destra" } };
    assert.equal(h.weigh(scale), 0, "six is not two and four on the scale");
    assert.equal(h.canPut({ ...h.START, where: { ...h.START.where, palla: 2 } }, "ruota", 2), false, "two things on one notch");
    assert.deepEqual(h.hoistFrom(JSON.stringify(h.solvedHoist())), h.solvedHoist());
    assert.deepEqual(h.hoistFrom(null), h.START);
    for (const bad of ["x", "{}", JSON.stringify({ ...h.START, where: { ...h.START.where, palla: 1, ruota: 1 } })])
      assert.deepEqual(h.hoistFrom(bad), h.START, `${bad} is not a hoist`);
    console.log(`ok — the hoist: ${settings} settings of the beam, one level, and the scale enough to find it`);

    /* the punched card: it carries the tune, and goes back together one way */
    const c = await vite13.ssrLoadModule("/src/lib/card.ts");
    const read = Array.from({ length: c.COLS }, (_, col) => {
      const row = c.CARD.findIndex((r) => r[col] !== null);
      return { note: row, long: c.CARD[row][col] === "fessura" };
    });
    assert.deepEqual(read, c.MELODY, "the card does not carry the tune");
    assert.equal(new Set(c.MELODY.map((m) => m.note)).size, c.ROWS, "a whistle is never played");
    assert.ok(c.CARD.every((row) => row.length === c.COLS) && c.CARD.flat().filter(Boolean).length === c.COLS);
    const layings = [];
    const orders = [["A", "B", "C"], ["A", "C", "B"], ["B", "A", "C"], ["B", "C", "A"], ["C", "A", "B"], ["C", "B", "A"]];
    for (const order of orders) {
      for (let f = 0; f < 64; f++) {
        const lectern = order.map((piece, s) => ({ piece, flipH: Boolean((f >> (2 * s)) & 1), flipV: Boolean((f >> (2 * s + 1)) & 1) }));
        if (c.assembled(lectern)) layings.push(lectern);
      }
    }
    assert.equal(layings.length, 1, `the card goes together ${layings.length} ways`);
    assert.deepEqual(layings[0], c.solvedOrgan().lectern, "the card goes together some other way");
    assert.ok(!c.assembled([null, null, null]) && !c.assembled(c.solvedOrgan().lectern.slice(0, 2).concat([null])));
    // the edges alone do not decide it, nor the pins alone: both are needed
    const flipAll = ["C", "B", "A"].map((piece) => ({ piece, flipH: true, flipV: false }));
    assert.ok(!c.assembled(flipAll), "the card read back to front still goes together");
    // the tune, pulled: short and long count, the rhythm between does not
    const pull = (notes) => notes.reduce((done, { note, long }) => c.step(done, note, long ? 900 : 150), 0);
    assert.equal(pull(c.MELODY), c.MELODY.length, "the tune itself is refused");
    assert.notEqual(pull(c.MELODY.map((m, k) => (k === 2 ? { ...m, long: false } : m))), c.MELODY.length, "a short pull where a long one goes");
    assert.equal(c.step(5, c.MELODY[0].note, 100), 1, "a wrong note that starts the tune afresh is not counted");
    assert.equal(c.step(5, 2, 100), 0);
    assert.deepEqual(c.organFrom(JSON.stringify(c.solvedOrgan())), c.solvedOrgan());
    assert.deepEqual(c.organFrom(null), c.EMPTY);
    for (const bad of ["x", "{}", JSON.stringify({ lectern: [{ piece: "A", flipH: false, flipV: false }, { piece: "A", flipH: false, flipV: false }, null], played: false })])
      assert.deepEqual(c.organFrom(bad), c.EMPTY, `${bad} is not an organ`);
    console.log(`ok — the card: ${c.MELODY.length} notes on ${c.ROWS} whistles, ${orders.length * 64} ways to lay it, one right`);

    /* the press: three latches, all needed; a finale that ends in the hole */
    const pr = await vite13.ssrLoadModule("/src/lib/press.ts");
    assert.ok(pr.free({ quadrato: true, volano: true, organo: true }));
    for (const k of ["quadrato", "volano", "organo"])
      assert.ok(!pr.free({ quadrato: true, volano: true, organo: true, [k]: false }), `the lever comes down without ${k}`);
    assert.ok(pr.BLOWS.length === 3 && pr.BLOWS.every((b) => b < pr.BREAK_MS) && pr.BREAK_MS < pr.LINE_MS);
    assert.deepEqual(pr.pressFrom(null), pr.STILL);
    assert.deepEqual(pr.pressFrom("x"), pr.STILL);
    assert.deepEqual(pr.pressFrom(JSON.stringify(pr.solvedPress())), pr.solvedPress());
    const { pressLine, boilerLine, cardLine } = await vite13.ssrLoadModule("/src/data/puzzle.ts");
    for (const l of [pressLine, boilerLine, cardLine]) assert.ok(l.startsWith("Rotom:"));
    console.log("ok — the press: three latches, three blows, and the floor gives way");
  } finally {
    await vite13.close();
  }
}

/* ---------------------------------------------------------- pozzo: schermo
 * The walls of the well are game screens: a tap lands on a pixel, Rotom runs
 * to it without ever overshooting, and every sprite has a size and a file in
 * the one folder the originals are dropped into.
 */
{
  const vite14 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const px = await vite14.ssrLoadModule("/src/lib/well/pixels.ts");
    assert.equal(px.W, 320);
    assert.equal(px.H, 180);
    assert.deepEqual(px.toPixel({ x: 0, y: 1 }), [0, 0], "uv's top left is the canvas's top left");
    assert.deepEqual(px.toPixel({ x: 1, y: 0 }), [319, 179], "uv's bottom right is the last pixel");

    for (const [from, to, dt] of [[[0, 0], [300, 170], 1 / 60], [[10, 5], [10, 5], 0.1], [[319, 0], [0, 179], 0.5]]) {
      let at = from;
      let steps = 0;
      const d0 = Math.hypot(to[0] - from[0], to[1] - from[1]);
      while ((at[0] !== to[0] || at[1] !== to[1]) && steps < 10000) {
        const next = px.chase(at, to, dt);
        const step = Math.hypot(next[0] - at[0], next[1] - at[1]);
        assert.ok(step <= 140 * dt + 1e-9, "Rotom runs faster than his speed");
        assert.ok(Math.hypot(to[0] - next[0], to[1] - next[1]) <= Math.hypot(to[0] - at[0], to[1] - at[1]), "Rotom runs away");
        // never past the target: still on the segment from where he started
        assert.ok(Math.hypot(next[0] - from[0], next[1] - from[1]) <= d0 + 1e-9, "Rotom overshoots");
        at = next;
        steps++;
      }
      assert.deepEqual(at, to, "Rotom never gets there");
    }
    assert.deepEqual(px.chase([0, 0], [5, 0], 1, 100), [5, 0], "a faster Rotom stops on the target");
    assert.deepEqual(px.chase([0, 0], [30, 0], 1, 100, 20), [10, 0], "Rotom keeps his distance from the tap");
    assert.deepEqual(px.chase([25, 0], [30, 0], 1, 100, 20), [25, 0], "Rotom already close stays put");

    assert.ok(px.inCircle([10, 0], [0, 0], 10), "the rim is inside the circle");
    assert.ok(!px.inCircle([10, 1], [0, 0], 10));
    const r = { x: 4, y: 6, w: 10, h: 5 };
    assert.ok(px.hit([4, 6], r) && px.hit([13, 10], r), "a rect takes its first and last pixel");
    assert.ok(!px.hit([14, 6], r) && !px.hit([4, 11], r) && !px.hit([3, 6], r) && !px.hit([4, 5], r));

    const { SPRITES } = await vite14.ssrLoadModule("/src/lib/well/sprites.ts");
    const ids = ["rotomFrost", "chinchilla", "chest", "porcupine", "crow", "turtle", "bud", "ghost", "candle", "phone", "tv", "face", "flame", "blockPink", "blockBlue", "switchYellow", "switchGreen", "switchPink", "tile"];
    for (const id of ids) assert.ok(SPRITES[id], `no sprite ${id}`);
    for (const [id, s] of Object.entries(SPRITES)) {
      assert.ok(s.w > 0 && s.h > 0 && s.frames > 0, `${id} has no size`);
      assert.match(s.file, /^src\/assets\/animalwell\/[\w-]+\.png$/, `${id} is not in the originals' folder`);
      // a sheet that is there is exactly its frames side by side
      if (existsSync(s.file)) {
        const { decode } = await import("./png.mjs");
        const { readFileSync } = await import("node:fs");
        const sheet = decode(readFileSync(s.file));
        assert.deepEqual([sheet.width, sheet.height], [s.w * s.frames, s.h], `${s.file} does not match ${id}'s size in sprites.ts`);
      }
    }
    const { insideFrom } = await vite14.ssrLoadModule("/src/data/puzzle.ts");
    assert.ok(insideFrom("1"), "Rotom forgets he went into the walls");
    for (const bad of [null, "", "0", "true", "x"]) assert.ok(!insideFrom(bad), `${bad} counts as Rotom inside`);
    console.log(`ok — pozzo: schermo, ${px.W}x${px.H} pixels, ${Object.keys(SPRITES).length} sprites`);
  } finally {
    await vite14.close();
  }
}

/* ---------------------------------------------------------- pozzo: pilastri
 * Seven pillars on the four walls, listed clockwise from the arrival point;
 * each stamps a group of dots on the map, and the groups, joined, are the
 * digits of the number to dial: 9017432. Clockwise is the direction the wall
 * angles grow, as seen from above.
 */
{
  const vite15 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const pl = await vite15.ssrLoadModule("/src/lib/well/pillars.ts");
    const { WALL_ANGLES } = await vite15.ssrLoadModule("/src/scenes/well/wall.ts");
    assert.equal(pl.PILLARS.length, 7);
    assert.equal(pl.NUMBER.join(""), "9017432");
    for (const wall of Object.keys(WALL_ANGLES)) assert.ok(pl.PILLARS.some((p) => p.wall === wall), `no pillar on ${wall}`);
    const turns = pl.PILLARS.map((_, k) => pl.pillarTurn(k));
    turns.forEach((t, k) => k && assert.ok(t >= turns[k - 1], `pillar ${k} is not clockwise of pillar ${k - 1}`));
    assert.ok(turns[0] >= 0 && turns[6] < 2 * Math.PI, "the pillars do not fit one turn from the arrival point");

    const sets = new Set();
    for (let d = 0; d <= 9; d++) {
      const dots = pl.DIGIT_DOTS[d];
      assert.ok(dots && dots.length >= 5, `digit ${d} has no dots`);
      dots.forEach(([c, r]) => assert.ok(c >= 0 && c <= 2 && r >= 0 && r <= 4, `digit ${d} leaves the 3x5 grid`));
      const key = dots.map((p) => p.join(",")).sort().join(" ");
      assert.equal(new Set(dots.map((p) => p.join(","))).size, dots.length, `digit ${d} repeats a dot`);
      assert.ok(!sets.has(key), `digit ${d} has the dots of another digit`);
      sets.add(key);
    }
    const ids = [0, 1, 2, 3, 4, 5];
    assert.ok(pl.joins(2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) && pl.joins(1, [0, 1, 2, 3, 4, 5]), "the stroke order does not join");
    assert.ok(pl.joins(1, [5, 4, 3, 2, 1, 0]), "backwards does not join");
    assert.ok(!pl.joins(1, [0, 1, 3, 4, 5]), "a skipped dot joins");
    assert.ok(!pl.joins(1, [0, 1, 2, 3, 4]), "a short path joins");
    assert.ok(!pl.joins(1, [...ids, 0]), "a long path joins");
    assert.ok(!pl.joins(1, []), "no path joins");

    let s = pl.START;
    for (const [i, d] of pl.NUMBER.entries()) {
      const r = pl.dial(s, d);
      assert.ok(!r.busy, `digit ${i} of the number is busy`);
      assert.equal(r.state.flame, i === 6, `the flame comes at digit ${i}`);
      s = r.state;
    }
    assert.deepEqual(pl.dial(pl.START, 8).state.dialled, [], "a wrong digit stays dialled");
    for (let n = 0; n < 7; n++) {
      let t = pl.START;
      pl.NUMBER.slice(0, n).forEach((d) => (t = pl.dial(t, d).state));
      const wrong = pl.dial(t, (pl.NUMBER[n] + 1) % 10);
      assert.ok(wrong.busy && wrong.state.dialled.length === 0 && !wrong.state.flame, `a wrong digit after ${n} is not busy`);
    }

    assert.deepEqual(pl.loadPillars("x"), pl.START, "junk is not the start");
    assert.deepEqual(pl.loadPillars(null), pl.START);
    assert.deepEqual(pl.loadPillars(JSON.stringify({ ...pl.START, stamped: [true] })), pl.START, "a short list loads");
    assert.deepEqual(pl.loadPillars(JSON.stringify(pl.solvedPillars())), pl.solvedPillars(), "the solved state does not load");
    assert.ok(pl.solvedPillars().flame && pl.solvedPillars().uv, "the solved pillars have no flame");
    const uv = pl.solvedUv();
    assert.ok(uv.uv && uv.switches.every(Boolean) && !uv.flame && uv.stamped.every((b) => !b), "the lantern stop is more than the lantern");
    assert.ok(!pl.START.uv && !pl.START.flame);

    assert.ok(pl.ghostsScared(1000, 1000) && pl.ghostsScared(1000, 4999), "the ghosts return early");
    assert.ok(!pl.ghostsScared(1000, 5000) && !pl.ghostsScared(-Infinity, 0), "the ghosts stay away");

    // the first flame of the floor is the one that gets the line
    const { firstFlame } = await vite15.ssrLoadModule("/src/lib/well/flames.ts");
    const none = { tv: false, corvi: false, boccioli: false, pilastri: false };
    assert.ok(firstFlame({ ...none, pilastri: true }, "pilastri"), "the only flame is not the first");
    assert.ok(!firstFlame({ ...none, tv: true, pilastri: true }, "pilastri"), "a second flame is the first");
    assert.ok(firstFlame({ ...none, tv: true }, "tv"), "a flame alone on its wall is not the first");

    // fingers: every pillar is on its screen, a dot is reached from less than half-way to the next, groups never overlap
    const px = await vite15.ssrLoadModule("/src/lib/well/pixels.ts");
    pl.PILLARS.forEach((q, k) =>
      assert.ok(q.x >= 0 && q.y >= 0 && q.x + pl.PILLAR.w <= px.W && q.y + pl.PILLAR.h <= px.H, `pillar ${k} is off its screen`),
    );
    assert.ok(pl.DOT_REACH < pl.SPACING / 2, "two dots can both be under a finger");
    assert.ok(4 * pl.SPACING * (343 / 320) >= 60, "a digit is under 60 CSS px tall on a 390 px phone");
    const t = px.touchRect({ x: 10, y: 10, w: 8, h: 8 });
    assert.ok(t.w >= px.TOUCH && t.h >= px.TOUCH && t.x + t.w / 2 === 14 && t.y + t.h / 2 === 14, "touchRect is not about the middle");
    assert.ok(px.TOUCH * (343 / 320) >= 44, "TOUCH is under 44 CSS px");
    const boxes = pl.PILLARS.map((_, k) => pl.groupCentre(k));
    // and no group, nor a finger's reach of it, is under a button that swaps the views
    for (const to of [pl.TO_PHONE, pl.TO_MAP]) {
      const b = px.touchRect(to);
      boxes.forEach(([x, y], k) =>
        assert.ok(
          x + pl.GROUP_HALF.w + pl.DOT_REACH <= b.x || x - pl.GROUP_HALF.w - pl.DOT_REACH >= b.x + b.w || y - pl.GROUP_HALF.h - pl.DOT_REACH >= b.y + b.h || y + pl.GROUP_HALF.h + pl.DOT_REACH <= b.y,
          `group ${k} is under a view button`,
        ),
      );
    }
    boxes.forEach(([x, y], k) => {
      assert.ok(x - pl.GROUP_HALF.w >= 0 && x + pl.GROUP_HALF.w <= px.W && y - pl.GROUP_HALF.h >= 0 && y + pl.GROUP_HALF.h <= px.H, `group ${k} is off the screen`);
      assert.ok(Math.hypot(x - pl.MAP.x, y - pl.MAP.y) > pl.MAP.r + 20, `group ${k} sits on the map`);
      boxes.slice(k + 1).forEach(([x2, y2], j) =>
        assert.ok(Math.abs(x - x2) >= 2 * pl.GROUP_HALF.w || Math.abs(y - y2) >= 2 * pl.GROUP_HALF.h, `groups ${k} and ${k + j + 1} overlap`),
      );
    });

    const { STAGES } = await vite15.ssrLoadModule("/src/lib/stages.ts");
    const labels = STAGES.map((st) => st.label);
    assert.deepEqual(labels.slice(labels.indexOf("quarto piano"), labels.indexOf("murale") + 1), ["quarto piano", "luce uv", "pilastri", "tv", "corvi", "boccioli", "murale"], "the lantern, the pillars, the tv, the crows, the buds and the mural are not after the fourth floor");
    console.log("ok — pozzo: pilastri, 9017432 in senso orario, cifre sui puntini, telefono");
  } finally {
    await vite15.close();
  }
}


/* ---------------------------------------------------------- pozzo: tv
 * The chinchilla walks towards the last tap along blocks that are pink or
 * blue; the remote swaps them all at once. Left alone he always falls, but
 * a swap schedule on a 100 ms grid gets him to the sofa. The tune of the
 * TV is eight notes of the flute.
 */
{
  const vite16 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const tv = await vite16.ssrLoadModule("/src/lib/well/tv.ts");
    const { follow } = await vite16.ssrLoadModule("/src/lib/flute.ts");
    const FRAME = 1 / 60;
    const fresh = () => ({ x: tv.START_X, y: tv.FLOOR_Y, falling: false });

    // left alone, in either colour, he falls before the sofa
    for (const swapped of [false, true]) {
      let w = fresh();
      let fell = false;
      for (let f = 0; f < 60 * 20 && !fell; f++) {
        w = tv.walk(w, tv.SOFA_X, swapped, FRAME);
        fell = w.falling;
      }
      assert.ok(fell, `the chinchilla walks to the sofa without a swap (swapped ${swapped})`);
    }

    // a real search: at each 100 ms, swap or not; every way is tried, a fall ends a way
    const seen = new Map();
    function search(k, w, swapped) {
      const key = k + ":" + swapped;
      if (seen.has(key)) return seen.get(key);
      let found = null;
      if (w.x === tv.SOFA_X) found = [];
      else if (k < 200) {
        for (const flip of [false, true]) {
          const s = flip ? !swapped : swapped;
          let v = w;
          let ok = true;
          for (let f = 0; f < 6 && ok; f++) {
            v = tv.walk(v, tv.SOFA_X, s, FRAME);
            ok = !v.falling;
          }
          if (!ok) continue;
          const rest = search(k + 1, v, s);
          if (rest) {
            found = [flip, ...rest];
            break;
          }
        }
      }
      seen.set(key, found);
      return found;
    }
    const schedule = search(0, fresh(), false);
    assert.ok(schedule, "no swap schedule reaches the sofa");
    assert.ok(schedule.some(Boolean), "the sofa is reached without a swap");
    // and the schedule found really does it, frame by frame
    {
      let w = fresh();
      let swapped = false;
      for (const flip of schedule) {
        if (flip) swapped = !swapped;
        for (let f = 0; f < 6; f++) {
          w = tv.walk(w, tv.SOFA_X, swapped, FRAME);
          assert.ok(!w.falling, "the schedule found falls");
        }
      }
      assert.equal(w.x, tv.SOFA_X, "the schedule found stops short of the sofa");
    }
    assert.ok(tv.BLOCKS.some((b) => b.pink) && tv.BLOCKS.some((b) => !b.pink));
    assert.ok(tv.BLOCKS.every((b) => tv.solid(b, false) !== tv.solid(b, true)), "a swap leaves a block as it was");

    // a fall ends back at the start
    let w = { x: 200, y: tv.FLOOR_Y, falling: true };
    for (let f = 0; f < 60 * 5 && w.falling; f++) w = tv.walk(w, tv.SOFA_X, false, FRAME);
    assert.deepEqual(w, fresh(), "a fall does not end at the start");
    // and, in either colour, he then stands at the start instead of falling again
    for (const swapped of [false, true]) {
      let v = fresh();
      for (let f = 0; f < 120; f++) {
        v = tv.walk(v, tv.START_X, swapped, FRAME);
        assert.ok(!v.falling && v.x === tv.START_X, `he falls again at the start (swapped ${swapped})`);
      }
    }

    assert.ok(tv.dropChest(tv.CHEST_X) && tv.dropChest(tv.CHEST_X + 6) && tv.dropChest(tv.CHEST_X - 6), "the chest does not fall on the spot");
    assert.ok(!tv.dropChest(tv.CHEST_X + 6.5) && !tv.dropChest(tv.CHEST_X - 7), "the chest falls beside him");

    assert.equal(tv.TV_TUNE.length, 8);
    let n = 0;
    for (const p of tv.TV_TUNE) n = follow(tv.TV_TUNE, n, p);
    assert.equal(n, 8, "the whole TV tune does not count through");
    assert.ok(tv.TV_TUNE.some((p) => p.long), "the tune has no long note, so no open mouth");

    assert.deepEqual(tv.loadTv("x"), tv.START);
    assert.deepEqual(tv.loadTv(null), tv.START);
    assert.deepEqual(tv.loadTv(JSON.stringify({ chest: 1 })), tv.START, "a half state loads");
    assert.deepEqual(tv.loadTv(JSON.stringify(tv.solvedTv())), tv.solvedTv(), "the solved state does not load");

    const { STAGES } = await vite16.ssrLoadModule("/src/lib/stages.ts");
    const stop = STAGES.find((st) => st.label === "tv");
    assert.ok(stop && stop.solved().flame, "the tv stop has no flame");
    console.log("ok — pozzo: tv, uno scambio a tempo porta il cincilla al divano, melodia di 8 note");
  } finally {
    await vite16.close();
  }
}

/* ---------------------------------------------------------- pozzo: corvi
 * The porcupine walks on its own; only the barrier is the visitor's. A real
 * search over (porcupine, barrier, yellow cells seen) finds a way to all
 * three yellows, and no way exists with the barrier left alone. The eight
 * crows caw a fixed tune that the flute has to follow, rhythm included.
 */
{
  const vite17 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const cr = await vite17.ssrLoadModule("/src/lib/well/crows.ts");
    const { follow, DIRS } = await vite17.ssrLoadModule("/src/lib/flute.ts");
    const { LONG_MS } = await vite17.ssrLoadModule("/src/lib/card.ts");
    const key = (p) => `${p.x},${p.y}`;
    const bit = (p) => cr.YELLOW.findIndex(([x, y]) => x === p.x && y === p.y);
    const all = (1 << cr.YELLOW.length) - 1;
    assert.equal(cr.YELLOW.length, 3);

    // left alone, the barrier never lets him see all three, falling out and starting again included
    let p = cr.PORC_START;
    let seen = new Set([key(p)]);
    for (let i = 0; i < 500; i++) {
      p = cr.stepPorc(p, false);
      if (cr.fellOut(p)) {
        p = cr.PORC_START;
        seen = new Set();
      }
      seen.add(key(p));
      assert.ok(!cr.boxDone(seen), "the porcupine does it alone");
    }

    // BFS: before each step the barrier may be flipped or not
    const enc = (q, up, m) => `${q.x},${q.y},${q.dir},${up},${m}`;
    const m0 = bit(cr.PORC_START) < 0 ? 0 : 1 << bit(cr.PORC_START);
    const queue = [{ q: cr.PORC_START, up: false, m: m0, steps: 0 }];
    const marked = new Set([enc(cr.PORC_START, false, m0)]);
    let win = null;
    for (let i = 0; i < queue.length && !win; i++) {
      const { q, up, m, steps } = queue[i];
      for (const u of [up, !up]) {
        const n = cr.stepPorc(q, u);
        if (cr.fellOut(n)) continue;
        const b = bit(n);
        const nm = b < 0 ? m : m | (1 << b);
        if (nm === all) {
          win = steps + 1;
          break;
        }
        const k = enc(n, u, nm);
        if (!marked.has(k)) {
          marked.add(k);
          queue.push({ q: n, up: u, m: nm, steps: steps + 1 });
        }
      }
    }
    assert.ok(win, "no schedule of the barrier takes the porcupine to all three");
    assert.ok(cr.boxDone(new Set(cr.YELLOW.map(([x, y]) => `${x},${y}`))) && !cr.boxDone(new Set()), "boxDone is wrong");
    assert.ok(cr.stepPorc({ x: 3, y: 0, dir: -1 }, false).x === 2 && cr.stepPorc({ x: 0, y: 0, dir: -1 }, false).dir === 1, "he does not walk or turn at the edge");
    assert.ok(cr.stepPorc({ x: 4, y: 0, dir: 1 }, true).dir === -1 && cr.stepPorc({ x: 4, y: 0, dir: 1 }, false).x === 5, "the barrier does not turn him");
    assert.equal(cr.stepPorc({ x: 7, y: 0, dir: 1 }, false).y, 1, "he does not drop through a gap");

    // the crows: eight, each its direction; the tune is fixed
    assert.deepEqual(cr.CROWS, DIRS.map((_, i) => i));
    assert.equal(cr.CROW_TUNE.length, 8);
    assert.ok(new Set(cr.CROW_TUNE.map((t) => t.note)).size >= 6, "the tune has too few crows");
    assert.ok(cr.CROW_TUNE.filter((t) => t.long).length >= 2, "the tune has under two long notes");
    assert.ok(cr.LONG_CAW_MS >= LONG_MS && cr.SHORT_CAW_MS < LONG_MS, "a long caw is not long");
    let n = 0;
    for (const t of cr.CROW_TUNE) n = follow(cr.CROW_TUNE, n, t);
    assert.equal(n, 8, "the whole crows' tune does not count through");
    n = 0;
    cr.CROW_TUNE.forEach((t, i) => {
      n = follow(cr.CROW_TUNE, n, i === 3 ? { ...t, long: !t.long } : t);
    });
    assert.notEqual(n, 8, "the right order with a wrong length counts");

    // the caws in time: each one in turn, then over
    assert.equal(cr.cawAt(cr.CROW_TUNE, 0), 0);
    assert.equal(cr.cawAt(cr.CROW_TUNE, cr.SHORT_CAW_MS + 1), -1, "no gap between caws");
    assert.equal(cr.cawAt(cr.CROW_TUNE, 1e6), 8);

    assert.deepEqual(cr.loadCrows("x"), cr.START);
    assert.deepEqual(cr.loadCrows(null), cr.START);
    assert.deepEqual(cr.loadCrows(JSON.stringify({ box: true })), cr.START, "a half state loads");
    assert.deepEqual(cr.loadCrows(JSON.stringify(cr.solvedCrows())), cr.solvedCrows(), "the solved state does not load");

    const { STAGES } = await vite17.ssrLoadModule("/src/lib/stages.ts");
    const stop = STAGES.find((st) => st.label === "corvi");
    assert.ok(stop && stop.solved().flame, "the crows stop has no flame");
    console.log(`ok — pozzo: corvi, la barriera a tempo porta il porcospino ai tre gialli in ${win} passi, 8 corvi con il ritmo`);
  } finally {
    await vite17.close();
  }
}

/* ---------------------------------------------------------- pozzo: boccioli
 * The mural's mirrors are fixed. The beam crosses the grid and reaches the
 * four buds in an order that is not their order on the wall; some mirrors on
 * its path show only under UV. The turtles rise to a tune painted by water.
 */
{
  const vite18 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const bu = await vite18.ssrLoadModule("/src/lib/well/buds.ts");
    const { follow } = await vite18.ssrLoadModule("/src/lib/flute.ts");
    const order = bu.budOrder();
    assert.deepEqual([...order].sort(), [0, 1, 2, 3], "the order is not a permutation of the buds");
    const path = bu.traceMural();
    // what the visitor sees: the buds ranked by column (then row), reached in the beam's order
    const rank = bu.MURAL.buds.map((b, k) => bu.MURAL.buds.filter((o) => o.cell[0] < b.cell[0] || (o.cell[0] === b.cell[0] && o.cell[1] < b.cell[1])).length);
    assert.ok(order.map((k) => rank[k]).filter((r, i) => r === i).length <= 1, "more than one bud is reached in its left-to-right place");
    const fh = bu.firstHidden();
    const hm = bu.MURAL.mirrors.find((m) => m.hidden && m.cell[0] === path[fh]?.[0] && m.cell[1] === path[fh]?.[1]);
    assert.ok(hm, "the first hidden mirror is not on the path");
    assert.ok(order.some((k) => path.findIndex(([x, y]) => x === bu.MURAL.buds[k].cell[0] && y === bu.MURAL.buds[k].cell[1]) > fh), "every bud is reached before the dark part: UV is not needed");
    const hidden = bu.MURAL.mirrors.filter((m) => m.hidden);
    assert.ok(hidden.length >= 2, "under two hidden mirrors");
    hidden.forEach((m) => assert.ok(path.some(([x, y]) => x === m.cell[0] && y === m.cell[1]), "a hidden mirror is off the path"));
    // the beam leaves the grid after the last bud
    const [w, h] = bu.MURAL.size;
    const lastBud = bu.MURAL.buds[order[3]].cell;
    assert.ok(path.some(([x, y]) => x === lastBud[0] && y === lastBud[1]), "the last bud is not on the path");
    const end = path[path.length - 1];
    assert.ok(end[0] === 0 || end[1] === 0 || end[0] === w - 1 || end[1] === h - 1, "the beam does not end at the edge");
    assert.ok(path.length < w * h * 4, "the beam never leaves");
    assert.deepEqual(bu.BUD_TUNE, order.map((k) => bu.MURAL.buds[k]));
    assert.equal(bu.TURTLE_TUNE.length, 4);
    let n = 0;
    for (const t of bu.TURTLE_TUNE) n = follow(bu.TURTLE_TUNE, n, t);
    assert.equal(n, 4, "the turtles' tune does not count through");
    assert.deepEqual(bu.loadBuds("x"), bu.START);
    assert.deepEqual(bu.loadBuds(null), bu.START);
    assert.deepEqual(bu.loadBuds(JSON.stringify({ turtles: true, played: 9, flame: false })), bu.START, "a count past the buds loads");
    assert.deepEqual(bu.loadBuds(JSON.stringify(bu.solvedBuds())), bu.solvedBuds());
    const { STAGES } = await vite18.ssrLoadModule("/src/lib/stages.ts");
    const stop = STAGES.find((st) => st.label === "boccioli");
    assert.ok(stop && stop.solved().flame, "the buds stop has no flame");
    assert.equal(STAGES[STAGES.findIndex((st) => st.label === "corvi") + 1].label, "boccioli", "boccioli is not after corvi");
    console.log(`ok — pozzo: boccioli, il raggio raggiunge i boccioli in ordine ${order.join(",")}`);
  } finally {
    await vite18.close();
  }
}

/* ---------------------------------------------------------- pozzo: murale
 * The community mural on the altar: one piece per puzzle already solved, put
 * back top to bottom in the order the puzzles come, with decoys left out. It
 * opens only once the four candles are lit.
 */
{
  const vite19 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const mu = await vite19.ssrLoadModule("/src/lib/well/mural.ts");
    const { STAGES } = await vite19.ssrLoadModule("/src/lib/stages.ts");
    const labels = STAGES.map((st) => st.label);
    // each piece and the stop it was won at: the slots go down the chain
    const FROM = { lost: "labirinto", occhio: "specchi", stella: "pianta", codice: "comprensorio", nastro: "macchinario", babele: "lingue: 3 frasi", scheda: "organo" };
    assert.deepEqual([...mu.SLOTS].sort(), Object.keys(FROM).sort(), "the slots are not the seven pieces");
    const at = mu.SLOTS.map((p) => labels.indexOf(FROM[p]));
    assert.ok(at.every((i) => i >= 0), "a piece comes from no stop");
    at.slice(1).forEach((i, k) => assert.ok(i > at[k], `${mu.SLOTS[k + 1]} is above ${mu.SLOTS[k]} in the chain`));
    const decoys = mu.PIECES.filter((p) => !mu.SLOTS.includes(p));
    assert.ok(decoys.length >= 4, "under four decoys");
    assert.ok(mu.SLOTS.every((p) => mu.PIECES.includes(p)), "a slot's piece is not on offer");
    assert.equal(new Set(mu.PIECES).size, mu.PIECES.length, "a piece is on offer twice");
    // a piece moves, it is never in two slots
    let s = mu.place(mu.START, 0, "lost");
    s = mu.place(s, 2, "lost");
    assert.equal(s.placed[0], null, "the piece stayed where it was");
    assert.equal(s.placed[2], "lost");
    assert.equal(s.placed.filter((p) => p === "lost").length, 1, "the piece was copied");
    s = mu.place(s, 2, "occhio");
    assert.ok(!s.placed.includes("lost"), "a piece put over another leaves both");
    assert.equal(mu.place(s, 2, null).placed[2], null, "a slot does not empty");
    // done only on the exact order
    const fill = (order) => order.reduce((st, p, i) => mu.place(st, i, p), mu.START);
    assert.ok(fill(mu.SLOTS).done, "the right order is not done");
    assert.ok(!fill([...mu.SLOTS.slice(0, 5), mu.SLOTS[6], mu.SLOTS[5]]).done, "two swapped is done");
    assert.ok(!fill([...mu.SLOTS.slice(0, 6), decoys[0]]).done, "a decoy is done");
    assert.ok(!fill(mu.SLOTS.slice(0, 6)).done, "six of seven is done");
    // the panel opens only with the four flames
    const all = { tv: true, corvi: true, boccioli: true, pilastri: true };
    assert.ok(mu.lit(all));
    for (const w of Object.keys(all)) assert.ok(!mu.lit({ ...all, [w]: false }), `lit without ${w}`);
    // garbage reads back as the empty mural
    for (const bad of [null, "x", "{}", "[]", JSON.stringify({ placed: [] }), JSON.stringify({ placed: Array(7).fill("nope") }), JSON.stringify({ placed: Array(7).fill("lost") })])
      assert.deepEqual(mu.loadMural(bad), mu.START, `${bad} loads`);
    assert.deepEqual(mu.loadMural(JSON.stringify(mu.solvedMural())), mu.solvedMural());
    assert.ok(mu.solvedMural().done);
    const stop = STAGES.find((st) => st.label === "murale");
    assert.ok(stop && stop.solved().done, "the mural stop is not done");
    assert.equal(labels[labels.indexOf("boccioli") + 1], "murale", "murale is not after boccioli");
    console.log(`ok — pozzo: murale, ${mu.SLOTS.length} pezzi in ordine di piano, ${decoys.length} falsi`);
  } finally {
    await vite19.close();
  }
}

/* ---------------------------------------------------------- aula: catena
 * The ten exams of the hall and what they need: a prerequisite passed only
 * counts when its own are, a wrong answer locks for an appello that a clock
 * moved back cannot stretch, and the debug stops land one exam at a time.
 */
{
  const vite20 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const c = await vite20.ssrLoadModule("/src/lib/aula/chain.ts");
    const { STAGES, WIPED } = await vite20.ssrLoadModule("/src/lib/stages.ts");
    const { AULA_KEY } = await vite20.ssrLoadModule("/src/data/puzzle.ts");
    const { exams } = await vite20.ssrLoadModule("/src/data/exams.ts");
    const ids = Object.keys(c.PREREQ);
    assert.equal(ids.length, 10, "the hall has ten exams");
    assert.deepEqual([...c.ORDER].sort(), [...ids].sort(), "ORDER is not the ten exams");
    // ORDER puts every exam after what it needs, which also proves the graph has no cycle
    c.ORDER.forEach((id, i) =>
      c.PREREQ[id].forEach((p) => assert.ok(c.ORDER.indexOf(p) < i, `${id} comes before ${p}`)),
    );
    assert.deepEqual([...c.PREREQ.si].sort(), ids.filter((id) => id !== "si").sort(), "si needs all nine others");
    for (const id of ids) assert.ok(exams.some((e) => e.id === c.EXAM_OF[id]), `${id} has no exam in exams.ts`);

    // a tampered or broken save is the untouched floor
    assert.deepEqual(c.loadAula("{"), c.INITIAL);
    assert.deepEqual(c.loadAula(null), c.INITIAL);
    assert.deepEqual(c.loadAula('{"passed":["zzz"]}'), c.INITIAL, "an unknown exam is kept");
    assert.deepEqual(c.loadAula("[1]"), c.INITIAL);
    assert.deepEqual(c.loadAula('{"failedAt":{"arch":"x","zzz":1},"soGrade":99,"laptop":"boom"}'), c.INITIAL);
    const s = c.loadAula(JSON.stringify({ ...c.INITIAL, passed: ["so", "fisica", "analisi"] }));
    assert.equal(c.passed(s, "so"), false, "so counts as passed without asd");
    assert.equal(c.passed(s, "fisica"), true);
    assert.equal(c.open(s, "so"), false);

    // the appello: full from the failure, over after it, never longer if the clock went back
    const t = 1_000_000;
    assert.equal(c.lockedFor(t, t), c.APPELLO_MS);
    assert.equal(c.lockedFor(t, t + c.APPELLO_MS), 0);
    assert.equal(c.lockedFor(undefined, t), 0);
    assert.ok(c.lockedFor(t + 600_000, t) <= c.APPELLO_MS, "a clock moved back locks for longer than an appello");
    // and it runs out one appello of real time later, whether found on load or while counting down
    const ahead = c.fail(c.INITIAL, "arch", t + 600_000);
    const loaded = c.loadAula(JSON.stringify(ahead), t);
    assert.equal(c.lockedFor(loaded.failedAt.arch, t + c.APPELLO_MS), 0, "a failure stamped in the future outlasts its appello after a reload");
    assert.equal(c.lockedFor(c.settle(ahead, t).failedAt.arch, t + c.APPELLO_MS), 0, "a failure stamped in the future outlasts its appello");
    const behind = c.fail(c.INITIAL, "arch", t);
    assert.equal(c.settle(behind, t + 5), behind, "settle touches a failure that is not ahead");
    assert.ok(c.APPELLO_MS <= 60_000);
    assert.equal(c.lockedFor(c.fail(c.INITIAL, "arch", t).failedAt.arch, t + 1), c.APPELLO_MS - 1);

    // the mood of the prof of Sistemi Operativi, 18 to 30, drawn once
    assert.equal(c.pass(c.INITIAL, "so", () => 0).soGrade, 18);
    assert.equal(c.pass(c.INITIAL, "so", () => 0.9999).soGrade, 30);
    assert.equal(c.pass(c.pass(c.INITIAL, "so", () => 0), "so", () => 0.9999).soGrade, 18, "the grade is drawn again");

    // each debug stop: exactly the first i passed, the next open, and saved as it loads
    for (let i = 0; i <= c.ORDER.length; i++) {
      const up = c.aulaUpTo(i);
      c.ORDER.forEach((id, k) => assert.equal(c.passed(up, id), k < i, `aulaUpTo(${i}) gets ${id} wrong`));
      if (i < c.ORDER.length) assert.ok(c.open(up, c.ORDER[i]), `aulaUpTo(${i}) leaves ${c.ORDER[i]} shut`);
      assert.deepEqual(c.loadAula(JSON.stringify(up)), up, `aulaUpTo(${i}) does not survive a reload`);
    }
    const book = c.libretto(c.aulaUpTo(10));
    assert.deepEqual(book.map((e) => e.id), [...c.ORDER]);
    for (const e of book) {
      if (e.id === "so") assert.match(e.grade, /^(1[89]|2\d|30)$/, "so has no grade");
      else assert.equal(e.grade, "superato", `${e.id} is not superato`);
    }
    assert.ok(c.libretto(c.INITIAL).every((e) => e.grade === null && e.name), "an empty libretto has grades or no names");

    // the stops: one per exam, in ORDER, right after the hall itself
    assert.ok(!WIPED.includes(AULA_KEY), "the hall is still wiped rather than a stop");
    const labels = STAGES.map((st) => st.label);
    const at = labels.indexOf("quinto piano");
    c.ORDER.forEach((id, i) => {
      const stop = STAGES[at + 1 + i];
      assert.equal(stop.label, `aula: ${book[i].name}`, `stop ${at + 1 + i} is not ${id}`);
      assert.equal(stop.key, AULA_KEY);
      assert.deepEqual(stop.solved(), c.aulaUpTo(i + 1));
    });
    console.log(`ok — aula: catena, ${ids.length} esami, appello ${c.APPELLO_MS / 1000} s, ${c.ORDER.length} fermate`);
  } finally {
    await vite20.close();
  }
}

/* ---------------------------------------------------------- aula: architettura, asd
 * The program on the blackboard, run on a digit of the well's telephone,
 * gives a byte; the byte makes the corridors between the benches slow or
 * fast, and the one quickest way from the door to the desk is the answer.
 * Leaving the byte out, or counting hops, gives a different way.
 */
{
  const vite21 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const ar = await vite21.ssrLoadModule("/src/lib/aula/arch.ts");
    const as = await vite21.ssrLoadModule("/src/lib/aula/asd.ts");
    const c = await vite21.ssrLoadModule("/src/lib/aula/chain.ts");
    const { NUMBER } = await vite21.ssrLoadModule("/src/lib/well/pillars.ts");
    const { buildMaze, passable } = await vite21.ssrLoadModule("/src/lib/maze.ts");

    // a tiny loop: r1 = 3 + 3 + 3 + 3, counted down in r2, and 8 bits wide
    const tiny = [
      { op: "MOV", a: "r1", b: 0 },
      { op: "MOV", a: "r2", b: 4 },
      { op: "ADD", a: "r1", b: "r0" },
      { op: "DEC", a: "r2" },
      { op: "JNZ", a: "r2", b: 2 },
      { op: "MOV", a: "r0", b: "r1" },
    ];
    assert.equal(ar.run(tiny, 3), 12, "the tiny loop does not run four times");
    assert.equal(ar.run(tiny, 100), 400 & 0xff, "the registers are not 8 bits");
    assert.equal(ar.run([{ op: "SHL", a: "r0", b: 1 }, { op: "SHR", a: "r0", b: 2 }, { op: "XOR", a: "r0", b: 1 }, { op: "OR", a: "r0", b: 8 }, { op: "AND", a: "r0", b: 12 }, { op: "SUB", a: "r0", b: 1 }], 6), 7);
    assert.throws(() => ar.run([{ op: "JNZ", a: "r0", b: 0 }], 1), "a program that never ends is run forever");

    // the program on the board loops at least four times, and its answer has both kinds of bit
    let loops = 0;
    ar.run(ar.PROGRAM, NUMBER[ar.PHONE_DIGIT_INDEX], () => loops++);
    assert.ok(loops >= 4, `the program jumps back only ${loops} times`);
    assert.ok(Number.isInteger(ar.PHONE_DIGIT_INDEX) && ar.PHONE_DIGIT_INDEX >= 0 && ar.PHONE_DIGIT_INDEX < NUMBER.length);
    assert.equal(ar.ARCH_ANSWER, ar.run(ar.PROGRAM, NUMBER[ar.PHONE_DIGIT_INDEX]));
    assert.ok(ar.ARCH_ANSWER >= 1 && ar.ARCH_ANSWER <= 254, `ARCH_ANSWER ${ar.ARCH_ANSWER} is all one bit`);
    // every other digit of the telephone gives another byte: the right one has to be read off the drawing
    NUMBER.forEach((d, i) => {
      if (d !== NUMBER[ar.PHONE_DIGIT_INDEX]) assert.notEqual(ar.run(ar.PROGRAM, d), ar.ARCH_ANSWER, `digit ${i} gives the answer too`);
    });
    const levers = [...ar.ARCH_ANSWER.toString(2).padStart(8, "0")].map((b) => b === "1");
    assert.ok(ar.checkArch(levers), "the right levers are turned down");
    assert.ok(!ar.checkArch([...levers].reverse()), "the levers are read LSB first");
    for (let k = 0; k < 8; k++) assert.ok(!ar.checkArch(levers.map((v, j) => (j === k ? !v : v))), `lever ${k} is ignored`);
    assert.ok(!ar.checkArch(levers.slice(1)), "seven levers pass");

    // the benches lie on the maze of the first floor, a finger apart on the sheet
    const maze = buildMaze();
    for (const { id, cell: [r, col] } of as.NODES) {
      const ways = [[r - 1, col], [r + 1, col], [r, col - 1], [r, col + 1]].filter((n) => passable(maze, [r, col], n));
      assert.ok(ways.length > 0, `bench ${id} is on a cell of the maze no way leads into`);
    }
    as.NODES.forEach((n, i) => assert.equal(n.id, i, "NODES are not numbered in order"));
    for (const a of as.NODES)
      for (const b of as.NODES)
        if (a.id < b.id) assert.ok(Math.hypot(a.cell[0] - b.cell[0], a.cell[1] - b.cell[1]) * as.CELL_PX >= 44, `benches ${a.id} and ${b.id} are under 44 px apart`);
    assert.ok(as.EDGES.every((e) => e.bit >= 0 && e.bit < 8 && e.a !== e.b), "an edge has no bit of the byte, or is a loop");
    assert.deepEqual([...new Set(as.EDGES.map((e) => e.bit))].sort(), [0, 1, 2, 3, 4, 5, 6, 7], "some bit of the byte is not used");

    // every simple way from the door to the desk, by brute force
    const all = [];
    const walk = (at, seen, way) => {
      if (at === as.DESK) return all.push([...way]);
      for (const e of as.EDGES) {
        const to = e.a === at ? e.b : e.b === at ? e.a : -1;
        if (to < 0 || seen.has(to)) continue;
        seen.add(to);
        way.push(to);
        walk(to, seen, way);
        way.pop();
        seen.delete(to);
      }
    };
    walk(as.DOOR, new Set([as.DOOR]), [as.DOOR]);
    const w = as.weights(ar.ARCH_ANSWER);
    assert.equal(w.length, as.EDGES.length);
    as.EDGES.forEach((e, k) => assert.equal(w[k], (ar.ARCH_ANSWER >> e.bit) & 1 ? as.FAST : as.SLOW));
    const cost = (way) =>
      way.slice(1).reduce((s, n, i) => s + w[as.EDGES.findIndex((e) => (e.a === way[i] && e.b === n) || (e.b === way[i] && e.a === n))], 0);
    const best = Math.min(...all.map(cost));
    const winners = all.filter((way) => cost(way) === best);
    assert.equal(winners.length, 1, `${winners.length} ways tie at ${best}`);
    assert.deepEqual(as.ASD_ANSWER, winners[0], "Dijkstra does not find the one quickest way");
    assert.deepEqual(as.shortest(ar.ARCH_ANSWER), as.ASD_ANSWER);
    // the byte matters: counting hops, or every corridor alike, goes another way
    const fewest = Math.min(...all.map((way) => way.length));
    assert.ok(all.filter((way) => way.length === fewest).every((way) => JSON.stringify(way) !== JSON.stringify(as.ASD_ANSWER)), "the quickest way is also the shortest");
    assert.notDeepEqual(as.shortest(0), as.ASD_ANSWER, "the byte does not matter");
    assert.ok(as.checkAsd(as.ASD_ANSWER));
    assert.ok(!as.checkAsd(as.shortest(0)));
    assert.ok(!as.checkAsd(as.ASD_ANSWER.slice(0, -1)), "a way short of the desk passes");

    const r = c.results();
    assert.equal(r.arch, ar.ARCH_ANSWER);
    assert.deepEqual(r.asd, as.ASD_ANSWER);
    console.log(`ok — aula: architettura ${ar.ARCH_ANSWER} (${loops} giri), asd ${as.ASD_ANSWER.join("-")} su ${all.length} vie`);
  } finally {
    await vite21.close();
  }
}

/* ---------------------------------------------------------- aula: analisi, fisica
 * The area under the curve on the big blackboard, an integer, turned down
 * the first time it is right and passed the second; then that area in volts
 * across a circuit of colour-banded resistors, where only one filling of its
 * slots lifts the iron weight and the trembling needle cannot tell which.
 */
{
  const vite22 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const an = await vite22.ssrLoadModule("/src/lib/aula/analisi.ts");
    const fi = await vite22.ssrLoadModule("/src/lib/aula/fisica.ts");
    const c = await vite22.ssrLoadModule("/src/lib/aula/chain.ts");

    // the area, against a Simpson's rule of its own
    assert.ok(Number.isInteger(an.ANALISI_ANSWER), "the area is not an integer");
    const n = 20_000;
    const h = (an.B - an.A) / n;
    let sum = an.f(an.A) + an.f(an.B);
    for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * an.f(an.A + i * h);
    assert.ok(Math.abs((sum * h) / 3 - an.ANALISI_ANSWER) < 1e-6, "the area is not the integral of f");
    for (let x = an.A; x <= an.B; x += 0.01) assert.ok(an.f(x) > 0, `the curve dips under the axis at ${x}`);
    assert.ok(an.REASONS.length > 0);

    // the second shot: stamped first, passed once stamped, wrong is wrong either way
    const stamped = c.fail(c.INITIAL, "analisi", 1_000, true);
    assert.equal(an.judgeAnalisi(c.INITIAL, an.ANALISI_ANSWER), "stamp");
    assert.equal(an.judgeAnalisi(stamped, an.ANALISI_ANSWER), "pass");
    assert.equal(an.judgeAnalisi(c.INITIAL, an.ANALISI_ANSWER + 1), "fail");
    assert.equal(an.judgeAnalisi(stamped, an.ANALISI_ANSWER - 1), "fail");
    assert.ok(stamped.analisiStamped && stamped.failedAt.analisi === 1_000, "the stamp is not a failure on the register");
    assert.equal(c.fail(c.INITIAL, "analisi", 1_000).analisiStamped, false, "a wrong answer stamps");
    assert.equal(c.fail(stamped, "analisi", 2_000).analisiStamped, true, "a wrong answer after the stamp loses it");
    assert.ok(c.passed(c.pass(stamped, "analisi"), "analisi"));

    // the bands, by the real 4-band code
    const code = ["black", "brown", "red", "orange", "yellow", "green", "blue", "violet", "grey", "white"];
    for (const r of fi.RESISTORS) {
      assert.equal(r.bands.length, 4, `${r.id} has not four bands`);
      const [d1, d2, m] = r.bands.map((b) => code.indexOf(b));
      assert.ok(d1 > 0 && d2 >= 0 && m >= 0, `${r.id} has a band out of the code`);
      assert.equal(r.bands[3], "gold", `${r.id} has no tolerance band`);
      assert.equal((d1 * 10 + d2) * 10 ** m, r.ohms, `${r.id} does not read ${r.ohms} Ω`);
    }
    assert.equal(new Set(fi.RESISTORS.map((r) => r.id)).size, fi.RESISTORS.length);

    // every filling of the slots, each resistor used once at most
    const ids = [null, ...fi.RESISTORS.map((r) => r.id)];
    const k = fi.EMPTY.slots.length;
    const all = [];
    const fill = (slots) => {
      if (slots.length === k) return all.push({ slots });
      for (const id of ids) if (id === null || !slots.includes(id)) fill([...slots, id]);
    };
    fill([]);
    const V = an.ANALISI_ANSWER;
    const lifts = all.filter((cc) => fi.judgeFisica(cc, V) === "lift");
    assert.equal(lifts.length, 1, `${lifts.length} fillings lift the weight`);
    assert.ok(all.some((cc) => fi.judgeFisica(cc, V) === "smoke"), "nothing smokes");
    assert.ok(all.every((cc) => fi.current(cc, V) >= 0));
    const I = fi.current(lifts[0], V);
    assert.deepEqual(lifts[0], fi.FISICA_FILLING);
    assert.equal(fi.FISICA_ANSWER, Math.round(I));
    assert.ok(Number.isInteger(fi.FISICA_ANSWER));
    // the two nearest that do not lift sit inside the needle's tremble
    const near = all
      .filter((cc) => cc !== lifts[0] && fi.current(cc, V) > 0)
      .map((cc) => fi.current(cc, V))
      .sort((p, q) => Math.abs(p - I) - Math.abs(q - I))
      .slice(0, 2);
    for (const x of near) assert.ok(Math.abs(x - I) <= 0.15 * I, `${x.toFixed(2)} mA is out of the needle's tremble`);
    for (let t = 0; t < 60; t += 0.013) assert.ok(Math.abs(fi.jitter(I, t) - I) <= 0.15 * I + 1e-9, "the needle trembles too far");
    assert.equal(fi.judgeFisica(fi.EMPTY, V), "weak");

    const r = c.results();
    assert.equal(r.analisi, an.ANALISI_ANSWER);
    assert.equal(r.fisica, fi.FISICA_ANSWER);
    console.log(`ok — aula: analisi ${an.ANALISI_ANSWER}, fisica ${fi.FISICA_ANSWER} mA su ${all.length} montaggi`);
  } finally {
    await vite22.close();
  }
}

/* ---------------------------------------------------------- aula: logica, lft
 * The formula in the abandoned notebook, read by a parser of the test's own
 * so the notebook and `evaluate` cannot drift apart; its eight rows, which
 * are no constant and no single letter; then the half-drawn automaton, whose
 * eight faint arrows are the rows. Its shortest accepted word is the only
 * one of its length, and changes when any one row is wrong.
 */
{
  const vite23 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const lo = await vite23.ssrLoadModule("/src/lib/aula/logica.ts");
    const lf = await vite23.ssrLoadModule("/src/lib/aula/lft.ts");
    const c = await vite23.ssrLoadModule("/src/lib/aula/chain.ts");

    // ¬ binds tightest, then ∧, ∨, and → last, to the right
    const parse = (src, env) => {
      const s = src.replace(/\s+/g, "");
      let i = 0;
      const imp = () => {
        const a = or();
        if (s[i] !== "→") return a;
        i++;
        const b = imp();
        return !a || b;
      };
      const bin = (op, next) => () => {
        let a = next();
        while (s[i] === op) {
          i++;
          const b = next();
          a = op === "∧" ? a && b : a || b;
        }
        return a;
      };
      const atom = () => {
        const ch = s[i++];
        if (ch === "¬") return !atom();
        if (ch === "(") {
          const v = imp();
          assert.equal(s[i++], ")", `unclosed bracket in ${src}`);
          return v;
        }
        assert.ok(ch in env, `${ch} is not p, q or r`);
        return env[ch];
      };
      const and = bin("∧", atom);
      const or = bin("∨", and);
      const v = imp();
      assert.equal(i, s.length, `${src} does not parse to the end`);
      return v;
    };
    assert.ok(lo.FORMULA.includes("→") && lo.FORMULA.includes("¬"), "the formula has no → or no ¬");
    const row = (k) => ({ p: !!(k & 4), q: !!(k & 2), r: !!(k & 1) });
    const bitsOf = (f) => Array.from({ length: 8 }, (_, k) => f(row(k))).reduce((n, b, k) => n | (b ? 1 << k : 0), 0);
    assert.equal(bitsOf((e) => parse(lo.FORMULA, e)), lo.LOGICA_ANSWER, "the notebook's formula is not the table");
    assert.equal(bitsOf((e) => lo.evaluate(e.p, e.q, e.r)), lo.LOGICA_ANSWER, "evaluate is not the table");
    const plain = [0, 255];
    for (const v of ["p", "q", "r"]) plain.push(bitsOf((e) => e[v]), bitsOf((e) => !e[v]));
    assert.ok(!plain.includes(lo.LOGICA_ANSWER), "the table is a constant or a single letter");
    const table = Array.from({ length: 8 }, (_, k) => !!((lo.LOGICA_ANSWER >> k) & 1));
    assert.ok(lo.checkLogica(table));
    for (let k = 0; k < 8; k++) assert.ok(!lo.checkLogica(table.map((b, j) => (j === k ? !b : b))), `row ${k + 1} wrong still passes`);
    assert.ok(!lo.checkLogica(table.slice(0, 7)));

    // the automaton: deterministic whatever the table, and over its own letters
    assert.ok(lf.ALPHABET.length >= 3 && lf.ALPHABET.length <= 4);
    assert.equal(lf.OPTIONAL.length, 8);
    const every = [...lf.FIXED, ...lf.OPTIONAL];
    assert.equal(new Set(every.map((t) => `${t.from}${t.letter}`)).size, every.length, "two arrows leave a state on one letter");
    for (const t of every) {
      assert.ok(lf.ALPHABET.includes(t.letter) && lf.STATES.includes(t.from) && lf.STATES.includes(t.to), `${JSON.stringify(t)} is off the automaton`);
    }
    assert.notEqual(lf.START, lf.ACCEPT);
    assert.equal(lf.automaton(0).length, lf.FIXED.length);
    assert.equal(lf.automaton(255).length, every.length);

    const accepts = (bits, w) => {
      const tr = lf.automaton(bits);
      let s = lf.START;
      for (const a of w) {
        const t = tr.find((x) => x.from === s && x.letter === a);
        if (!t) return false;
        s = t.to;
      }
      return s === lf.ACCEPT;
    };
    const wordsOf = (n) => (n === 0 ? [""] : wordsOf(n - 1).flatMap((w) => [...lf.ALPHABET].map((a) => w + a)));
    const W = lf.LFT_ANSWER;
    assert.equal(W, lf.shortestAccepted(lo.LOGICA_ANSWER));
    assert.ok(W.length >= 5, `${W} is shorter than 5`);
    for (let n = 0; n < W.length; n++) assert.ok(!wordsOf(n).some((w) => accepts(lo.LOGICA_ANSWER, w)), `a word of ${n} letters is accepted`);
    const same = wordsOf(W.length).filter((w) => accepts(lo.LOGICA_ANSWER, w));
    assert.deepEqual(same, [W], `accepted at length ${W.length}: ${same.join(" ")}`);
    // the table matters, all of it: every arrow, none, or any one row wrong is another answer
    assert.notEqual(lf.shortestAccepted(0), W);
    assert.notEqual(lf.shortestAccepted(255), W);
    for (let k = 0; k < 8; k++) assert.notEqual(lf.shortestAccepted(lo.LOGICA_ANSWER ^ (1 << k)), W, `row ${k + 1} wrong gives the same word`);
    assert.ok(lf.checkLft(W));
    assert.ok(!lf.checkLft(W.slice(1)) && !lf.checkLft(""));

    const r = c.results();
    assert.equal(r.logica, lo.LOGICA_ANSWER);
    assert.equal(r.lft, W);
    console.log(`ok — aula: logica ${table.map(Number).join("")}, lft «${W}» su ${lf.ALPHABET.length ** W.length} parole`);
  } finally {
    await vite23.close();
  }
}

/* ---------------------------------------------------------- aula: basi di dati, ium
 * The two registers on the desk and the query the cards can make. No query
 * over one register alone comes to the one row the board asks for, whatever
 * the cards; the join of the two does, and every query that does says what
 * the board says. Then the file on the projector: of all the ways to settle
 * its conflicts, one, with the word of LFT as its message.
 */
{
  const vite24 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const bd = await vite24.ssrLoadModule("/src/lib/aula/bd.ts");
    const ium = await vite24.ssrLoadModule("/src/lib/aula/ium.ts");
    const lf = await vite24.ssrLoadModule("/src/lib/aula/lft.ts");
    const sg = await vite24.ssrLoadModule("/src/lib/sagome.ts");
    const c = await vite24.ssrLoadModule("/src/lib/aula/chain.ts");

    const names = bd.STUDENTS.map((s) => s.name);
    for (const ch of sg.CHARACTERS) assert.ok(names.includes(ch.id), `${ch.id} is not in the register`);
    assert.ok(names.includes("rotom"));
    assert.equal(new Set(names).size, names.length, "a name is in the register twice");
    const mats = bd.STUDENTS.map((s) => s.matricola);
    assert.equal(new Set(mats).size, mats.length, "two students share a matricola");
    for (const m of [...mats, ...bd.ESITI.map((e) => e.matricola)]) assert.ok(m >= 100000 && m <= 999999, `${m} has not 6 digits`);
    assert.ok(mats.includes(bd.BD_ANSWER));
    assert.ok(typeof bd.BD_TARGET === "string" && bd.BD_TARGET.length > 10);
    assert.ok(bd.TUTOR.length >= 3);

    const intended = {
      select: "studenti.matricola",
      join: true,
      on: ["studenti.matricola", "esiti.matricola"],
      where: [["esiti.esame", "=", "fisica"], ["esiti.esito", "=", "bocciato"], ["studenti.nome", "!=", "rotom"]],
    };
    assert.deepEqual(bd.runQuery(intended), [[String(bd.BD_ANSWER)]]);
    assert.ok(bd.checkBd(bd.runQuery(intended)));
    assert.ok(!bd.checkBd(bd.runQuery({ ...intended, where: intended.where.slice(0, 2) })), "Rotom does not have to be left out");
    assert.ok(!bd.checkBd(bd.runQuery({ ...intended, select: "studenti.nome" })));
    assert.ok(!bd.checkBd([]) && !bd.checkBd([[String(bd.BD_ANSWER)], [String(bd.BD_ANSWER)]]));

    // every query the cards can make, up to MAX_WHERE conditions
    const conds = bd.FIELDS.flatMap((f) => ["=", "!="].flatMap((op) => bd.VALUES.map((v) => [f, op, v])));
    const wheres = [[]];
    for (let n = 0; n < bd.MAX_WHERE; n++) {
      for (const w of wheres.filter((w) => w.length === n)) {
        const from = w.length ? conds.indexOf(w[w.length - 1]) + 1 : 0;
        for (let k = from; k < conds.length; k++) wheres.push([...w, conds[k]]);
      }
    }
    let single = 0;
    for (const select of bd.FIELDS) {
      for (const where of wheres) {
        single++;
        assert.ok(!bd.checkBd(bd.runQuery({ select, join: false, on: null, where })), `one register is enough: ${select} ${JSON.stringify(where)}`);
      }
    }
    const keyed = (w, f, op, v) => w.some((x) => x[0] === f && x[1] === op && x[2] === v);
    let joined = 0;
    for (const on of [["studenti.matricola", "esiti.matricola"], ["esiti.matricola", "studenti.matricola"], null]) {
      for (const select of bd.FIELDS) {
        for (const where of wheres) {
          if (!bd.checkBd(bd.runQuery({ select, join: true, on, where }))) continue;
          joined++;
          assert.ok(on, `a join without ON is enough: ${JSON.stringify(where)}`);
          const says =
            keyed(where, "esiti.esame", "=", "fisica") &&
            (keyed(where, "esiti.esito", "=", "bocciato") || keyed(where, "esiti.esito", "!=", "superato")) &&
            keyed(where, "studenti.nome", "!=", "rotom");
          assert.ok(says, `${JSON.stringify(where)} finds the matricola without saying what the board says`);
        }
      }
    }
    assert.ok(joined > 0);

    // the file on the projector
    assert.ok(ium.HUNKS.length >= 4);
    for (const h of ium.HUNKS) assert.notDeepEqual(h.ours, h.theirs);
    const right = ium.HUNKS.map((h) => h.right);
    assert.ok(right.includes("ours") && right.includes("theirs"), "every hunk is the same side");
    assert.ok(ium.resolve(right).includes(String(bd.BD_ANSWER)), "the file has not the matricola");
    const vectors = Array.from({ length: 2 ** ium.HUNKS.length }, (_, k) => ium.HUNKS.map((_, i) => ((k >> i) & 1 ? "theirs" : "ours")));
    const ok = vectors.filter((v) => ium.checkIum(v, lf.LFT_ANSWER));
    assert.deepEqual(ok, [right], `${ok.length} ways through the conflicts`);
    assert.equal(new Set(vectors.map((v) => ium.hash(ium.resolve(v) + "\n" + lf.LFT_ANSWER))).size, vectors.length, "two files give one hash");
    assert.ok(!ium.checkIum(right, "") && !ium.checkIum(right, lf.LFT_ANSWER.slice(1)) && !ium.checkIum(right, "fix"));
    assert.ok(!ium.checkIum(right.slice(1), lf.LFT_ANSWER));
    // FNV-1a 32-bit: "a" is e40c292c
    assert.equal(ium.hash("a"), "e40c");
    assert.match(ium.IUM_ANSWER, /^[0-9a-f]{4}$/);
    assert.equal(ium.IUM_ANSWER, ium.hash(ium.resolve(right) + "\n" + lf.LFT_ANSWER));

    const r = c.results();
    assert.equal(r.bd, bd.BD_ANSWER);
    assert.equal(r.ium, ium.IUM_ANSWER);
    console.log(`ok — aula: basi di dati ${bd.BD_ANSWER} (${single} query su un registro, ${joined} col JOIN), ium ${ium.IUM_ANSWER} su ${vectors.length} risoluzioni`);
  } finally {
    await vite24.close();
  }
}

/* ---------------------------------------------------------- aula: sistemi operativi
 * The five students at their desks. By habit they deadlock; a global order
 * for what they share can break the circle, and not every one does. Then the
 * finish order of round robin, which every input moves: the quantum, the
 * arrival from ASD's way, the queue's rule. And the prof's mood: the grade
 * drawn goes with the face of that moment.
 */
{
  const vite25 = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const so = await vite25.ssrLoadModule("/src/lib/aula/so.ts");
    const as = await vite25.ssrLoadModule("/src/lib/aula/asd.ts");
    const fi = await vite25.ssrLoadModule("/src/lib/aula/fisica.ts");
    const c = await vite25.ssrLoadModule("/src/lib/aula/chain.ts");

    assert.equal(so.PROCS.length, 5);
    const ids = so.PROCS.map((p) => p.id);
    assert.equal(new Set(ids).size, 5);
    for (const p of so.PROCS) {
      assert.ok(p.needs[0] !== p.needs[1] && p.needs.every((r) => so.RES.includes(r)), `${p.name} needs ${p.needs}`);
      assert.ok(Number.isInteger(p.burst) && p.burst > 0);
    }

    // the deadlock: habit closes a circle, some orders break it and some do not
    assert.ok(so.deadlocks(so.DEFAULT_ORDER), "the students do not deadlock by habit");
    const orders = [[]];
    for (let n = 0; n < so.RES.length; n++)
      for (const o of orders.filter((o) => o.length === n)) for (const r of so.RES) if (!o.includes(r)) orders.push([...o, r]);
    const safe = orders.filter((o) => !so.deadlocks(o));
    assert.ok(safe.length > 0, "no order breaks the deadlock");
    assert.ok(orders.some((o) => o.length === 1 && so.deadlocks(o)), "any one thing ranked first breaks it");
    // every complete order is safe, as a global order always is
    for (const o of orders.filter((o) => o.length === so.RES.length)) assert.ok(!so.deadlocks(o), `${o} deadlocks`);

    // the arrival: one student per aisle of ASD's way, in its order, and not by desk
    const arr = so.arrival(as.ASD_ANSWER);
    assert.deepEqual([...arr].sort(), [...ids].sort(), "not every student comes in by ASD's way");
    assert.equal(as.ASD_ANSWER.length - 1, 5, "ASD's way has not 5 aisles");
    assert.deepEqual(so.SO_ARRIVAL, arr);
    assert.notDeepEqual(arr, ids);
    assert.deepEqual(so.arrival([...as.ASD_ANSWER].reverse()), [...arr].reverse(), "an aisle is walked one way only");

    // the quantum, 1 to 5, from Fisica's mA by the board's rule
    assert.equal(fi.FISICA_ANSWER, 30);
    for (let mA = 0; mA <= 60; mA++) assert.ok(so.quantumFrom(mA) >= 1 && so.quantumFrom(mA) <= 5);
    assert.equal(so.SO_QUANTUM, 3);

    // round robin by hand: Anna (5) then Bruno (3), quantum 2; Bruno, come in during Anna's quantum, goes before her
    assert.deepEqual(so.schedule([1, 2], 2).map((x) => [x.id, x.from, x.to]), [[1, 0, 2], [2, 2, 4], [1, 4, 6], [2, 6, 7], [1, 7, 8]]);
    assert.deepEqual(so.roundRobin([1, 2], 2), [2, 1]);
    assert.equal(so.schedule([1, 2], 1)[1].id, 2, "the one just stopped goes before the one just come");
    const total = so.PROCS.reduce((s, p) => s + p.burst, 0);
    const sl = so.schedule(so.SO_ARRIVAL, so.SO_QUANTUM);
    assert.equal(sl[sl.length - 1].to, total, "the schedule idles or overlaps");
    for (let i = 1; i < sl.length; i++) assert.equal(sl[i].from, sl[i - 1].to);
    for (const x of sl) assert.ok(x.to - x.from <= so.SO_QUANTUM);

    // every input matters
    const A = so.SO_ANSWER.join("");
    assert.deepEqual(so.SO_ANSWER, so.roundRobin(so.arrival(as.ASD_ANSWER), so.quantumFrom(fi.FISICA_ANSWER)));
    assert.notEqual(so.roundRobin(arr, 1).join(""), A, "quantum 1 gives the same finish");
    assert.notEqual(so.roundRobin(arr, Infinity).join(""), A, "FCFS gives the same finish");
    assert.notEqual(so.roundRobin(ids, so.SO_QUANTUM).join(""), A, "arrival by desk gives the same finish");
    for (let q = 1; q <= 5; q++) if (q !== so.SO_QUANTUM) assert.notEqual(so.roundRobin(arr, q).join(""), A, `quantum ${q} gives the same finish`);

    assert.ok(so.checkSo(safe[0], so.SO_ANSWER));
    assert.ok(!so.checkSo(so.DEFAULT_ORDER, so.SO_ANSWER), "a deadlock passes");
    assert.ok(!so.checkSo(safe[0], so.SO_ANSWER.slice(1)));
    assert.ok(!so.checkSo(safe[0], so.roundRobin(arr, 1)));

    // the mood: every grade has a face, and the one drawn at t is the face shown at t
    for (let g = 18; g <= 30; g++) assert.equal(so.MOODS.filter((m) => g >= m.grades[0] && g <= m.grades[1]).length, 1, `${g} has not one face`);
    for (let k = 0; k < 40; k++) {
      const t = k * 517;
      for (const r of [0, 0.5, 0.999]) {
        const s = c.pass(c.aulaUpTo(c.ORDER.indexOf("so")), "so", so.moodRng(t, () => r));
        assert.equal(so.moodOf(s.soGrade), so.moodAt(t), `the grade at ${t} is not the face's`);
      }
    }

    assert.deepEqual(c.results().so, so.SO_ANSWER);
    console.log(`ok — aula: sistemi operativi ${A}, ${safe.length} ordini su ${orders.length} senza deadlock, quanto ${so.SO_QUANTUM}`);
  } finally {
    await vite25.close();
  }
}

/* ---------------------------------------------------------- no words, no numbers
 * The machines of the third floor say nothing in writing: shapes, colours,
 * movement and sound only. No text between their tags, no text element, no
 * HTML overlay that could carry some; and an aria-label may name the object,
 * never what it means.
 */
{
  const { readFileSync, readdirSync } = await import("node:fs");
  const dir = new URL("../src/scenes/machines/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));
  assert.ok(files.length >= 6, "the machines are not where they should be");
  for (const f of files) {
    const src = readFileSync(new URL(f, dir), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    // text sitting between a tag's end and the next tag
    const text = [...src.matchAll(/>\s*([^<>{}\n]*[A-Za-zÀ-ÿ0-9][^<>{}\n]*?)\s*<\/?[A-Za-z]/g)]
      .map((m) => m[1].trim())
      // a comparison or an arrow in plain code is not a text node
      .filter((t) => !/^[\s\w.()[\]!?:&|=+\-*/%,'"`]*(=>|&&|\|\||\?|:)/.test(t) && !/^(null|true|false)\)/.test(t));
    assert.deepEqual(text, [], `${f} writes something: ${text.join(" | ")}`);
    assert.ok(!/<Text\b|<Text3D\b|<Html\b/.test(src), `${f} has a text element or an HTML overlay`);
    assert.ok(!/aria-label/.test(src), `${f} labels something in words`);
  }
  console.log(`ok — the ${files.length} machine files write nothing`);
}

/* ---------------------------------------------------------- il flauto
 * Eight notes, one per direction; a hold of LONG_MS or more is a long note.
 * `follow` counts the notes right in a row; a wrong one starts over, and
 * counts as the first if it is one.
 */
{
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { DIRS, played, follow } = await vite.ssrLoadModule("/src/lib/flute.ts");
    const { LONG_MS } = await vite.ssrLoadModule("/src/lib/card.ts");
    assert.equal(DIRS.length, 8);
    assert.equal(played(3, LONG_MS - 1).long, false, "449 ms is a short note");
    assert.equal(played(3, LONG_MS).long, true, "450 ms is a long note");
    assert.equal(played(5, 10).note, 5);
    const tune = [played(2, 0), played(4, 1000), played(0, 0), played(7, 0)];
    let n = 0;
    for (const p of tune) n = follow(tune, n, p);
    assert.equal(n, tune.length, "the whole tune does not count through");
    assert.equal(follow(tune, 2, played(6, 0)), 0, "a wrong note in the middle does not reset");
    assert.equal(follow(tune, 2, played(2, 0)), 1, "a wrong note that is the first does not count as one");
    assert.equal(follow(tune, 1, played(4, 0)), 0, "a short note passes for the long one asked");
    assert.equal(follow(tune, 1, played(4, 0), false), 2, "length is not ignored when not strict");
    assert.equal(follow(tune, 0, played(2, 2000), false), 1);
    const { sampleFor } = await vite.ssrLoadModule("/src/lib/fluteVoice.ts");
    const files = { "../a/flute-u.wav": "U", "../a/flute-ul.ogg": "UL", "../a/flute-ur.wav": "UR" };
    assert.equal(sampleFor(files, 0), "U", "flute-u.wav is not found for up");
    assert.equal(sampleFor(files, 7), "UL", "flute-ul.ogg is not found for up-left");
    assert.equal(sampleFor({ "../a/flute-ur.wav": "UR" }, 0), undefined, "flute-ur.wav answers for up");
    console.log("ok — flauto: otto note, lunga da " + LONG_MS + " ms, follow");
  } finally {
    await vite.close();
  }
}

/* ---------------------------------------------------------- il pozzo: niente parole, crediti
 * The walls of the well say nothing in writing, like the machines; and Animal
 * Well's credit has to be in the README (it is owed whether or not the files
 * are in the project yet, and surely once any is).
 */
{
  const { readFileSync, readdirSync } = await import("node:fs");
  /** What a wall painter writes in words, if anything. Empty list = it says nothing. */
  const writes = (code) => {
    const src = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const found = [];
    if (/\b(fillText|strokeText)\b/.test(src)) found.push("canvas text");
    if (/<Text\b|<Text3D\b|<Html\b/.test(src)) found.push("text element");
    if (/\b(title|alt|placeholder|aria-[a-z]+)\s*=/.test(src)) found.push("text attribute");
    // a string or template literal sitting alone as a child: {"ciao"}, {`ciao`}
    if (/\{\s*(["'`])[^{}]*?\1\s*\}/.test(src)) found.push("string child");
    // text next to expressions: take every {…} container out (innermost first), then look between tags
    let bare = src;
    for (let prev = ""; prev !== bare; ) {
      prev = bare;
      bare = bare.replace(/\{[^{}]*\}/g, "");
    }
    for (const m of bare.matchAll(/>\s*([^<>\n]*[A-Za-zÀ-ÿ0-9][^<>\n]*?)\s*<\/?[A-Za-z]/g)) {
      const t = m[1].trim();
      // a comparison or an arrow in plain code is not a text node
      if (!/^[\s\w.()[\]!?:&|=+\-*/%,'"`]*(=>|&&|\|\||\?|:)/.test(t) && !/^(null|true|false)\)/.test(t)) found.push(`text "${t}"`);
    }
    return found;
  };
  // the guard has teeth: these must be flagged, and a plain painter must pass
  assert.ok(writes('ctx.fillText("x", 0, 0);').length, "guard misses fillText");
  assert.ok(writes("ctx.strokeText(s, 0, 0);").length, "guard misses strokeText");
  assert.ok(writes("const a = () => <b>Ciao {x}</b>;").length, "guard misses text mixed with an expression");
  assert.ok(writes("const a = () => <b>{x} ciao</b>;").length, "guard misses text after an expression");
  assert.ok(writes('const a = () => <b>{"ciao"}</b>;').length, "guard misses a string child");
  assert.ok(writes("const a = () => <b>{`ciao`}</b>;").length, "guard misses a template child");
  assert.ok(writes('const a = () => <mesh title="ciao" />;').length, "guard misses title=");
  assert.ok(writes('const a = () => <img alt="x" />;').length, "guard misses alt=");
  assert.ok(writes('const a = () => <input placeholder="x" />;').length, "guard misses placeholder=");
  assert.deepEqual(
    writes("export function paint(c: CanvasRenderingContext2D, n: number) { c.fillStyle = '#fff'; c.fillRect(0, 0, n > 1 ? 4 : 2, 4); return <mesh position={[0, 1, 0]}><boxGeometry /></mesh>; }"),
    [],
    "guard flags a plain painter",
  );

  const dir = new URL("../src/scenes/well/", import.meta.url);
  const files = readdirSync(dir).filter((f) => /^Wall.*\.tsx$/.test(f));
  assert.ok(files.length >= 4, "the walls of the well are not where they should be");
  for (const f of files) {
    assert.deepEqual(writes(readFileSync(new URL(f, dir), "utf8")), [], `${f} writes something`);
  }
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  assert.ok(
    /Billy Basso/.test(readme) && /Shared Memory/.test(readme) && /Animal Well/.test(readme) && /Bigmode/.test(readme),
    "the Animal Well credit is not in the README",
  );
  console.log(`ok — the ${files.length} walls of the well write nothing (guard proven); Animal Well is credited`);
}
