import * as Path from "path"
import Webpack from "webpack"
import Tracer from "tracer"
import moment from "moment"

const log = Tracer.colorConsole({
  rootDir: Path.resolve(__dirname, "..")
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
