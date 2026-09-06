# 🐍 Snake 3D Ultra - Next-Gen WebGL

Un juego de la serpiente (Snake) en 3D con gráficos de alta fidelidad basado en **Three.js**, post-procesamiento cinemático de resplandor neón (**UnrealBloomPass**), iluminación PBR en tiempo real, efectos de partículas y música synthwave sintetizada proceduralmente con **Web Audio API**.

---

## 🌟 Características

- **Motor Gráfico Avanzado**:
  - Resplandor Neón (`UnrealBloomPass`) con tone mapping (`ACESFilmicToneMapping`).
  - Iluminación en tiempo real con sombras suaves (`PCFSoftShadowMap`).
  - Suelo reflectivo con cuadrícula cuántica animada y paredes láser perimetrales.
  - Sacudida de cámara dinámica (*Screen Shake*) en colisiones y comidas.

- **Serpiente Mecha Articulada**:
  - Cabeza con diseño aerodinámico, ojos láser, lengua bífida holográfica y luz frontal dinámica.
  - Segmentos con anillos de energía y gradiente de color.
  - Ondulación lateral biomecánica con interpolación suave (`lerp`).
  - **Input Queue (Buffer)** de 2 movimientos para giros ultra fluidos en esquinas.

- **Alimentos y Coleccionables**:
  - *Orbe de Plasma Neón*: Núcleo icosaédrico con anillos orbitales y levitación fluida.
  - *Manzana Mítica Dorada*: Satélites en órbita y puntuación triple.
  - *Cristal de Hipervelocidad*: Ráfaga de velocidad y multiplicadores de combo.
  - *Orbe de Fase Cuántica*: Modo fantasma para atravesar paredes y tu propio cuerpo.

- **Audio Procedural (Web Audio API)**:
  - Música synthwave generada en tiempo real (bajo rítmico, arpegios y batería electrónica).
  - Efectos de sonido sintetizados sin necesidad de descargar archivos externos.

- **3 Modos de Cámara (<kbd>C</kbd>)**:
  - 📹 **Isométrica 3D** (Vista predeterminada y recomendada).
  - 📹 **3ra Persona Cinemática** (Cámara de persecución con giros relativos con A/D).
  - 📹 **Neo-Arcade Cenital** (Vista clásica superior con profundidad 3D).

- **3 Temas Visuales (<kbd>T</kbd>)**:
  - 🎨 *Cyberpunk Synthwave* (Cian y magenta neón).
  - 🎨 *Bioluminiscente* (Verde esmeralda y violeta).
  - 🎨 *Furia Solar* (Oro fundido y fuego carmesí).

---

## 🕹️ Controles

| Modo de Cámara | <kbd>W</kbd> / <kbd>▲</kbd> | <kbd>S</kbd> / <kbd>▼</kbd> | <kbd>A</kbd> / <kbd>◀</kbd> | <kbd>D</kbd> / <kbd>▶</kbd> |
| :--- | :--- | :--- | :--- | :--- |
| **Isométrica 3D** | Arriba | Abajo | Izquierda | Derecha |
| **Neo-Arcade Cenital** | Arriba | Abajo | Izquierda | Derecha |
| **3ra Persona** | Avanzar | — | Girar 90° Izq | Girar 90° Der |

- **Pausa / Reiniciar**: <kbd>Espacio</kbd>
- **Dispositivos Táctiles**: D-Pad virtual o gestos de deslizamiento (*Swipe*) en pantalla.

---

## 🚀 Cómo Jugar

Simplemente abre el archivo `index.html` en cualquier navegador moderno o ejecuta `JUGAR.bat`. No requiere ninguna instalación ni servidor local.

