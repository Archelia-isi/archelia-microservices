import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// Setup basic global DOM for FBXLoader to work in Node
global.window = {};
global.document = {
  createElementNS: () => { return {}; }
};

const loader = new FBXLoader();

const files = [
  'Idle.fbx',
  'Arm_Stretching.fbx',
  'Catwalk_Idle_To_Twist_R.fbx',
  'Breakdance_Footwork_To_Idle.fbx',
  'Capoeira.fbx',
  'Rumba_Dancing.fbx',
  'Kettlebell_Swing.fbx'
];

async function testLoad() {
  for (const file of files) {
    const path = `apps/ui-server/public/${file}`;
    console.log(`Testing ${path}...`);
    try {
      const buffer = fs.readFileSync(path);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      // FBXLoader parses array buffer directly in newer three.js
      loader.parse(arrayBuffer, '');
      console.log(`${file} parsed successfully.`);
    } catch (e) {
      console.error(`ERROR parsing ${file}:`, e.message);
    }
  }
}

testLoad();
