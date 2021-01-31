import * as Path from "path"
import { uniq } from "lodash"
import * as AWS from "aws-sdk"
import type { PackageJson } from "types-package-json"
import Archiver from "archiver"
import Webpack, { compilation } from "webpack"
import * as Sh from "shelljs"
import {
  getFileTimestamp,
  getLogger,
  isMultiStats,
  RootPluginDir
} from "./helpers"
import {
  AWSDeployStorageConfig,
  AWSLambdaAutoDeployPluginConfig,
  DefaultEntryName,
  EntryLambdaMapping
} from "./types"
import { asOption } from "@3fv/prelude-ts"
import * as Fs from "fs"
import { Deferred } from "@3fv/deferred"

const log = getLogger()

const compileError = (
  compilation: Webpack.compilation.Compilation,
  err: Error | string
) => {
  compilation.errors.push(err instanceof Error ? err : new Error(err))
}

type AutoDeployArgs = [
  Webpack.compilation.Compilation,
  EntryLambdaMapping
]

export default class AWSLambdaAutoDeployPlugin implements Webpack.Plugin {
  readonly pkg: PackageJson = require(Path.join(RootPluginDir, "package.json"))

  readonly name: string = this.pkg.name

  private readonly clients = {
    s3: undefined,
    lambda: undefined
  } as {
    s3: AWS.S3
    lambda: AWS.Lambda
  }

  private async archive(
    entry: string,
    entryOutputPath: string,
    entryFiles: string[]
  ) {
    const deferred = new Deferred<string>(),
      handleDone = (event: string, outputFile: string) => {
        log.trace(`Done (${event})`, outputFile)
        if (!deferred.isSettled()) {
          deferred.resolve(outputFile)
        }
      },
      handleError = (err: Error) => {
        log.error(`An error has occurred for entry (${entry})`, err)
        if (!deferred.isSettled()) {
          deferred.reject(err)
        } else {
          log.warn(
            `Received another error, but this archive has already settled`,
            err
          )
        }
      }

    try {
      const outputDir = asOption(Sh.tempdir())
          .tap(dir => {
            Sh.mkdir("-p", dir)
          })
          .get(),
        outputFile = Path.join(outputDir, `${entry}-${getFileTimestamp()}.zip`),
        output = Fs.createWriteStream(outputFile),
        archive = Archiver("zip", {})

      output.on("close", function () {
        log.info(`Bundle Complete (${outputFile}): ${archive.pointer()} bytes`)
        handleDone("close", outputFile)
      })

      output.on("end", function () {
        log.trace("Data has been drained")
        handleDone("end", outputFile)
      })

      archive.on("warning", function (err) {
        if (err.code === "ENOENT") {
          log.warn(`code: ${err.code}`)
        } else {
          handleError(err)
        }
      })

      archive.on("error", handleError)

      archive.pipe(output)

      entryFiles.forEach(file =>
        asOption(file)
          .tap(file => log.info(`${file} -> ${outputFile}`))
          .tap(file =>
            archive.file(file, {
              name: Path.relative(entryOutputPath, file)
            })
          )
      )

      await archive.finalize()
      handleDone("finalize", outputFile)
    } catch (err) {
      handleError(err)
    }
    return deferred.promise
  }

  /**
   * Deploy the compilation to the configured
   * entry <-> lambda mappings
   *
   * @param {webpack.compilation.Compilation} compilation
   * @param {EntryLambdaMapping} entryMapping
   * @returns {Promise<void>}
   */
  private deploy = async ([compilation, { entry, fn }]: AutoDeployArgs) => {
    const entryOutputPath = compilation.outputOptions.path as string,
      entryFiles = uniq(
        Object.entries(compilation.assets).map(([name, out]) =>
          asOption((<any>out).existsAt)
            .orElse(() => asOption(Path.join(entryOutputPath, name)))
            .filter(Fs.existsSync)
            .getOrThrow("existsAt is not defined")
        )
      )

    log.info(
      `Deploying entry (${entry}) to functions ${fn.join(", ")}: `,
      entryFiles
    )

    try {
      const archiveFile = await this.archive(entry, entryOutputPath, entryFiles)
      const { config } = this,
        storageConfig =
          config.aws?.storage ??
          ({
            type: "lambda"
          } as AWSDeployStorageConfig<any>)

      if (storageConfig.type === "s3") {
        const s3StorageConfig = storageConfig as AWSDeployStorageConfig<"s3">
        const { bucket, pathPrefix = "", namePrefix = "" } = s3StorageConfig

        const path = pathPrefix.replace(/^\//, "").replace(/\/$/, ""),
          isValidPath = path.length === 0,
          key = `${isValidPath ? path + "/" : ""}${namePrefix}${entry}.zip`

        await this.s3
          .putObject({
            Bucket: bucket,
            Key: key,
            ContentType: "application/zip",
            Body: Fs.createReadStream(archiveFile)
          })
          .promise()

        await Promise.all(
          fn.map(async fn =>
            this.lambda
              .updateFunctionCode({
                FunctionName: fn,
                S3Bucket: bucket,
                S3Key: key
              })
              .promise()
          )
        )
      } else {
        await Promise.all(
          fn.map(async fn =>
            this.lambda
              .updateFunctionCode({
                FunctionName: fn,
                ZipFile: Fs.createReadStream(archiveFile)
              })
              .promise()
          )
        )
      }
    } catch (err) {
      log.error(`Failed to deploy archive`, err)
      throw err
    }
  }

  /**
   * Process done compilation event
   *
   * @param {webpack.Stats | webpack.compilation.MultiStats} statsOrMultiStats
   * @returns {Promise<void>}
   */
  private onDone = async (
    statsOrMultiStats: Webpack.Stats | Webpack.compilation.MultiStats
  ) => {
    const { entryMap } = this
    const allStats: Array<Webpack.Stats> = isMultiStats(statsOrMultiStats)
      ? statsOrMultiStats.stats
      : [statsOrMultiStats]
    const pendingDeployments = uniq(
      allStats
        .map(({ compilation }) => [
          compilation,
          entryMap[compilation.compiler?.name] ?? entryMap[DefaultEntryName]
          // asOption()
          //   .map(name => entryMap[name])
          //   .getOrCall(() => Object.values(entryMap)[0])
        ])
        .filter(([, entry]) => Boolean(entry))
    )

    try {
      await Promise.all(pendingDeployments.map(async (args:AutoDeployArgs) => {
        const [compilation] = args
        try {
          await this.deploy(args)
        } catch (err) {
          compilation.errors.push(err)
        }
      }))
    } catch (err) {
      log.error(`AutoDeploy failed`, err)
      throw err
    }
  }

  // get namePrefix() {
  //   return asOption(this.config)
  //     .filter(config => config.)
  // }

  /**
   * Entries that have configured functions
   *
   * @returns {string[]}
   */
  get entryNames() {
    return Object.keys(this.entryMap)
  }

  get s3() {
    return asOption(this.clients.s3).getOrCall(
      () => (this.clients.s3 = new AWS.S3(this.awsConfig ?? {}))
    )
  }

  get lambda() {
    return asOption(this.clients.lambda).getOrCall(
      () => (this.clients.lambda = new AWS.Lambda(this.awsConfig ?? {}))
    )
  }

  constructor(
    public config: AWSLambdaAutoDeployPluginConfig,
    public readonly awsConfig: Partial<AWS.Config> = config.aws?.config ?? {},
    public readonly entryMap: Record<string, EntryLambdaMapping> = asOption(
      config.mappings
    )
      .map(
        it =>
          (Array.isArray(it)
            ? it
            : [{ fn: it, entry: [DefaultEntryName] }]) as EntryLambdaMapping[]
      )
      .get()
      .reduce(
        (
          map,
          { fn, entry }: EntryLambdaMapping
        ): Record<string, EntryLambdaMapping> => ({
          ...map,
          [entry]: {
            entry,
            fn: [
              ...(map[entry]?.fn ?? []),
              ...(typeof fn === "string" ? [fn] : fn)
            ]
          }
        }),
        {} as Record<string, EntryLambdaMapping>
      )
  ) {}

  apply(compiler: Webpack.Compiler) {
    compiler.hooks.done.tapPromise(this.name, this.onDone)
  }

  async handleErrors(error, compilation) {
    compileError(compilation, `AWSLambdaAutoDeployPlugin: ${error}`)
    throw error
  }
}
