# My Room in 3D — React Three Fiber edition

An interactive 3D portfolio room built with React, React Three Fiber, Drei, Three.js, Tailwind CSS, and Vite. This is a component-based rewrite of the original imperative Three.js/Webpack project.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

Create a production build with:

```bash
npm run build
npm run preview
```

## Project map

```text
src/
  App.tsx                       page UI, loader, and audio state
  components/
    experience.tsx              Canvas, camera, controls, and mirror
    room.tsx                    GLB, baked materials, shaders, animations
    hotspots.tsx                3D-anchored UI and camera focus requests
    controls-guide.tsx           mouse/touch navigation coaching
    audio-controls.tsx           ambient soundtrack control
  shaders/                      panel and coffee-steam shaders
  styles.css                    Tailwind CSS import only
public/
  room.glb                      Blender export
  bakedTexture*.jpg             baked scene textures
  draco/                        GLB decoder files
  sound/                        ambient and interaction audio
```

## How the migration works

- `Canvas` owns the renderer, scene, and camera lifecycle.
- `useGLTF` and `useTexture` load and cache the existing room assets.
- `useFrame` updates shader time uniforms and the keyboard animation.
- `useAnimations` plays the animation clips embedded in `room.glb`.
- Drei `Html` hotspots use room-only raycast occlusion, so walls hide markers reliably.
- A camera director follows curved paths to fixed front-facing hotspot views. Because the
  contact post is physically outside the back wall, that hotspot cuts directly to its
  unobstructed outer-side camera pose instead of orbiting through the wall.
- Device-aware control hints explain orbit, tilt, zoom, and pan gestures.
- The loader waits for assets, model setup, and multiple rendered frames before revealing the scene.
- Every interface style is expressed with Tailwind utilities in the TSX components;
  there are no project-specific CSS class selectors.
- Native CSS cursors provide grab, grabbing, and pointer feedback without JavaScript.
- `OrbitControls` and Three.js `Reflector` replace manual renderer setup.

## Change the content

- Edit the title and intro in `src/App.tsx`.
- Edit hotspot text, links, positions, icons, or camera waypoints in
  `src/components/hotspots.tsx`.
- Edit the camera and controls in `src/components/experience.tsx`.
- When the Blender model changes, replace `public/room.glb`. Keep mesh names stable or
  update the material assignment table in `src/components/room.tsx`.

## Code quality

The app uses TypeScript throughout and Biome for formatting and linting. Run both the Biome
check and the TypeScript compiler with:

```bash
npm run check
```

The original baked asset workflow is preserved, so the new app should look like the original without adding expensive real-time lighting.
