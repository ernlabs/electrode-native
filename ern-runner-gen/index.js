// Node
const fs = require('fs');
// 3rd party
const shell = require('shelljs');
const Mustache = require('mustache');
const chalk = require('chalk');
const readDir = require('fs-readdir-recursive');
import generateContainer from '../ern-container-gen/index.js';

const workingFolder = process.cwd();

//=============================================================================
// fs async wrappers
//=============================================================================

async function readFile(filename, enc) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, enc, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function writeFile(filename, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

//=============================================================================
// Mustache related utilities
//=============================================================================

// Mustache render using a template file
// filename: Path to the template file
// view: Mustache view to apply to the template
// returns: Rendered string output
async function mustacheRenderUsingTemplateFile(filename, view) {
  return readFile(filename, 'utf8')
          .then(template => Mustache.render(template, view));
}

// Mustache render to an output file using a template file
// templateFilename: Path to the template file
// view: Mustache view to apply to the template
// outputFile: Path to the output file
async function mustacheRenderToOutputFileUsingTemplateFile(templateFilename, view, outputFile) {
  return mustacheRenderUsingTemplateFile(templateFilename, view).then(output => {
    return writeFile(outputFile, output);
  });
}

//==============================================================================
// Misc utitlities
//==============================================================================

// Given a string returns the same string with its first letter capitalized
function pascalCase(string) {
    return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

// Given a string returns the same string with its first letter in lower case
function camelCase(string) {
    return `${string.charAt(0).toLowerCase()}${string.slice(1)}`;
}

// log section messag
function sectionLog(msg) {
  console.log(chalk.bold.green(`[ern-runner-gen] === ${msg.toUpperCase()} ===`));
}

// log info message with ern-container-gen header and chalk coloring
function log(msg) {
  console.log(chalk.bold.blue(`[ern-runner-gen] ${msg}`));
}

// log error message with ern-container-gen header and chalk coloring
function errorLog(msg) {
  console.log(chalk.bold.red(`[ern-container-gen] ${msg}`));
}

//=============================================================================
// Main
//=============================================================================

const CONTAINER_POM_VERSION = '1.0.0-SNAPSHOT';

// Generate the runner project (Android only as of now)
// platformPath : Path to the ern-platform to use
// plugins : Array containing all plugins to be included in the generated container
// miniapp : The miniapp to attach to this runner. Needs to have localPath set !
// outFolder : Where the generated project will be outputed
export async function generateRunner({
  platformPath,
  plugins,
  miniapp,
  outFolder,
  verbose
}) {
  try {
    sectionLog(`Starting runner project generation [Android]`);

    if (!miniapp.localPath) {
      throw new Error("Miniapp must come with a local path !");
    }

    const view = {
      pascalCaseMiniAppName: pascalCase(miniapp.name),
      camelCaseMiniAppName: camelCase(miniapp.name)
    };

    await generateContainerForRunner({
      platformPath,
      plugins,
      miniapp,
      verbose
    });

    shell.mkdir(outFolder);
    shell.cp('-R', `${platformPath}/ern-runner-gen/runner-hull/android/*`, outFolder);
    const files = readDir(`${platformPath}/ern-runner-gen/runner-hull/android`,
      (f) => (!f.endsWith('.jar') && !f.endsWith('.png')));
    for (const file of files) {
      await mustacheRenderToOutputFileUsingTemplateFile(
        `${outFolder}/${file}`, view, `${outFolder}/${file}`);
    }

    sectionLog(`Done with runner project generation [Android]`);
  } catch (e) {
    errorLog("[generateRunner] Something went wrong: " + e);
    throw e;
  }
}

export async function generateContainerForRunner({
  platformPath,
  plugins,
  miniapp,
  verbose
}) {
  const generator = {
    platform: 'android',
    name: 'maven',
    containerPomVersion: CONTAINER_POM_VERSION
  };

  await generateContainer({
    nativeAppName: camelCase(miniapp.name),
    generator,
    platformPath,
    plugins,
    miniapps: [miniapp],
    verbose
  })
}