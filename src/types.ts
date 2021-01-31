import type AWS from "aws-sdk"

export type AutoDeployStorage = "lambda" | "s3"

/**
 * Map outputs to lambda function names
 */
export interface EntryLambdaMapping {
  fn: string[]
  entry: string
}

export type AWSDeployStorageConfig<Storage extends AutoDeployStorage> = {
  type: Storage
} & (Storage extends "s3" ? {
  
  bucket: string
  
  /**
   * Defaults to "", can not start with `/`
   */
  pathPrefix?: string
  
  /**
   * This is prepended to the base file name,
   * which is `<pathPrefix>/?<namePrefix>[entry].YYYYMMDDHHmmss.zip`
   *
   * plugin will ensure a slash between `pathPrefix` and `name` if `pathPrefix`
   * is not empty
   */
  namePrefix?: string
  
} : {})

export type AWSDeployConfig<Storage extends AutoDeployStorage> =
  {
    config?: Partial<AWS.Config>
    storage: AWSDeployStorageConfig<Storage>
  }
  

export type AWSLambdaAutoDeployPluginConfig<Storage extends AutoDeployStorage = any> =  {
  aws?: AWSDeployConfig<Storage>
  /**
   * If you simply provider the function name and not
   * an array of 1..n mappings - your base file must be named `main`,
   * this is webpack's default output name.  When would mean the
   * configured call would look similar to `main.handler`
   */
  mappings: string | EntryLambdaMapping[]
  preDeployScript?: string
}

export const DefaultEntryName = "main"
