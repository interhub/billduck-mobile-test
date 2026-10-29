const {rmSync} = require('node:fs');

module.exports = async () => {
  const {child, stateDirectory} = globalThis.mockProcess;
  child.kill();
  rmSync(stateDirectory, {recursive: true, force: true});
};
