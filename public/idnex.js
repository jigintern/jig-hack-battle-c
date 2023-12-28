import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; // for PC
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer;
let controller1, controller2;
let raycaster;
let group;

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
  const controller = event.target;
  const intersections = getIntersections(controller);
  const objects = [];
  for (const intersection of intersections) {
    const object = intersection.object;
    // object.material.emissive.b = 1;
    // コントローラーに付与 (付随して動かすようにする)
    controller.attach(object);
    objects.push(object);
    if (isTouch(intersection)) {
      break;
    }
  }
  // 選択状態のオブジェクトとして登録する
  controller.userData.selected = objects;
};

/** トリガーを話した時 */
const onSelectEnd = (event) => {
  const controller = event.target;
  if (controller.userData.selected !== undefined) {
    // 選択状態となっていたオブジェクトに対して
    for (const object of controller.userData.selected) {
      // object.material.emissive.b = 0;
      // attachでは内部的にaddを呼び出している2ためaddをする必要はありません。
      // 空間に再配置する
      group.attach(object);
      drawLineR(object.position, basePartsPosi[0]);
      drawLineL(object.position, basePartsPosi[0]);
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
const facePartsPosi = [];
const basePartsPosi = [];
/** 顔のパーツを表示 */
const loadFaceParts = () => {
  /** GLTFファイルローダー */
  const loader = new GLTFLoader();

  /** 各パーツのURL */
  const basePartsUrls = ['./fujisan.glb']
  const facePartsUrls = ['./mouth.glb', './nose.glb', './righteye.glb', './lefteye.glb']

  // 顔のパーツをロードして配置
  const loadFaceParts = (url) => {
    loader.load(url, gltf => {
      const object = gltf.scene;
      object.traverse(function (child) {
        if (child.isMesh) {
          child.position.x = 0;
          child.position.y = 0;
          child.position.z = -1;
          child.rotation.x = Math.PI / 2;
          child.rotation.z = Math.PI / 2;
          child.scale.x = 5;
          child.scale.y = 5;
          child.scale.z = 5;
          group.add(child);
          facePartsPosi.push(child.position)
          console.log(facePartsUrls.position);
        }
      }, undefined, () => {});
    })
  }

  // 顔の土台をロードして配置
  const loadBaseParts = (url) => {
    loader.load(url, gltf => {
      const object = gltf.scene;
      object.traverse(function (child) {
        if (child.isMesh) {
          child.position.x = 0;
          child.position.y = 0;
          child.position.z = -1;
          child.rotation.x = Math.PI / 2;
          child.rotation.z = Math.PI / 2;
          child.scale.x = 3;
          child.scale.y = 3;
          child.scale.z = 3;
          scene.add(gltf.scene);
          basePartsPosi.push(child.position)
          
          drawLineR(facePartsPosi[2], basePartsPosi[0]);
          drawLineL(facePartsPosi[3], basePartsPosi[0]);
        }
      }, undefined, () => {});
    })
  }
  basePartsUrls.forEach(part => loadBaseParts(part))
  facePartsUrls.forEach(part => loadFaceParts(part))

}
const drawLineR = (startPos, endPos) => {
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 , linewidth: 5}); // 緑色の線

  const points = [];
  points.push(new THREE.Vector3(startPos.x + -2.25, startPos.y + -0.65, startPos.z + 0.55));
  points.push(new THREE.Vector3(endPos.x + -0.14, endPos.y + 0.7, endPos.z + 2.1));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
};

const drawLineL = (startPos, endPos) => {
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 , linewidth: 5}); // 緑色の線

  const points = [];
  points.push(new THREE.Vector3(startPos.x + -1.9, startPos.y + -0.25, startPos.z + 0.5));
  points.push(new THREE.Vector3(endPos.x + 0.15, endPos.y + 0.68, endPos.z + 2.2));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
};

// facePartsPosiの2番目とbasePartsPosiの2番目の要素を線で結ぶ

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
