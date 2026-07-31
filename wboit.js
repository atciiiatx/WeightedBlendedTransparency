("use strict");
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { MeshWboitMaterial, WboitPass, WboitUtils } from "three-wboit";

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

export class WboitExperiment {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.orbitControl = null;
    this.fov = 75;
    this.cameraPosition = new THREE.Vector3(0, 0, 0);
    this.rendererParams = { antialias: true };
    this.backgroundColor = new THREE.Color(0x0044cc);
    this.cameraPosition = new THREE.Vector3(0, 0, 5);
    this.rendererParams = { preserveDrawingBuffer: true };
    this.torusMaterials = [];
    this.boxMaterials = [];
    this.sphereMaterials = [];
    this.roomMaterials = [];
    this.barMaterials = [];
    this.wboitPass = null;
    this.useWboitMaterial = false;
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
    this.orbitControl = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    this.orbitControl.enableZoom = true;
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getSize() {
    const size = new THREE.Vector3();
    size.set(
      window.innerWidth,
      window.innerHeight,
      window.innerWidth / window.innerHeight,
    );
    return size;
  }

  createLights() {
    const white = new THREE.Color(1, 1, 1);
    const dirLightColor = white;
    const pointLightColor = white;
    const ambientLightColor = white;

    const dirLightIntensity = 1.2;
    const pointLightIntensity = 0.7;
    const ambientLightIntensity = 0.2;

    const lightRoot = new THREE.Object3D();
    lightRoot.name = "cameraLightRoot";

    const dirLight = new THREE.DirectionalLight(
      dirLightColor,
      dirLightIntensity,
    );
    dirLight.name = "dirLight";
    dirLight.position.set(10, 50, 20);
    lightRoot.add(dirLight);

    const pointLight = new THREE.PointLight(
      pointLightColor,
      pointLightIntensity,
    );
    pointLight.name = "pointLight";
    pointLight.position.set(2, 2, 2);
    lightRoot.add(pointLight);

    const ambientLight = new THREE.AmbientLight(
      ambientLightColor,
      ambientLightIntensity,
    );
    lightRoot.add(ambientLight);

    this.scene.add(lightRoot);
  }

  createMaterials() {
    // Materials for torus objects
    for (let i = 0; i < cssColors.length; i++) {
      const torusMaterial = this.createTorusMaterial(i);
      this.torusMaterials.push(torusMaterial);
    }

    // Materials for box objects
    for (let i = 0; i < cssColors.length; i++) {
      const boxMaterial = this.createBoxMaterial(i);
      this.boxMaterials.push(boxMaterial);
    }

    // Materials for spheres
    const sphereMaterial = this.createSphereMaterial();
    for (let i = 0; i < cssColors.length; i++) {
      this.sphereMaterials.push(sphereMaterial);
    }

    // Materials for bars
    for (let i = 0; i < barColors.length; i++) {
      const barMaterial = this.createBarMaterial(i);
      this.barMaterials.push(barMaterial);
    }

    // Room material
    const roomMaterial = this.createRoomMaterial();
    this.roomMaterials.push(roomMaterial);

    // Set opacity to current
    this.setMaterialOpacity(this.opacity);
  }

  recreateMaterials() {
    let toDelete = [];
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
    toDelete = [];
  }

  createBarMaterial(i) {
    const material = this.createPaletteMaterial(
      i,
      "barMaterial",
      barColors,
      false,
    );
    return material;
  }

  createBoxMaterial(i) {
    const material = this.createPaletteMaterial(
      i,
      "boxMaterial",
      cssColors,
      true,
    );
    return material;
  }

  createTorusMaterial(i) {
    const material = this.createPaletteMaterial(
      i,
      "torusMaterial",
      cssColors,
      true,
    );
    return material;
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
    return this.createMaterial(params, transparent);
  }

  createMaterial(params, transparent) {
    let material = null;
    if (this.useWboitMaterial) {
      if (transparent) {
        material = new MeshWboitMaterial(params);
      } else {
        material = new THREE.MeshBasicMaterial(params);
      }
    } else {
      material = new THREE.MeshPhongMaterial(params);
      if (transparent) {
        WboitUtils.patch(material);
      }
    }
    return material;
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
    const fragmentShader = `
        uniform float opacity;
        varying vec3 vNormal;
        void main() {
            // Map the -1.0 to 1.0 normal vector to 0.0 to 1.0 for RGB colors
            vec3 color = vNormal * 0.5 + 0.5;
            gl_FragColor = vec4(color,opacity);
        }
    `;
    let material = null;
    if (this.useWboitMaterial) {
      material = new MeshWboitMaterial({
        color: "darkgray",
        transparent: false,
        opacity: 1,
      });
    } else {
      material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: customUniforms,
      });
      material.name = "sphereMaterial";
      material.transparent = false;
      WboitUtils.patch(material);
    }

    return material;
  }

  randomInteger(range) {
    return Math.floor(Math.random() * range);
  }

  createGeometry() {
    const geometryRoot = new THREE.Object3D();
    geometryRoot.name = "geometryRoot";

    // Add walls
    const walls = this.createWalls();
    geometryRoot.add(walls);

    // Add torus objects in a circle
    const rotationStepY = (2 * Math.PI) / torusCount;
    for (
      let i = 0, rotationAngleY = 0;
      i < torusCount;
      i++, rotationAngleY += rotationStepY
    ) {
      const torus = this.createTorus(i, rotationAngleY);
      geometryRoot.add(torus);
    }

    // Add boxes in a circle
    const rotationStepZ = (2 * Math.PI) / boxCount;
    for (
      let i = 0, rotationAngleZ = rotationStepZ / 2;
      i < boxCount;
      i++, rotationAngleZ += rotationStepZ
    ) {
      const box = this.createBox(i, rotationAngleZ);
      geometryRoot.add(box);
    }

    // Add spheres in a circle
    const sphereRotationStepZ = (2 * Math.PI) / sphereCount;
    for (
      let i = 0, rotZ = sphereRotationStepZ / 2;
      i < sphereCount;
      i++, rotZ += sphereRotationStepZ
    ) {
      const sphere = this.createSphere(i, rotZ);
      geometryRoot.add(sphere);
    }

    // Add bars in a circle
    const barRotationStepZ = (2 * Math.PI) / barCount;
    for (
      let i = 0, rotZ = barRotationStepZ / 4;
      i < barCount;
      i++, rotZ += barRotationStepZ
    ) {
      const bar = this.createBar(i, rotZ);
      geometryRoot.add(bar);
    }

    this.scene.add(geometryRoot);
  }

  assignMaterialsToObjects() {
    const geometryRoot = this.scene.getObjectByName("geometryRoot");
    if (!geometryRoot) {
      return;
    }

    for (const child of geometryRoot.children) {
      if (child.name.startsWith("bar")) {
        const index = parseInt(child.name.replace("bar", ""), 10);
        child.material = this.boxMaterials[index];
      } else if (child.name.startsWith("box")) {
        const index = parseInt(child.name.replace("box", ""), 10);
        child.material = this.boxMaterials[index];
      } else if (child.name.startsWith("sphere")) {
        const index = parseInt(child.name.replace("sphere", ""), 10);
        child.material = this.sphereMaterials[index];
      } else if (child.name.startsWith("torus")) {
        const index = parseInt(child.name.replace("torus", ""), 10);
        child.material = this.torusMaterials[index];
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

  createTorus(i, rotationAngle) {
    const torusGeometry = new THREE.TorusGeometry(torusRadius, torusTube);
    const objMesh = new THREE.Mesh(torusGeometry, this.torusMaterials[i]);
    objMesh.name = "torus" + i;
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeRotationY(rotationAngle);
    const transMatrix = new THREE.Matrix4();
    transMatrix.makeTranslation(
      Math.cos(rotationAngle) * torusCircleRadius,
      Math.sin(rotationAngle) * torusCircleRadius,
      0,
    );
    const geoMatrix = transMatrix.multiply(rotMatrix);
    objMesh.applyMatrix4(geoMatrix);
    return objMesh;
  }

  createBox(i, rotationAngle) {
    const boxHeight =
      boxMinY + Math.abs(Math.sin(rotationAngle)) * (boxMaxY - boxMinY);
    const boxGeometry = new THREE.BoxGeometry(boxX, boxHeight, boxZ);
    const objMesh = new THREE.Mesh(boxGeometry, this.boxMaterials[i]);
    objMesh.name = "box" + i;
    const transMatrix = new THREE.Matrix4();
    transMatrix.makeTranslation(
      Math.cos(rotationAngle) * boxCircleRadius,
      -(roomSurfaceSize / 2) + boxHeight / 2,
      Math.sin(rotationAngle) * boxCircleRadius,
    );
    objMesh.applyMatrix4(transMatrix);
    return objMesh;
  }

  createSphere(i, rotationAngle) {
    const sphereGeometry = new THREE.SphereGeometry(
      sphereRadius,
      sphereSegments,
      sphereSegments,
    );
    const sphereMaterial =
      this.sphereMaterials[i % this.sphereMaterials.length];
    const objMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    objMesh.name = "sphere" + i;
    const transMatrix = new THREE.Matrix4();
    transMatrix.makeTranslation(
      Math.cos(rotationAngle) * sphereCircleRadius,
      Math.cos(rotationAngle * 2) * sphereRadius,
      Math.sin(rotationAngle) * sphereCircleRadius,
    );
    objMesh.applyMatrix4(transMatrix);
    return objMesh;
  }

  createBar(i, rotationAngle) {
    const barGeometry = new THREE.CylinderGeometry(
      barRadius,
      barRadius,
      barLength,
      barSegments,
    );
    const barMaterial = this.barMaterials[i % this.barMaterials.length];
    const objMesh = new THREE.Mesh(barGeometry, barMaterial);
    objMesh.name = "bar" + i;
    const transMatrix = new THREE.Matrix4();
    transMatrix.makeTranslation(
      Math.cos(rotationAngle) * barCircleRadius,
      0, // -(roomSurfaceSize / 2) + barRadius / 2,
      Math.sin(rotationAngle) * barCircleRadius,
    );
    objMesh.applyMatrix4(transMatrix);
    return objMesh;
  }

  createWboitPass() {
    this.wboitPass = new WboitPass(
      this.renderer,
      this.scene,
      this.camera,
      0 /* optional clear color */,
      1.0 /* optional clear alpha */,
    );
    this.setOpacity(this.opacity);
  }

  start() {
    this.createAll();
    this.animate();
  }

  render() {
    if (!this.wboitPass) {
      this.createWboitPass();
    }
    this.wboitPass.render(this.renderer);
  }

  addListeners() {
    window.addEventListener("resize", this.onResize.bind(this));
    const opacitySlider = document.querySelector("#opacityRange");
    if (opacitySlider) {
      opacitySlider.addEventListener("input", (event) => {
        this.setOpacity(event.target.value);
      });
    }
    const wboitCheckbox = document.querySelector("#wboitCheckbox");
    if (wboitCheckbox) {
      wboitCheckbox.addEventListener("input", (event) => {
        this.setWboitMaterial(event.target.checked);
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

  setWboitMaterial(value) {
    if (value === this.useWboitMaterial) {
      return;
    }
    this.useWboitMaterial = value;
    this.recreateMaterials();
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
          if (uniforms && "opacity" in uniforms) {
            uniforms.opacity.value = opacity;
          }
        }
      }
    }
  }
}

const experiment = new WboitExperiment();
experiment.start();
