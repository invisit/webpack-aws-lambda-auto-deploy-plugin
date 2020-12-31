import type AWS from "aws-sdk"

export type AutoDeployStorage = "lambda" | "s3"

/**
 * Map outputs to lambda function names
 */
export interface OutputToLambda {
  function: string
  outputName: string
}

export interface AutoDeployConfig {
  storage: AutoDeployStorage
  output: OutputToLambda[]
}
