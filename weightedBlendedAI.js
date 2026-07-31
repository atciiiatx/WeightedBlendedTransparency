("use strict");
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";

const torusCount = 8;
const boxCount = 5;
const sphereCount = 8;
const barCount = sphereCount;
const boxX = 1.2;
const boxMaxY = 5;
const boxMinY = 2;
const boxZ = 1.2;
const torusCircleRadius = 1.8;
const boxCircleRadius = 4.5;
const sphereCircleRadius = 3.5;
const barCircleRadius = 3.7;
const barRadius = 0.2;
const barLength = 10;
const barSegments = 32;
const torusRadius = 1;
const torusTube = 0.2;
const sphereRadius = 0.5;
const sphereSegments = 32;
const roomSurfaceSize = 10;
const cssColors = [
  "red",
  "green",
  "dodgerblue",
  "gold",
  "magenta",
  "chartreuse",
  "cornflowerblue",
  "coral",
  "forestgreen",
  "plum",
];
const barColors = [
  "brown",
  "darkGreen",
  "darkmagenta",
  "darkred",
  "darkslategray",
  "indigo",
  "sienna",
  "seagreen",
  "rebeccapurple",
];

export class WeightedBlendedAIExperiment {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.fov = 75;
    this.cameraPosition = new THREE.Vector3(0, 0, 5);
    this.rendererParams = { antialias: true, preserveDrawingBuffer: true };
    this.backgroundColor = new THREE.Color(0x0044cc);
    this.torusMaterials = [];
    this.boxMaterials = [];
    this.sphereMaterials = [];
    this.roomMaterials = [];
    this.barMaterials = [];
    // WBOIT resources (in-file implementation)
    this.accumTarget = null;
    this.compositeScene = null;
    this.compositeCamera = null;
    this.compositeMaterial = null;
    this.opacity = 1.0;
  }

  createAll() {
    this.initWebGL();
    this.createLights();
    this.createMaterials();
    this.createGeometry();
    this.addListeners();
    this.createTimer();
  }

  initWebGL() {
    // Create the scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.backgroundColor);

    // Create the camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(this.fov, aspect, 0.1, 1000);
    this.camera.name = "PerspectiveCamera";
    this.camera.position.copy(this.cameraPosition);
    this.scene.add(this.camera);

    // Create the renderer
    this.renderer = new THREE.WebGLRenderer(this.rendererParams);
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Create an orbit camera control
    const orbitControl = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    orbitControl.enableZoom = true;

    // Create accumulation render target for weighted blended OIT
    const rtParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: true,
    };
    this.accumTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      rtParams,
    );

    // Fullscreen composite scene (composites accum into background)
    this.compositeScene = new THREE.Scene();
    this.compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        accumTexture: { value: this.accumTarget.texture },
        bgColor: { value: this.backgroundColor.clone() },
        eps: { value: 1e-5 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D accumTexture;
        uniform vec3 bgColor;
        uniform float eps;
        void main(){
          vec4 acc = texture2D(accumTexture, vUv);
          float a = acc.a;
          vec3 color = acc.rgb / max(a, eps);
          vec3 outColor = color + bgColor * (1.0 - clamp(a, 0.0, 1.0));
          gl_FragColor = vec4(outColor, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(quadGeo, this.compositeMaterial);
    this.compositeScene.add(quad);
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.accumTarget) {
      this.accumTarget.setSize(window.innerWidth, window.innerHeight);
      if (
        this.compositeMaterial &&
        this.compositeMaterial.uniforms &&
        this.compositeMaterial.uniforms.accumTexture
      ) {
        this.compositeMaterial.uniforms.accumTexture.value =
          this.accumTarget.texture;
      }
    }
  }

  createLights() {
    const white = new THREE.Color(1, 1, 1);
    const dirLightIntensity = 1.2;
    const pointLightIntensity = 0.7;
    const ambientLightIntensity = 0.2;

    const lightRoot = new THREE.Object3D();
    lightRoot.name = "cameraLightRoot";

    const dirLight = new THREE.DirectionalLight(white, dirLightIntensity);
    dirLight.name = "dirLight";
    dirLight.position.set(10, 50, 20);
    lightRoot.add(dirLight);

    const pointLight = new THREE.PointLight(white, pointLightIntensity);
    pointLight.name = "pointLight";
    pointLight.position.set(2, 2, 2);
    lightRoot.add(pointLight);

    const ambientLight = new THREE.AmbientLight(white, ambientLightIntensity);
    lightRoot.add(ambientLight);

    this.scene.add(lightRoot);
  }

  createMaterials() {
    this.torusMaterials = this.createMaterialPool(
      "torusMaterial",
      cssColors,
      cssColors.length,
      true,
    );
    this.boxMaterials = this.createMaterialPool(
      "boxMaterial",
      cssColors,
      cssColors.length,
      true,
    );

    const sphereMaterial = this.createSphereMaterial();
    this.sphereMaterials = Array.from(
      { length: cssColors.length },
      () => sphereMaterial,
    );

    this.barMaterials = this.createMaterialPool(
      "barMaterial",
      barColors,
      barColors.length,
      false,
    );

    this.roomMaterials = [this.createRoomMaterial()];

    this.setMaterialOpacity(this.opacity);
  }

  recreateMaterials() {
    const toDelete = [];
    for (const materialList of [
      this.torusMaterials,
      this.boxMaterials,
      this.sphereMaterials,
      this.barMaterials,
      this.roomMaterials,
    ]) {
      // Gather current materials for later deletion
      while (materialList.length > 0) {
        const material = materialList.pop();
        toDelete.push(material);
      }
    }

    // Generate new materials and assign them to objects
    this.createMaterials();
    this.assignMaterialsToObjects();

    // Delete obsolete materials
    for (let i = toDelete.length - 1; i >= 0; i--) {
      const material = toDelete[i];
      if (material) {
        material.dispose();
      }
    }
  }

  createMaterialPool(prefix, colors, count, transparent = true) {
    return Array.from({ length: count }, (_, index) =>
      this.createPaletteMaterial(index, prefix, colors, transparent),
    );
  }

  createRoomMaterial() {
    const material = this.createPaletteMaterial(
      0,
      "roomMaterial",
      ["dodgerblue"],
      false,
    );
    return material;
  }

  createPaletteMaterial(i, prefix, colors, transparent = true) {
    const index = i % colors.length;
    const rgbColor = new THREE.Color(colors[index]);
    const params = {
      name: prefix + index,
      color: rgbColor,
      shininess: 32,
      opacity: 1,
      transparent: transparent,
      side: THREE.DoubleSide,
    };
    return this.createMaterial(params);
  }

  createMaterial(params) {
    // Create a simple accumulation ShaderMaterial that outputs premultiplied color
    const color =
      params.color instanceof THREE.Color
        ? params.color
        : new THREE.Color(params.color);
    const opacity = params.opacity !== undefined ? params.opacity : 1.0;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color.clone() },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        void main(){
          vec3 premul = uColor * uOpacity;
          gl_FragColor = vec4(premul, uOpacity);
        }
      `,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    });
    return mat;
  }

  createSphereMaterial() {
    const customUniforms = {
      opacity: { value: 1.0 },
    };
    const vertexShader = `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    // For accumulation pass we output premultiplied color using a fixed color
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 1.0 },
        uColor: { value: new THREE.Color("darkgray") },
      },
      vertexShader: vertexShader,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        void main() {
          vec3 premul = uColor * uOpacity;
          gl_FragColor = vec4(premul, uOpacity);
        }
      `,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    });
    material.name = "sphereMaterial";
    return material;
  }

  createGeometry() {
    const geometryRoot = new THREE.Object3D();
    geometryRoot.name = "geometryRoot";

    geometryRoot.add(this.createWalls());

    const torusRotationStep = (2 * Math.PI) / torusCount;
    geometryRoot.add(
      ...this.createCircularObjects(
        torusCount,
        torusRotationStep,
        0,
        (i, rotationAngle) => this.createTorus(i, rotationAngle),
      ),
    );

    const boxRotationStep = (2 * Math.PI) / boxCount;
    geometryRoot.add(
      ...this.createCircularObjects(
        boxCount,
        boxRotationStep,
        boxRotationStep / 2,
        (i, rotationAngle) => this.createBox(i, rotationAngle),
      ),
    );

    const sphereRotationStep = (2 * Math.PI) / sphereCount;
    geometryRoot.add(
      ...this.createCircularObjects(
        sphereCount,
        sphereRotationStep,
        sphereRotationStep / 2,
        (i, rotationAngle) => this.createSphere(i, rotationAngle),
      ),
    );

    const barRotationStep = (2 * Math.PI) / barCount;
    geometryRoot.add(
      ...this.createCircularObjects(
        barCount,
        barRotationStep,
        barRotationStep / 4,
        (i, rotationAngle) => this.createBar(i, rotationAngle),
      ),
    );

    this.scene.add(geometryRoot);
  }

  createCircularObjects(count, step, startAngle, factory) {
    const objects = [];
    for (
      let i = 0, rotationAngle = startAngle;
      i < count;
      i++, rotationAngle += step
    ) {
      objects.push(factory(i, rotationAngle));
    }
    return objects;
  }

  assignMaterialsToObjects() {
    const geometryRoot = this.scene.getObjectByName("geometryRoot");
    if (!geometryRoot) {
      return;
    }

    const materialAssignments = [
      { prefix: "bar", materials: this.boxMaterials },
      { prefix: "box", materials: this.boxMaterials },
      { prefix: "sphere", materials: this.sphereMaterials },
      { prefix: "torus", materials: this.torusMaterials },
    ];

    for (const child of geometryRoot.children) {
      const assignment = materialAssignments.find(({ prefix }) =>
        child.name.startsWith(prefix),
      );

      if (assignment) {
        const index = parseInt(child.name.slice(assignment.prefix.length), 10);
        if (!Number.isNaN(index)) {
          child.material = assignment.materials[index];
        }
      } else if (child.name.startsWith("wall")) {
        child.material = this.roomMaterials[0];
      }
    }
  }

  createWalls() {
    const boxGeometry = new THREE.BoxGeometry(
      roomSurfaceSize,
      roomSurfaceSize,
      roomSurfaceSize,
    );
    const wallMaterial = this.roomMaterials[0];
    const wall = new THREE.Mesh(boxGeometry, wallMaterial);
    wall.name = "wall";
    return wall;
  }

  createMesh(geometry, material, name, transform) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    if (transform) {
      mesh.applyMatrix4(transform);
    }
    return mesh;
  }

  createTorus(i, rotationAngle) {
    const torusGeometry = new THREE.TorusGeometry(torusRadius, torusTube);
    const transform = new THREE.Matrix4().makeTranslation(
      Math.cos(rotationAngle) * torusCircleRadius,
      Math.sin(rotationAngle) * torusCircleRadius,
      0,
    );
    const rotationMatrix = new THREE.Matrix4().makeRotationY(rotationAngle);
    transform.multiply(rotationMatrix);
    return this.createMesh(
      torusGeometry,
      this.torusMaterials[i],
      `torus${i}`,
      transform,
    );
  }

  createBox(i, rotationAngle) {
    const boxHeight =
      boxMinY + Math.abs(Math.sin(rotationAngle)) * (boxMaxY - boxMinY);
    const boxGeometry = new THREE.BoxGeometry(boxX, boxHeight, boxZ);
    const transform = new THREE.Matrix4().makeTranslation(
      Math.cos(rotationAngle) * boxCircleRadius,
      -(roomSurfaceSize / 2) + boxHeight / 2,
      Math.sin(rotationAngle) * boxCircleRadius,
    );
    return this.createMesh(
      boxGeometry,
      this.boxMaterials[i],
      `box${i}`,
      transform,
    );
  }

  createSphere(i, rotationAngle) {
    const sphereGeometry = new THREE.SphereGeometry(
      sphereRadius,
      sphereSegments,
      sphereSegments,
    );
    const sphereMaterial =
      this.sphereMaterials[i % this.sphereMaterials.length];
    const transform = new THREE.Matrix4().makeTranslation(
      Math.cos(rotationAngle) * sphereCircleRadius,
      Math.cos(rotationAngle * 2) * sphereRadius,
      Math.sin(rotationAngle) * sphereCircleRadius,
    );
    return this.createMesh(
      sphereGeometry,
      sphereMaterial,
      `sphere${i}`,
      transform,
    );
  }

  createBar(i, rotationAngle) {
    const barGeometry = new THREE.CylinderGeometry(
      barRadius,
      barRadius,
      barLength,
      barSegments,
    );
    const barMaterial = this.barMaterials[i % this.barMaterials.length];
    const transform = new THREE.Matrix4().makeTranslation(
      Math.cos(rotationAngle) * barCircleRadius,
      0,
      Math.sin(rotationAngle) * barCircleRadius,
    );
    return this.createMesh(barGeometry, barMaterial, `bar${i}`, transform);
  }

  start() {
    this.createAll();
    this.animate();
  }

  render() {
    // Accumulation pass: render scene into accumulation target with additive blending
    if (!this.accumTarget) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Clear accumulation target
    const prevRenderTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.accumTarget);
    this.renderer.clearColor();
    this.renderer.clear(true, true, true);

    // Render the scene; materials are set up to output premultiplied color
    this.renderer.render(this.scene, this.camera);

    // Composite pass: draw fullscreen quad sampling the accumulation target
    this.renderer.setRenderTarget(null);
    if (
      this.compositeMaterial &&
      this.compositeMaterial.uniforms &&
      this.compositeMaterial.uniforms.accumTexture
    ) {
      this.compositeMaterial.uniforms.accumTexture.value =
        this.accumTarget.texture;
    }
    this.renderer.render(this.compositeScene, this.compositeCamera);

    // restore previous render target
    this.renderer.setRenderTarget(prevRenderTarget);
  }

  addListeners() {
    window.addEventListener("resize", this.onResize.bind(this));
    const opacitySlider = document.querySelector("#opacityRange");
    if (opacitySlider) {
      opacitySlider.addEventListener("input", (event) => {
        this.setOpacity(event.target.value);
      });
    }
  }

  createTimer() {
    javascript: (function () {
      var script = document.createElement("script");
      script.onload = function () {
        var stats = new Stats();
        document.body.appendChild(stats.dom);
        requestAnimationFrame(function loop() {
          stats.update();
          requestAnimationFrame(loop);
        });
      };
      script.src = "https://mrdoob.github.io/stats.js/build/stats.min.js";
      document.head.appendChild(script);
    })();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.render();
  }

  setOpacity(value) {
    this.opacity = parseFloat(value);
    // does not work well with opacity near 1
    if (this.opacity > 0.95) {
      this.opacity = 0.95;
    }
    const element = document.getElementById("opacityLabel");
    if (element) {
      element.textContent = `Opacity (${Math.round(this.opacity * 100)}%)`;
    }
    this.setMaterialOpacity(this.opacity);
  }

  setMaterialOpacity(opacity) {
    for (const materialList of [
      this.boxMaterials,
      this.torusMaterials,
      this.sphereMaterials,
    ]) {
      for (const material of materialList) {
        if ("opacity" in material) {
          material.opacity = opacity;
        }
        if ("transparent" in material) {
          material.transparent = opacity < 1.0;
        }
        if ("uniforms" in material) {
          const uniforms = material.uniforms;
          if (uniforms) {
            if ("opacity" in uniforms) uniforms.opacity.value = opacity;
            if ("uOpacity" in uniforms) uniforms.uOpacity.value = opacity;
          }
        }
      }
    }
  }
}

const experiment = new WeightedBlendedAIExperiment();
experiment.start();
