import _ from "lodash"
import https from "https"
import Webpack from "webpack"
import * as Fs from "fs"
import * as AWS from "aws-sdk"
import AWSLambdaAutoDeployPlugin from "../AWSLambdaAutoDeployPlugin"
import { AWSLambdaAutoDeployPluginConfig } from "../types"
import * as Path from "path"
import * as Sh from "shelljs"
import { getFileTimestamp, getLogger } from "../helpers"

import moment from "moment"

const log = getLogger()
const rootDir = Path.resolve(__dirname,"..",".."),
  testsDir = Path.join(rootDir, ".tests")

function getTempDir() {
  const
    timestamp = getFileTimestamp(),
    tmp = Path.join(testsDir, timestamp)
  Sh.mkdir("-p", tmp)
  log.info("Returning tmp path", tmp)
  return tmp
}

const createBuildFailError = errors =>
  ["Webpack Build Failed", ...errors.map(e => e.stack)].join("\n")

export function createWebpackConfig(
  pluginConfig: AWSLambdaAutoDeployPluginConfig,
  extraConfig: Partial<Webpack.Configuration> = {}
  
) {
  const templateSrcFile = Path.resolve(__dirname, "fixtures/index.js"),
    baseDir = getTempDir(),
    distDir = Path.join(baseDir, "dist"),
    srcDir = Path.join(baseDir, "src"),
    srcFile = Path.join(srcDir, "index.js")

  Array(distDir, srcDir).forEach(dir => Sh.mkdir("-p", dir))

  Sh.cp(templateSrcFile, srcFile)

  return {
    context: baseDir,
    entry: "./src/index.js",
    module: {
      rules: []
    },
    plugins: [
      new AWSLambdaAutoDeployPlugin(pluginConfig)
    ],
    output: {
      publicPath: "/",
      path: distDir,
      filename: `[name].js`
    },
    ...extraConfig
  } as Webpack.Configuration
}

export function runWebpackConfig(config: Webpack.Configuration) {
  return new Promise<Webpack.Stats>(function (resolve, reject) {
    Webpack(config, (err, stats: Webpack.Stats) =>{
      if (err) {
        reject(err)
        return
      }

      // console.log(JSON.stringify(arguments, null, 2))
      resolve(stats)
    })
  })
}
