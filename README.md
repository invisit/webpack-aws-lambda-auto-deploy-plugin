
AWS Lambda AutoDeploy Plugin
===

This plugin will upload all built assets to s3


### Install Instructions

```bash
$ yarn add -D @invisit/webpack-aws-lambda-auto-deploy-plugin
```
Note: This plugin needs NodeJS > 0.12.0

### Configuration

## Example 1

In this case, the resulting `.zip` code
bundle of the `main` entry, will be used
to update the code for AWS lambda functions
named `main` and `event`

Note: if your code archive is > `50mb` you MUST
    use `config.aws.storage.type = "s3"` 
    (all the options are in the typings)

```typescript

/**
 * Simple config, deploy direct to lambda
 * @see `src/types.ts` 
 */
const config:AWSLambdaAutoDeployPluginConfig<"lambda"> = {
  aws: {
    config: {
      region: "us-east-1"
    },
    storage: {
      type: "lambda"
    }
  },
    /**
     * If you simply provider the function name and not
     * an array of 1..n mappings - your base file must be named `main`,
     * this is webpack's default output name.  When would mean the
     * configured call would look similar to `main.handler`
     */
    mappings: [      
      {
        entry: "main",
        fn: ["main", "event"] 
        
      }
    ]
}

```
