import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js";

import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js";

class BasicCharacterController {
  constructor() {
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new FiniteStateMachine(new BasicCharacterControllerProxy(this));

    this.LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/models');
    loader.load('meggy.fbx', (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });
      
      this._target = fbx;
      this._params.scene.add(this._target);

      this._mixer = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();
      this._manager.onload = () => {
        this._fsm.setState('idle');
      };

      const _OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);

        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };

      const loader = new FBXLoader(this._manager);
      loader.setPath('./resources/anim');
      loader.load('idle.fbx', (a) => { _OnLoad('idle', a); });
      loader.load('30fps_skating.fbx', (a) => { _OnLoad('30fps_skating', a); });
    })
  };
}


class BasicCharacterControllerInput {
  constructor() {
    this._Init();
  }

  _Init() {
    this._keys = {
      forward: false,
      backwards: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // W
        this._keys.forward = true;
        break;
    }
  }
}

class FiniteStateMachine {
  constructor() {}
}

class World {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    const canvas = document.querySelector("#c");

    this._threejs = new THREE.WebGLRenderer({ antialias: true, canvas });
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener(
      "resize",
      () => {
        this._onWindowResize();
      },
      false,
    );

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(75, 20, 0);

    this._scene = new THREE.Scene();

    let light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(50, 100, 30);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    light = new THREE.AmbientLight(0x404040);
    this._scene.add(light);

    const controls = new OrbitControls(this._camera, this._threejs.domElement);
    controls.target.set(0, 20, 0);
    controls.update();

    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      "./resources/posx.jpg",
      "./resources/negx.jpg",
      "./resources/posy.jpg",
      "./resources/negy.jpg",
      "./resources/posz.jpg",
      "./resources/negz.jpg",
    ]);
    this._scene.background = texture;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x808080,
      }),
    );
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    this._mixers = [];
    this._previousRAF = null;

    this._LoadAnimatedModel();
    this._RAF();
  }

  _LoadModel() {
    const loader = new GLTFLoader();
    loader.load("./resources/rocket/Rocket_Ship_01.gltf", (gltf) => {
      gltf.scene.traverse((c) => {
        c.castShadow = true;
      });
      this._scene.add(gltf.scene);
    });
  }

  _LoadAnimatedModel() {
    const loader = new FBXLoader();
    loader.setPath("./resources/models/");
    loader.load("meggy.fbx", (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
      });

      const anim = new FBXLoader();
      anim.setPath("./resources/anim/");
      anim.load("30fps_skating.fbx", (anim) => {
        this._mixers = new THREE.AnimationMixer(fbx);
        const idle = this._mixers.clipAction(anim.animations[0]);
        idle.play();
      });
      this._scene.add(fbx);
    });
  }

  _onWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMastrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    if (this._mixers) {
      this._mixers.update(timeElapsed * 0.001);
    }
  }
}

let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  _APP = new World();
});
