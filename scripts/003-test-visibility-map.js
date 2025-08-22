// Test script to generate and verify visibility map
import { generateSampleVisibilityMap } from "../lib/visibility-map.js"
import { isNightLaunch } from "../lib/sun-calculations.js"

console.log("Testing visibility map generation...")

// Test night detection
const testDate = new Date("2024-12-15T02:30:00Z") // 2:30 AM UTC
console.log(`Testing night detection for ${testDate.toISOString()}`)

isNightLaunch(testDate)
  .then((isNight) => {
    console.log(`Is night launch: ${isNight}`)
  })
  .catch((error) => {
    console.error("Error testing night detection:", error)
  })

// Test map generation
generateSampleVisibilityMap()
  .then(() => {
    console.log("Visibility map test completed")
  })
  .catch((error) => {
    console.error("Error testing visibility map:", error)
  })
