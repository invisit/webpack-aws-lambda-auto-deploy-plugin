import "jest"
import { createWebpackConfig, runWebpackConfig } from "./test-helpers"
import { getLogger } from "../helpers"

const log = getLogger()

describe('AutoDeploy test', function() {
  beforeEach(() => {
  
  })
  
  it("Fails & reports 1 error", async () => {
    const config = createWebpackConfig({
      mappings: "test-fn"
    })
    
    const stats = await runWebpackConfig(config),
      statsJson = stats.toJson()
    expect(statsJson.errors?.length).toBe(1)
    
  })
})
