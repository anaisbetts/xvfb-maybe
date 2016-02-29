'use strict';

const path = require('path');
const sfs = require('fs');
const isWindows = process.platform === 'win32';

function statSyncNoException(file) {
  try {
    return sfs.statSync(file);
  } catch (e) {
    return null;
  }
}

function runDownPath(exe) {
  // NB: Windows won't search PATH looking for executables in spawn like
  // Posix does

  // Files with any directory path don't get this applied
  if (exe.match(/[\\\/]/)) {
    return exe;
  }

  let target = path.join('.', exe);
  if (statSyncNoException(target)) {
    return target;
  }

  let haystack = process.env.PATH.split(isWindows ? ';' : ':');
  for (let p of haystack) {
    let needle = path.join(p, exe);
    if (statSyncNoException(needle)) return needle;
  }

  return exe;
}

function findActualExecutable(fullPath, args) {
  // POSIX can just execute scripts directly, no need for silly goosery
  if (process.platform !== 'win32') return { cmd: fullPath, args: args };

  // NB: When you write something like `surf-client ... -- surf-build` on Windows,
  // a shell would normally convert that to surf-build.cmd, but since it's passed
  // in as an argument, it doesn't happen
  const possibleExts = ['.exe', '.bat', '.cmd', '.ps1'];
  let extToUse = possibleExts.find((x) => sfs.existsSync(fullPath + x));

  if (extToUse) {
    let realExecutable = fullPath + extToUse;
    return findActualExecutable(realExecutable, args);
  }

  if (fullPath.match(/\.ps1$/i)) {
    let cmd = path.join(process.env.SYSTEMROOT, 'System32', 'WindowsPowerShell', 'v1.0', 'PowerShell.exe');
    let psargs = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NonInteractive', '-File', fullPath];

    return { cmd: cmd, args: psargs.concat(args) };
  }

  if (fullPath.match(/\.(bat|cmd)$/i)) {
    let cmd = path.join(process.env.SYSTEMROOT, 'System32', 'cmd.exe');
    let cmdArgs = ['/C', fullPath];

    return { cmd: cmd, args: cmdArgs.concat(args) };
  }

  if (fullPath.match(/\.(js)$/i)) {
    let cmd = process.execPath;
    let nodeArgs = [fullPath];

    return { cmd: cmd, args: nodeArgs.concat(args) };
  }

  // Dunno lol
  return { cmd: fullPath, args: args };
}

module.exports = { findActualExecutable: findActualExecutable, runDownPath: runDownPath };
