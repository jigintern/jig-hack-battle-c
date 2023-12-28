import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; // for PC
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { CSV } from "https://js.sabae.cc/CSV.js";
const facedata = await CSV.fetchJSON("./faceParts.csv");

let camera, scene, renderer;
let controller1, controller2;
let raycaster;
let group;

/** ベースのパーツ */
let basePartsScene = undefined

/** 配置したパーツ */
const fixedFacePartsScene = []

/** 光線と交差しているオブジェクト */
const intersected = [];
const tempMatrix = new THREE.Matrix4();

// ウィンドウサイズを変えた時の処理
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

/** 光線の原点から交差点までの距離 (触っているかどうか) */
const isTouch = (intersection) => {
  const d = intersection.distance;
  return d > 0 && d < .10;
};

/** トリガーを引いた時 */
const onSelectStart = (event) => {
  // 「A」ボタンを押したがらトリガーを引いた時
  if (controller1.gamePadRef.buttons[4].pressed) {
    // 全てのパーツを表示する
    showAllParts()
    return
  }

  const controller = event.target;
  const intersections = getIntersections(controller);
  const objects = [];
  for (const intersection of intersections) {
    // 顔のパーツを動かし始めたら土台のオブジェクトを消す
    hidePartsFromScene(basePartsScene)

    const object = intersection.object;
    // object.material.emissive.b = 1;
    // コントローラーに付与 (付随して動かすようにする)
    controller.attach(object);
    objects.push(object);

    // 配置したパーツの配列に追加
    fixedFacePartsScene.push(object)
    if (isTouch(intersection)) {
      break;
    }
  }
  // 選択状態のオブジェクトとして登録する
  controller.userData.selected = objects;
};

/** トリガーを離した時 */
const onSelectEnd = (event) => {
  const controller = event.target;
  if (controller.userData.selected !== undefined) {
    // 選択状態となっていたオブジェクトに対して
    for (const object of controller.userData.selected) {
      // object.material.emissive.b = 0;
      // attachでは内部的にaddを呼び出している2ためaddをする必要はありません。
      // 空間に再配置する
      group.attach(object);

      // 顔のパーツを動かしたら消す
      hidePartsFromGroup(object)
      // if (snap) {
      //   object.position.x = Math.floor((object.position.x + snap / 2) / snap) *
      //     snap;
      //   object.position.y = Math.floor((object.position.y + snap / 2) / snap) *
      //     snap;
      //   object.position.z = Math.floor((object.position.z + snap / 2) / snap) *
      //     snap;
      //   const dsnap = Math.PI / 2;
      //   object.rotation.x =
      //     Math.floor((object.rotation.x + dsnap / 2) / dsnap) * dsnap;
      //   object.rotation.y =
      //     Math.floor((object.rotation.y + dsnap / 2) / dsnap) * dsnap;
      //   object.rotation.z =
      //     Math.floor((object.rotation.z + dsnap / 2) / dsnap) * dsnap;
      // }
    }
    // 選択状態のオブジェクトを解除
    controller.userData.selected = undefined;
  }
};

/** 光線とぶつかったオブジェクトを得る */
const getIntersections = (controller) => {
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  // 光線とぶつかったオブジェクトを得る
  return raycaster.intersectObjects(group.children, false);
};

const intersectObjects = (controller) => {
  // Do not highlight when already selected
  if (controller.userData.selected !== undefined) return;

  // 光線とぶつかったオブジェクトをに対して処理
  const intersections = getIntersections(controller);
  for (const intersection of intersections) {
    const object = intersection;
    // object.material.emissive.r = 1;
    intersected.push(object);
    // 触っていたら
    if (isTouch(intersection)) {
      // object.material.emissive.g = 1;
      break;
    }
  }
};

/** 光線とぶつかっているオブジェクトをリセット */
const cleanIntersected = () => {
  while (intersected.length) {
    const object = intersected.pop();
    // object.material.emissive.r = 0;
    // object.material.emissive.g = 0;
  }
};

/** 描画処理 */
const render = () => {
  cleanIntersected();
  intersectObjects(controller1);
  intersectObjects(controller2);
  renderer.render(scene, camera);
};

/** レンダリングを開始する */
const animate = () => {
  renderer.setAnimationLoop(render);
};

/** 顔のパーツを表示 */
const loadFaceParts = () => {
  /** GLTFファイルローダー */
  const loader = new GLTFLoader();

  /** 各パーツのURL */
  const basePartsUrls = ['./fujisan.glb']
  // 顔の土台をロードして配置
  const loadBaseParts = (url) => {
    loader.load(url, gltf => {
      const object = gltf.scene;
      gltf.scene.position.y = 0;
      gltf.scene.rotation.x = Math.PI / 2;
      gltf.scene.rotation.y = Math.PI;
      object.traverse(function (child) {
        if (child.isMesh) {
          child.position.x = 0;
          child.position.y = -1;
          child.position.z = 2;
          child.rotation.x = Math.PI / 2;
          child.rotation.z = Math.PI / 2;
          child.rotation.y = Math.PI / 2;
          child.scale.x = 3;
          child.scale.y = 3;
          child.scale.z = 3;
          // 土台のオブジェクトを保存
          basePartsScene = gltf.scene
          scene.add(gltf.scene);
        }
      }, undefined, () => {});
    })
  }

  basePartsUrls.forEach(part => loadBaseParts(part))
}

/**
 * ベースのパーツを消す
 */
const hidePartsFromScene = (part) => {
  scene.remove(part)
}

/**
 * 顔のパーツをパーツを消す
 */
const hidePartsFromGroup = (part) => {
  group.remove(part)
}

/** 全てのパーツを表示する */
const showAllParts = () => {
  // 土台を表示
  scene.add(basePartsScene)

  // 顔のパーツを表示
  fixedFacePartsScene.forEach(parts => scene.add(parts))
}

/** 空間を初期化 */
const initScene = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);

  // 空間を作成
  scene = new THREE.Scene();

  // カメラを設定
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10,
  );
  camera.position.set(0, 0, 3);

  // カメラ範囲を設定
  const controls = new OrbitControls(camera, container);
  controls.minDistance = 0;
  controls.maxDistance = 8;

  // 真上に光源を設定
  scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

  // 特定の方向に向いた光を設定
  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 6, 0);
  scene.add(light);

  // 入れ子構造を作成
  // 入れ子構造として設計することで、複数の3Dオブジェクトをまとめて移動させたり、回転させたりするのが便利になる
  group = new THREE.Group();
  scene.add(group);

  const getGeometries = () => {
    let geo = [];
    for (let i = 0;i < 4;i++){
      const d = facedata[i % facedata.length];
      const faceAspect = d.height / d.width;
      const size = 0.3;
      geo.push(new THREE.BoxGeometry(size, size * faceAspect,0.001));
    }
    return geo;
  };

  const getObjects = () => {
    const geometries = getGeometries();
    const ngeo = geometries.length ;
    const res = [];
    for (let i = 0; i < ngeo; i++) {
      const geometry = geometries[i % geometries.length];
      const d = facedata[i % facedata.length];
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.0,
        metalness: 0.0,
        map:new THREE.TextureLoader().load(d.file),
        transparent: 0.8 < 1.0,
        opacity:0.8,
      });

      const object = new THREE.Mesh(geometry, material);
      res.push(object);
    }
    return res;
  };

  const objs = getObjects();
  for (const object of objs) {
    object.position.x = Math.random() - 0.5;
    object.position.y = Math.random() - 0.5;
    object.position.z = 2;

    object.rotation.x = 0;
    object.rotation.y = 0;
    object.rotation.z = Math.random() * 2 * Math.PI;

    //object.scale.setScalar(Math.random() / 2 + 0.5);
    group.add(object);
  }

  // 3Dモデルを画面に表示するためのレンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer));
}

/** コントローラーを設定 */
const setControllers = () => {
  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.addEventListener("connected", (e) => {
    // パッドを登録
    controller1.gamePadRef = e.data.gamepad
})
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  scene.add(controller2);

  // コントローラーの向きにラインを表示
  const makeLine = (len) => {
    const material = new THREE.LineBasicMaterial({
      //color: 0xff0000, // red
      //color: 0x0000ff, // blue
      color: 0xffffff, // white
    });
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(0, 0, -len));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    return line;
  };
  controller1.add(makeLine(5));
  controller2.add(makeLine(5));
}

/** 初期化処理 */
const init = () => {
  // 空間を初期化
  initScene()

  // 顔のパーツを表示
  loadFaceParts()

  // コントローラーを設定
  setControllers()

  // レイキャスティング
  // マウスピッキング（マウスが3D空間のどのオブジェクトの上にあるかを調べること）などに使わる。
  raycaster = new THREE.Raycaster();
};

init();
animate();

window.addEventListener("resize", onWindowResize);
