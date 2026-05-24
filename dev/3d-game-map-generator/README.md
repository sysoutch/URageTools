# 3D Map Generator

A browser-based procedural 3D blockout and layout generation toolkit powered by Three.js.

Generate stylized 3D environments, gameplay spaces, arena layouts, side-scrolling terrain, tactical maps, and rapid prototype worlds directly in the browser with real-time rendering, procedural systems, imported models, seeded generation, and export pipelines.

Built for indie developers, level designers, technical artists, gameplay prototyping, and fast experimental world building.

---

# Supported Generation Modes

## Topdown

Procedural topdown layout generation for:

* Dungeon layouts.
* Arena maps.
* Tactical prototypes.
* Roguelike generation.
* Shooter spaces.

Features:

* Symmetrical generation.
* Mirrored layouts.
* Procedural density control.
* Large-map support.
* Tile-based blockout workflows.

---

## Isometric / 2.5D

Stylized angled generation inspired by classic tactical and RPG perspectives.

Features:

* Raised terrain illusion.
* Angled camera support.
* Isometric block layouts.
* Multi-height structures.
* Tactical-style map generation.
* Stylized projection workflows.

Ideal for:

* Tactical RPGs.
* Strategy prototypes.
* Diablo-style layouts.
* Isometric adventure games.

---

## Side Scroller

Procedural terrain generation for side-view gameplay spaces.

Features:

* Platform generation.
* Gap spacing.
* Height variation.
* Traversal-focused layouts.
* Terrain blockouts.
* Gameplay flow experimentation.

Ideal for:

* Platformers.
* Metroidvanias.
* Action games.
* Sandbox terrain systems.

---

# Rendering Engine

Powered by real Three.js WebGL rendering.

Features:

* Real-time 3D rendering.
* Perspective cameras.
* Orthographic cameras.
* Dynamic lighting.
* Shadow rendering.
* Runtime camera control.
* GPU-accelerated previews.
* Interactive scene visualization.

The tool is designed to feel closer to a lightweight level blockout editor than a static generator.

---

# Procedural Generation System

A flexible procedural generation workflow designed for rapid experimentation.

Features:

* Seeded generation.
* Repeatable layouts.
* Adjustable density.
* Height variation.
* Gap control.
* Procedural mirroring.
* Tile repetition systems.
* Fast regeneration.
* Large layout support.

Generation controls include:

* Map size.
* Platform density.
* Terrain height.
* Gap spacing.
* Mirror patterns.
* Mirror repeats.
* Camera yaw.
* Camera pitch.
* Zoom.

---

# Camera & Projection System

Switch between multiple visualization styles in real time.

## Perspective Projection

Ideal for:

* Gameplay previews.
* Environmental depth.
* Cinematic prototyping.
* Modern 3D layouts.

---

## Orthographic Projection

Ideal for:

* Tactical views.
* Isometric workflows.
* Grid readability.
* Clean layout previews.

---

# 3D Model Import System

Import custom models directly into the generator.

Supported formats:

* OBJ
* GLB
* GLTF
* FBX

Features:

* Runtime model importing.
* Automatic tile normalization.
* Generated block replacement.
* Procedural prop scattering.
* Object density controls.
* Real-time scene updates.
* Hybrid procedural/manual workflows.

---

## Replace Blocks

Replace generated procedural tiles with imported custom meshes.

Useful for:

* Stylized prototypes.
* Rapid environment theming.
* Gameplay blockouts.
* Visual experimentation.

---

## Prop Scattering

Scatter imported objects across generated layouts.

Ideal for:

* Trees.
* Ruins.
* Rocks.
* Environmental props.
* Decorative structures.
* Gameplay markers.

---

# Visual Style Presets

Quickly change the visual atmosphere of generated environments.

Included presets:

* Ruins.
* Forest.
* Lava.

Useful for:

* Rapid visual iteration.
* Environment mood testing.
* Gameplay readability experiments.
* Prototype presentation.

---

# Live Generation Dashboard

A polished browser-based dashboard workflow focused on rapid iteration.

Features:

* Real-time scene updates.
* Interactive camera controls.
* Responsive editor layout.
* Fast generation workflow.
* Procedural tuning controls.
* Runtime visualization.
* Dashboard theme sync.
* Lightweight editing experience.

Designed for:

* Fast experimentation.
* Prototype iteration.
* Visual exploration.
* Gameplay blockouts.

---

# Export Pipelines

## PNG Preview Export

Export rendered scene previews directly as images.

Useful for:

* Design documentation.
* Team sharing.
* Prototype snapshots.
* Concept presentation.

---

## JSON Layout Export

Export procedural layout data for external workflows.

Useful for:

* Gameplay systems.
* Engine integration.
* Procedural pipelines.
* Runtime reconstruction.
* Hybrid editing workflows.

---

# Designed For

* Indie game development.
* Gameplay prototyping.
* Arena blockouts.
* Procedural generation experiments.
* Tactical map layouts.
* Sandbox world concepts.
* Dungeon generation.
* Rapid environment iteration.
* Technical art workflows.
* Level-design experimentation.

---

# Example Workflows

## Rapid Gameplay Blockouts

Quickly generate playable spaces for:

* Combat testing.
* Traversal testing.
* Arena balancing.
* Camera experiments.
* Movement prototyping.

---

## Procedural Environment Concepts

Generate stylized prototype worlds for:

* RPG towns.
* Dungeon layouts.
* Tactical maps.
* Sandbox terrain.
* Experimental world generation.

---

## Hybrid Manual + Procedural Pipelines

Combine imported models with procedural systems.

Useful for:

* Environment dressing.
* Prop scattering.
* Visual polish.
* Gameplay readability.
* Art-direction exploration.

---

# Technical Notes

* Fully browser-based.
* Powered by Three.js.
* WebGL accelerated.
* Runs completely client-side.
* No backend required.
* Supports imported 3D assets.
* Designed for extensibility.
* Fast iterative workflows.
* Syncs dashboard theme tokens when opened inside URage Studio.

The tool imports Three.js and its loaders through the configured import map.

When running outside the dashboard environment, the browser must have access to the configured Three.js CDN or locally vendored Three.js modules.

---

# Future Expansion Ideas

## Generation Systems

* Multi-biome generation.
* Height-map terrain.
* Noise-based terrain.
* Cave generation.
* Procedural roads.
* River systems.
* Cellular automata.
* Wave Function Collapse.

---

## Gameplay Systems

* Navigation mesh preview.
* Spawn-zone generation.
* Pathfinding overlays.
* Enemy region painting.
* Collision visualization.
* Traversal heatmaps.
* Gameplay metrics.

---

## Rendering & Visuals

* Post-processing.
* Fog systems.
* Skyboxes.
* Day/night lighting.
* Water rendering.
* Volumetric lighting.
* GPU instancing.
* Material presets.

---

## Export Pipelines

* Unity scene export.
* Godot scene export.
* Unreal export helpers.
* GLTF world export.
* Procedural metadata export.
* Chunk streaming export.

---

# Vision

The goal is to evolve the 3D Map Generator into a flexible browser-based procedural world-building and gameplay blockout platform capable of generating everything from tiny combat arenas to stylized tactical environments and large experimental sandbox layouts.

The focus is:

* Fast experimentation.
* Visual iteration.
* Lightweight accessibility.
* Flexible procedural systems.
* Real-time rendering.
* Game-development-first workflows.
* Hybrid procedural/manual pipelines.

---

# Companion Tools

Use alongside:

* `2d-map-generator` for stylized 2D procedural layouts.
* `tilemap-creator` for layered hand-authored editing workflows.

Together they form a broader procedural prototyping and level-design toolkit ecosystem.

---

# Credits

Original concept and implementation by you.

Expanded with procedural systems, rendering workflows, model importing, dashboard tooling, export pipelines, UX improvements, and multi-perspective generation support.
