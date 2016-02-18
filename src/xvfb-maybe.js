'use strict';

const path = require('path');
const spawnOg = require('child_process').spawn;

const d = require('debug')('xvfb-maybe');

export default function spawn(exe, params, opts=null) {
  return new Promise((resolve, reject) => {
    let proc = null;

    d(`Spawning ${exe} ${params.join(' ')}`);
    if (!opts) {
      proc = spawnOg(exe, params);
    } else {
      proc = spawnOg(exe, params, opts);
    }
    
    // We need to wait until all three events have happened:
    // * stdout's pipe is closed
    // * stderr's pipe is closed
    // * We've got an exit code
    let rejected = false;
    let refCount = 3;
    let release = () => { 
      if (--refCount <= 0 && !rejected) resolve(stdout);
    };

    let stdout = '';
    let bufHandler = (b) => {
      let chunk = b.toString();
      stdout += chunk;
    };
    
    proc.stdout.on('data', bufHandler);
    proc.stdout.once('close', release);
    proc.stderr.on('data', bufHandler);
    proc.stderr.once('close', release);
    proc.on('error', (e) => reject(e));

    proc.on('close', (code) => {
      if (code === 0) {
        release();
      } else {
        rejected = true;
        reject(new Error(`Failed with exit code: ${code}\nOutput:\n${stdout}`));
      }      
    });
  });
}    

function main(args) {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    d("Platform doesn't match, leaving");
    return spawn(args[0], args.splice(1), {cwd: undefined, env: process.env, stdio: 'inherit'});
  }
}

if (process.mainModule === module) {
  main(process.argv);
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e.message);
      process.exit(-1);
    });  
}
