# Atom Sandbox

A chemistry teaching game in the same engineering-style interface as the Physics Sandbox. You can build
atoms from protons, neutrons and electrons, and explore isotopes, ions and radioactive decay. You can
balance chemical equations with the molecules drawn atom by atom, and see how ionic, covalent and
metallic bonds form. Random practice challenges come at three difficulty levels. TypeScript + React +
Vite, no backend.

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
npm test           # Vitest: elements, configurations, nuclides, formulas, balancing, drawings, bonding, challenges, generator
npm run build      # type-check + production bundle in dist/
npm run preview    # serve the production bundle
```

### Play online

The game is published on GitHub Pages: **https://claudesplan.github.io/atom-sandbox/**

To publish your latest version, run `npm run deploy`. It runs the tests, builds the app and pushes the
build to the `gh-pages` branch. GitHub serves that branch; one-time setup is **Settings → Pages →
Source: Deploy from a branch → `gh-pages` / `(root)`** on a public repository. The site updates a
minute or two after each deploy.

Challenge progress is saved in the browser's `localStorage` (key `atom-sandbox.progress.v1`). It stays
on that browser and computer only. **Settings → Reset all progress** clears it. The last atom and
equation you worked on are saved too, and restored when the page reloads.

## Interface

| Area | Atom builder | Reactions | Bonds |
| --- | --- | --- | --- |
| Top toolbar | Mode switch, undo/redo, Labels / Motion / Cloud ≈, score, settings, help | Same, with Formulas and **Bond types** toggles | Same, with **EN colours** (periodic table by electronegativity) |
| Left tool strip | Add proton / neutron / electron, remove tool, clear | Animate atoms, auto-balance (in a challenge: show answer), reset coefficients | Replay animation, swap the two elements |
| Left sidebar | Particle counts, isotope list, **Practice**, challenges | Equation input, reaction library, **Practice**, challenges | Element A and B, example pairs, **Practice**, challenges |
| Canvas | Nucleus + Bohr-style shells (or an electron-cloud impression), isotope notation, stability badge, flying particles | Molecules drawn atom by atom; click a group to change its coefficient; optional bond-type colours with δ+/δ− | Dot-and-cross diagram (covalent), animated electron transfer (ionic), electron sea (metallic), giant-structure sketch |
| Right sidebar | Element, nucleus (stability, half-life, decay, **Decay** button), electrons (configuration, shells, orbital boxes) | Coefficients, conservation, **bonds in these substances**, **energy from bond enthalpies ≈**, molar masses | Bond type and explanation, electronegativity and ΔEN scale, the bond or the ions, typical properties |
| Bottom panel | Periodic table, chart of nuclides, challenge panel | Atom count per element, challenge panel | Periodic table (click: set A / selected slot, right-click: set B), challenge panel |

### Controls

| Input | Action |
| --- | --- |
| `1` / `2` / `3` | Atom builder / Reactions / Bonds |
| `G` | New random practice challenge |
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

### Levels

36 challenges in 6 levels: building atoms, isotopes, ions, balancing, harder balancing, and ions and
charge. A checklist turns green as each goal is met. Each challenge is worth 100 points and 3 stars,
and every hint costs 25 points and a star. Showing the answer completes it with 0 points, and you can
replay it later for stars. The best result per challenge is kept.

### Random practice

The **Practice** section, in every mode, generates new challenges from a difficulty (Easy / Medium /
Hard) and a type (Mixed, Atoms, Equations or Bonds):

| | Atoms | Equations | Bonds quiz |
| --- | --- | --- | --- |
| Easy | Neutral atoms of elements 1–20 | Metal + halogen / oxygen, hydrogen halides (coefficients ≤ 4) | Ionic, covalent or metallic? |
| Medium | Isotopes, common ions, "the element in period P, group G" | Small alkanes and alcohols burning, metals + acid or water (coefficients ≤ 9) | Ionic / polar / non-polar / metallic; formulas of ionic compounds |
| Hard | Atom from its configuration, ions with a noble-gas arrangement, isotopes with a given decay mode, transition-metal ions | Larger alkanes and alcohols, precipitation with ions, metal displacement (redox, charges must balance) | Which atom is δ−, number of shared pairs, ionic formulas |

Easy is worth 50 points, Medium 100 and Hard 150, minus a quarter for each hint or wrong answer. The
app tracks a streak, which showing the answer resets. Every practice challenge has a code (e.g.
`MQ-4821`); typing it in the Practice box recreates exactly the same challenge, so a teacher can give a
whole class the same one. Tests generate 450 challenges of each type and check that every one can be
solved, needs real work, and (for equations) can be drawn.

### Bonds

Pick any two elements. The Bonds view shows the classroom bond type, electronegativity values and ΔEN
on a scale, and how the bond forms:

* **Covalent:** dot-and-cross diagram with shared pairs (single, double or triple) and lone pairs. The
  formula comes from the octet rule (H₂O, NH₃, CH₄, CO₂, N₂, HCl…), with δ+/δ− for polar bonds.
* **Ionic:** electrons move from the metal to the non-metal, ending in bracketed ions with full shells.
  The formula comes from the ion charges (NaCl, MgCl₂, Al₂O₃, Ca₃N₂…).
* **Metallic:** positive ions in a moving sea of delocalised electrons, including alloys.
* Giant covalent structures (diamond, SiO₂), noble gases and "too complicated for this model" pairs are
  labelled as such rather than drawn wrongly.

In Reactions, **Bond types** colours every bond and labels partial charges. The right panel lists each
kind of bond with its average bond enthalpy and estimates ΔH from bonds broken minus bonds made. For
2H₂ + O₂ → 2H₂O, CH₄ combustion and the Haber process this lands within a few % of measured gas-phase
values, which the tests check. Ionic solids, metals and ions are excluded, with a reason (they need
lattice or hydration energies).

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
  happens or how fast it is.
* Bond types use the classroom rule (metal + non-metal → ionic, non-metal + non-metal → covalent, polar
  if ΔEN ≥ 0.4; metals → metallic). Real bonds lie on a continuum, and the app warns where the rule is
  shaky (e.g. AlCl₃, ZnCl₂, HF).
* Dot-and-cross diagrams show outer shells only and no 3D shape. Simple formulas use the octet rule,
  which many real compounds break (SF₆, PCl₅, NO, …).
* Energy changes come from average bond enthalpies for gases. They are estimates, typically within a few
  %, and worse when liquids or solids are involved.
* Pauling electronegativities and typical-property tables are rounded data and teaching generalisations.

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
    structures.ts     2D molecule drawings, generators (alkanes, alcohols, salts, hydroxides, simple molecules) + honest fallback
    bonding.ts        Electronegativity, bond classification, pair compounds, bond enthalpies, ΔH estimate
  game/        challenges.ts (levels, goals, hints, scoring), generator.ts (seeded random practice),
               progress.ts (localStorage, incl. practice stats)
  state/       store.ts (zustand: document, undo/redo, challenge tracking, autosave)
  render/      atomScene.ts, reactionScene.ts, bondScene.ts (Canvas 2D), colors.ts
  ui/          React components: Toolbar, LeftPanel, RightPanel, BondPanels, Viewport, BottomPanel, Dialogs
tests/         atoms.test.ts, equations.test.ts, bonding.test.ts, generator.test.ts
```

The visual style (`styles.css`, `ui/widgets.tsx`) is taken from the Physics Sandbox so the two apps look
and feel the same.
