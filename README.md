# Atom Sandbox

A chemistry teaching game in the same engineering-style interface as the Physics Sandbox: build atoms from
protons, neutrons and electrons, explore isotopes, ions and radioactive decay, and balance chemical
equations with the molecules drawn atom by atom. TypeScript + React + Vite, no backend.

> **Honest about its models.** Counting is exact: the element comes from the proton count, charge is
> protons − electrons, and equations are balanced with exact fractions. Nuclear stability, half-lives
> and electron configurations come from real data tables. Teaching pictures and estimates are marked
> **≈** in the UI. That covers Bohr rings, the electron "cloud", flat molecule drawings, ionic solids
> drawn as one formula unit, and liquid-drop estimates for nuclei that are not in the data table.

---

## Setup

Requirements: Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5175
npm test           # Vitest: elements, configurations, nuclides, formulas, balancing, drawings, challenges
npm run build      # type-check + production bundle in dist/
npm run preview    # serve the production bundle
```

Challenge progress is saved in the browser's `localStorage` (key `atom-sandbox.progress.v1`). It stays
on that browser and computer only. **Settings → Reset all progress** clears it. The last atom and
equation you worked on are saved too, and restored when the page reloads.

## Interface

| Area | Atom builder | Reactions |
| --- | --- | --- |
| Top toolbar | Mode switch, undo/redo, Labels / Motion / Cloud ≈ toggles, score (solved · stars · points), settings, help | Same, with a Formulas toggle |
| Left tool strip | Add proton / neutron / electron, remove tool, clear | Animate atoms, auto-balance (in a challenge: show answer), reset coefficients |
| Left sidebar | Particle counts (−/+ or type a number), isotope list for the element, challenges | Equation input, reaction library, challenges |
| Canvas | Nucleus + Bohr-style shells (or an electron-cloud impression), isotope notation, stability badge, flying particles | Reactant and product molecules drawn atom by atom; click a group to change its coefficient |
| Right sidebar | Element, nucleus (stability, half-life, decay mode, **Decay** button), electrons (charge, configuration, Bohr shells, orbital boxes), model notes | Coefficients, conservation of atoms / charge / mass, molar masses, model notes |
| Bottom panel | Clickable periodic table, chart of nuclides (N vs Z), challenge panel | Atom count per element (left vs right), challenge panel |

### Controls

| Input | Action |
| --- | --- |
| `1` / `2` | Atom builder / Reactions |
| `P` `N` `E` | Add a proton / neutron / electron (`Shift`: remove one) |
| `X` | Remove tool (click a particle on the canvas) |
| `[` / `]` | Previous / next element (neutral, most common isotope) |
| Click / right-click canvas | Atom builder: add / remove a particle of the active kind |
| Click / right-click a molecule group | Reactions: coefficient +1 / −1 (`Shift`+click also −1) |
| `A` | Reactions: animate the atoms rearranging (unbalanced atoms are flagged "vanished?" / "from nowhere?") |
| `B` | Reactions: auto-balance (inside a challenge this shows the answer and scores 0) |
| `H` | Next hint for the current challenge |
| `Ctrl/⌘+Z`, `Ctrl/⌘+Shift+Z` | Undo / redo |
| `?` | Help and model notes |

Equations accept `->`, `→`, `=` or `⇌`, Unicode sub/superscripts, brackets and hydrates
(`Ca(OH)2`, `Fe2(SO4)3`, `CuSO4·5H2O`), state symbols (`(aq)`), charges (`Fe^3+`, `SO4^2-`, `Na+`) and
electrons (`e-`). Put spaces around the `+` between ions: `Na+ + Cl-`.

## The game

36 challenges in 6 levels: building atoms, isotopes, ions, balancing, harder balancing, and ions and
charge. A checklist turns green as each goal is met. Each challenge is worth 100 points and 3 stars,
and every hint costs 25 points and a star. Showing the answer completes it with 0 points, and you can
replay it later for stars. The best result per challenge is kept.

## What is exact and what is simplified

**Exact (data or arithmetic)**

* Element identity, mass number, charge, isotope and ion names.
* Stable nuclides: all 251 nuclides with no observed decay (Z = 1–82; none for Tc and Pm).
* Half-lives and decay modes for a curated table of radioactive nuclides (rounded to 2–4 significant
  figures). It includes the known light isotopes up to oxygen, the longest-lived isotope of every element,
  and well-known ones such as ¹⁴C, ⁴⁰K, ⁶⁰Co, ¹³¹I, ¹³⁷Cs, ²³⁵U and ²³⁸U. Superheavy half-lives are based
  on a few atoms and shown with ≈.
* Ground-state configurations of neutral atoms, with the measured exceptions (Cr, Cu, Nb, Mo, Ru, Rh,
  Pd, Ag, La, Ce, Gd, Pt, Au, Ac, Th, Pa, U, Np, Cm, Lr). For Z ≥ 104 these are predictions, marked ≈.
* Equation balancing: exact rational null space of the composition matrix, including charge. The app
  explains why an equation can't be balanced (an element on one side only) or has more than one
  independent balancing.
* Molar masses from IUPAC abridged standard atomic weights, with the electron mass for ions.

**Simplified (≈ in the UI)**

* **Bohr shells** are a teaching picture. Each ring shows the electrons with one principal quantum
  number n, taken from the real configuration. Real electrons occupy orbitals, not orbits, and the
  Cloud view is only an impression of that.
* The atom is not to scale: the nucleus is ~10⁴–10⁵ times smaller than the atom. The canvas footnote
  gives the real size.
* Nuclei not in the data table are classified with the semi-empirical (liquid-drop) mass formula: whether
  they are bound, and their likely decay mode. These are estimates, and poor ones for very light nuclei.
  Light nuclei up to oxygen therefore use data only.
* Ion configurations use "remove the highest-n electrons first". This is correct for main-group ions
  and for Fe²⁺, Fe³⁺ and Cu²⁺; some heavy d/f-block ions differ.
* "Common ions" is a teaching list. Ions like O²⁻ only exist inside crystals or solutions.
* Molecules are flat "displayed formulas" with approximate angles, and one resonance structure is shown
  where several exist. Ionic solids are drawn as one formula unit and metals as one atom; the real
  substances are lattices. Formulas missing from the drawing library are drawn as a loose, labelled
  group of atoms with no invented bonds.
* A balanced equation gives the ratio of reacting substances. It says nothing about whether the reaction
  happens, how fast it is, or how much energy it releases.

## Architecture

```
src/
  chem/        Pure chemistry logic (no UI imports) — covered by tests
    elements.ts       118 elements, positions, categories, standard atomic weights, common ions, ion names
    configuration.ts  Aufbau + measured exceptions, ions, noble-gas shorthand, Bohr shells, orbital boxes
    nuclides.ts       Stable list, radioactive table, unbound resonances, liquid-drop estimates, decay products
    atom.ts           AtomState (p, n, e) → full description
    formula.ts        Formula parser (brackets, hydrates, charges, Unicode), molar mass, pretty printing
    equation.ts       Equation parser, atom/charge tallies, exact rational balancer
    reactions.ts      Reaction library (unbalanced, with known answers)
    structures.ts     2D molecule drawings + honest fallback
  game/        challenges.ts (levels, goals, hints, scoring), progress.ts (localStorage)
  state/       store.ts (zustand: document, undo/redo, challenge tracking, autosave)
  render/      atomScene.ts, reactionScene.ts (Canvas 2D), colors.ts
  ui/          React components: Toolbar, LeftPanel, RightPanel, Viewport, BottomPanel, Dialogs
tests/         atoms.test.ts, equations.test.ts
```

The visual style (`styles.css`, `ui/widgets.tsx`) is taken from the Physics Sandbox so the two apps look
and feel the same.
