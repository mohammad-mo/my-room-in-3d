import steamFragmentSource from './coffee-steam/fragment.glsl?raw'
import steamVertexSource from './coffee-steam/vertex.glsl?raw'
import panelFragmentShader from './panel/fragment.glsl?raw'
import panelVertexShader from './panel/vertex.glsl?raw'
import perlinSource from './partials/perlin2d.glsl?raw'

const perlin2d = perlinSource.replace('#pragma glslify: export(perlin2d)', '')

const addPerlin = (shader: string) =>
  shader.replace(
    /#pragma glslify: perlin2d = require\('\.\.\/partials\/perlin2d\.glsl'\)/,
    perlin2d,
  )

const coffeeSteamVertexShader = addPerlin(steamVertexSource)
const coffeeSteamFragmentShader = addPerlin(steamFragmentSource)

export {
  coffeeSteamFragmentShader,
  coffeeSteamVertexShader,
  panelFragmentShader,
  panelVertexShader,
}
