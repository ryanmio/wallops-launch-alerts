// Test script to manually trigger and verify cron job functionality
const CRON_SECRET = process.env.CRON_SECRET || "test-secret"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

async function testCronJob() {
  console.log("Testing cron job functionality...")

  try {
    // Test health check
    console.log("\n1. Testing health check...")
    const healthResponse = await fetch(`${BASE_URL}/api/health`)
    const healthData = await healthResponse.json()
    console.log("Health status:", healthData.healthy ? "HEALTHY" : "UNHEALTHY")
    if (!healthData.healthy) {
      console.log("Health issues:", healthData.services)
    }

    // Test cron status
    console.log("\n2. Testing cron status...")
    const statusResponse = await fetch(`${BASE_URL}/api/cron/status`, {
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log("Cron status:", statusData.status)
    } else {
      console.log("Cron status check failed:", statusResponse.status)
    }

    // Test manual cron execution
    console.log("\n3. Testing manual cron execution...")
    const cronResponse = await fetch(`${BASE_URL}/api/cron/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "User-Agent": "vercel-cron/1.0",
      },
    })

    const cronData = await cronResponse.json()

    if (cronResponse.ok) {
      console.log("Cron job executed successfully!")
      console.log("Duration:", cronData.duration)
      console.log("Timestamp:", cronData.timestamp)
    } else {
      console.log("Cron job failed:", cronData.error)
    }

    console.log("\nCron job test completed!")
  } catch (error) {
    console.error("Test failed:", error)
  }
}

// Run the test
testCronJob()
