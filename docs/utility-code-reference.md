# Homestead — Utility planning reference (Nova Scotia)

**These are PLANNING REFERENCES, not code compliance.** Homestead orients; it does not
certify. Confirm everything with the **Canadian Electrical Code (CEC, CSA C22.1)**, the
**National Building Code of Canada (NBC)** as adopted in Nova Scotia, the **National Plumbing
Code**, your **municipality / AHJ**, and a **licensed electrician / plumber / HVAC tech**.
Codes change and local amendments apply.

---

## Electrical (CEC C22.1)

**Service & panel**
- Residential service is typically **100 A or 200 A**. Larger loads (heat pump + EV + range +
  electric water heat) push toward 200 A. A load calculation (CEC 8-200) decides.
- Main panel with a main breaker; sub-panels for detached buildings / additions.

**General circuits & receptacles**
- 15 A circuit = 14 AWG; 20 A = 12 AWG.
- **Outlets per circuit:** CEC Rule **8-304** permits up to **12 outlets on a 15 A** general
  circuit (each receptacle/light counts as one). The **8-per-circuit** figure is the US (NEC)
  180 VA convention — conservative, and what Homestead defaults to. Either is a planning number.
- **Kitchen counters:** split-receptacle (two 15 A circuits) or dedicated **20 A T-slot**
  receptacles; no point along the counter more than ~900 mm from a receptacle; **GFCI (Class A)**
  within 1.5 m of the sink.
- **Bathrooms / outdoors / garage / unfinished basement:** **GFCI** protection.
- **AFCI** protection for most 120 V branch circuits (bedrooms and broader per CEC amendments).

**Dedicated circuits (references)**
| Appliance | Circuit |
|---|---|
| Range / stove | **40 A / 240 V** (#8) |
| Dryer | 30 A / 240 V (#10, NEMA 14-30) |
| Water heater (tank) | 30 A / 240 V |
| EV charger | 40 A / 240 V (or larger) |
| Dishwasher | dedicated 15 A |
| Microwave | dedicated 20 A |
| Furnace / heat-pump air handler | dedicated |

**Lighting & switches (NBC 9.34 / CEC)**
- A wall-switch-controlled light at each room entrance.
- Hallways and stairs are switch-controlled.
- **3-way switches** at BOTH ends of stairs, hallways, and pass-through spaces (control the light
  from either entrance). Long halls may want 4-way in the middle.

---

## Smoke & CO alarms (NBC 9.10.19)

- **Smoke alarms:** required in **every bedroom**, in the hallway serving bedrooms, and on
  **every storey including the basement**. **Interconnected** (all sound together), hard-wired
  with battery backup.
- **CO alarms:** adjacent to sleeping areas where there is a **fuel-burning appliance** (propane
  furnace/range/water heater) or an **attached/built-in garage**.

---

## Plumbing — water supply

- **Main shutoff** at the entry; individual **fixture shutoffs**.
- **Water heater:** electric tank is common; consider a **heat-pump water heater** (efficient) or
  on-demand. T&P relief valve + drain pan required.
- **Distribution:** PEX is common; size by fixture units; **frost-free hose bibs** outside (NS
  winters). Target pressure ~40–80 psi; add a PRV if the supply is high.
- **Rural:** drilled **well** + pressure tank + pump; test potability (bacteria, arsenic, uranium
  are regional concerns in NS bedrock).

---

## Drain / waste / vent (DWV)

- Every fixture is **trapped and vented**; vents run to a stack through the roof.
- Horizontal drains slope ~**1/4" per foot** (2%).
- **Cleanouts** at the base of stacks and major direction changes.
- **Rural:** **septic tank + disposal field**, sized by number of bedrooms; **setbacks** — well
  ≥ ~15 m, plus distances from property lines, foundations, and watercourses (confirm with NS
  Environment / installer).

---

## HVAC — heat pump first (your preference)

- A **cold-climate air-source heat pump (ccASHP)** is the recommended NS path: efficient heat +
  cooling in one. **Ductless mini-split** heads per zone, or a **ducted central** heat pump.
- **Size it properly** with a CSA **F280** (≈ Manual J) load calc — do NOT oversize.
- **Backup / auxiliary heat** for deep cold (electric resistance, or keep existing) — heat pumps
  lose capacity at low temps even if they still run.
- **Ventilation (NBC 9.32):** tight homes need mechanical ventilation — an **HRV/ERV** is
  recommended, plus bath and kitchen exhaust.
- Registers + return-air paths per room; keep returns unblocked.

Baseboard electric heat is simple/cheap to install but expensive to run — the heat pump is the
better long-term call, exactly as you said.

---

## Propane / gas

- Most of NS has **no piped natural gas** → **propane**. Tank **setbacks** from the building,
  property lines, and ignition sources; a **regulator**; a **sediment trap / drip leg** at each
  appliance; approved connectors; and a **leak test**.
- Pair any fuel-burning appliance with a **CO alarm** (see above).

---

## What Homestead checks today (planning-level)

In the Utilities panel (Electrical system) Homestead flags, as references only:
- receptacles over your per-circuit limit (default 8; CEC allows 12),
- missing smoke alarms per bedroom / per storey (+ interconnect note),
- hallways without a switch (+ 3-way reminder),
- an electric range without a 40 A range plug,
- a fuel-burning appliance without a CO alarm.

Place the matching fixtures from the Electrical palette: switch, 3-way switch, GFCI outlet,
range plug (40 A/240 V), dryer plug, smoke alarm, CO alarm, sub-panel.
