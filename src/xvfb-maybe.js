#!/usr/bin/env node

'use strict';

const spawnOg = require('child_process').spawn;
const which = require('which');
const parse = require('shell-quote').parse
const fae = require('./find-actual-executable');

const d = require('debug')('xvfb-maybe');

function spawn(exe, params, opts) {
  opts = opts || null;

  let fullExe = fae.runDownPath(exe);
  let info = fae.findActualExecutable(fullExe, params);

  return new Promise((resolve, reject) => {
    let proc = null;

    d(`Spawning ${info.cmd} ${info.args.join(' ')}`);
    if (!opts) {
      proc = spawnOg(info.cmd, info.args);
    } else {
      proc = spawnOg(info.cmd, info.args, opts);
    }

    if (!proc) {
      reject(new Error("Failed to spawn process"));
      return;
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

    if (proc.stdout) {
      proc.stdout.on('data', bufHandler);
      proc.stdout.once('close', release);
    } else {
      release();
    }

    if (proc.stderr) {
      proc.stderr.on('data', bufHandler);
      proc.stderr.once('close', release);
    } else {
      release();
    }

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

function showHelp() {
  console.log("Usage: xvfb-maybe command args...\n");
  console.log("Runs the given command under xvfb-run under Linux if DISPLAY isn't set\n");
}

function main(args) {
  if (args.length < 1) {
    showHelp();
    process.exit(-1);

    return Promise.resolve(true);
  }

  const index          = args.indexOf("--xvfb-run-args")
  const hasXvfbRunArgs = index != -1

  function spliceOutXvfbArgs(args) {
    if (hasXvfbRunArgs) {
      args.splice(index, 1)
    }
  }

  if (hasXvfbRunArgs) {
    // splice out xvfb-run-args
    args.splice(index, 1)
  }

  if (process.platform === 'win32' || process.platform === 'darwin') {
    spliceOutXvfbArgs(args)
    d("Platform doesn't match, leaving");
    return spawn(args[0], args.splice(1), {cwd: undefined, env: process.env, stdio: 'inherit'});
  }

  if (process.env.DISPLAY) {
    spliceOutXvfbArgs(args)
    d("DISPLAY is set, using local X Server");
    return spawn(args[0], args.splice(1), {cwd: undefined, env: process.env, stdio: 'inherit'});
  }

  if (hasXvfbRunArgs) {
    // parse the quoted xvfb-run args into a legit array
    // and concat that with the remaining args
    args = [].concat(parse(args[0]), args.slice(1))
  }

  let xvfbRun = null;
  try {
    xvfbRun = which.sync('xvfb-run');
  } catch (e) {
    return Promise.reject(new Error("Failed to find xvfb-run in PATH. Use your distro's package manager to install it."));
  }

  return spawn(xvfbRun, args, {cwd: undefined, env: process.env, stdio: 'inherit'});
}

if (process.mainModule === module) {
  main(process.argv.splice(2))
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e.message);
      process.exit(-1);
    });
}
