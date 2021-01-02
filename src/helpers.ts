import * as Path from "path"
import Webpack from "webpack"
import Tracer from "tracer"
import moment from "moment"
import * as Fs from "fs"

const
  logFile = "aws-lambda-auto-deploy-plugin.log",
  log = Tracer.colorConsole({
  //rootDir: Path.resolve(__dirname, ".."),
  transport: [
    (data) => {
      Fs.appendFile(`./${logFile}`, data.rawoutput + '\n', err => {
        if (err)
          throw err
      })
    }
  ]
})


export const RootPluginDir = Path.resolve(__dirname, "..")

export function getFileTimestamp() {
  return moment().format("YYYYMMDDHHmmss")
}

export function isMultiStats(o: any): o is Webpack.compilation.MultiStats {
  return Array.isArray(o?.stats)
}

export function getLogger() {
  return log
}
