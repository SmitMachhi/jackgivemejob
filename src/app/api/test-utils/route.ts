import { NextRequest, NextResponse } from "next/server";
import {
  generateJobId,
  getClientIP,
  addActiveJob,
  removeActiveJob,
  isJobAllowed,
  getActiveJobCount,
  getTotalActiveJobCount,
  getActiveJobsForIP,
  clearAllActiveJobs,
} from "@/lib/job-utils";

export async function GET(request: NextRequest) {
  try {
    // Clear any existing jobs for clean testing
    clearAllActiveJobs();

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {} as Record<string, any>,
    };

    // Test 1: Generate job ID
    const jobId = generateJobId();
    testResults.tests.generateJobId = {
      success: typeof jobId === "string" && jobId.length > 0,
      jobId: jobId,
      description: "Job ID should be a non-empty string",
    };

    // Test 2: getClientIP with different headers
    const testIPs = [
      {
        headers: new Headers({ "X-Forwarded-For": "192.168.1.1,10.0.0.1" }),
        expected: "192.168.1.1",
      },
      {
        headers: new Headers({ "X-Real-IP": "192.168.1.2" }),
        expected: "192.168.1.2",
      },
      {
        headers: new Headers({ "CF-Connecting-IP": "192.168.1.3" }),
        expected: "192.168.1.3",
      },
      { headers: new Headers(), expected: "unknown" },
    ];

    testResults.tests.getClientIP = [];
    for (const testCase of testIPs) {
      const mockRequest = new NextRequest("http://localhost:3000", {
        headers: testCase.headers,
      });
      const ip = getClientIP(mockRequest);
      testResults.tests.getClientIP.push({
        headers: Object.fromEntries(testCase.headers.entries()),
        expected: testCase.expected,
        actual: ip,
        success: ip === testCase.expected,
      });
    }

    // Test 3: Active jobs Map operations
    const testIP = "192.168.1.100";
    const testJob1 = generateJobId();
    const testJob2 = generateJobId();

    // Test adding jobs
    addActiveJob(testJob1, testIP);
    testResults.tests.addActiveJob = {
      success: getActiveJobCount(testIP) === 1,
      jobCount: getActiveJobCount(testIP),
      description: "Should add job and increment count for IP",
    };

    // Test adding second job
    addActiveJob(testJob2, testIP);
    testResults.tests.addSecondJob = {
      success: getActiveJobCount(testIP) === 2,
      jobCount: getActiveJobCount(testIP),
      description: "Should add second job and increment count for IP",
    };

    // Test getting active jobs for IP
    const activeJobs = getActiveJobsForIP(testIP);
    testResults.tests.getActiveJobsForIP = {
      success: activeJobs.includes(testJob1) && activeJobs.includes(testJob2),
      jobs: activeJobs,
      description: "Should return array of active job IDs for IP",
    };

    // Test removing job
    removeActiveJob(testJob1);
    testResults.tests.removeActiveJob = {
      success:
        getActiveJobCount(testIP) === 1 &&
        !getActiveJobsForIP(testIP).includes(testJob1),
      jobCount: getActiveJobCount(testIP),
      remainingJobs: getActiveJobsForIP(testIP),
      description: "Should remove job and decrement count for IP",
    };

    // Test 4: Job limits with isJobAllowed
    clearAllActiveJobs(); // Start fresh for limit testing

    // Test initial state (should be allowed)
    testResults.tests.isJobAllowed_initial = {
      success: isJobAllowed(testIP),
      totalJobs: getTotalActiveJobCount(),
      ipJobCount: getActiveJobCount(testIP),
      description: "New IP should be allowed to create jobs",
    };

    // Add job up to limit (MAX_JOBS_PER_IP = 1)
    addActiveJob(testJob1, testIP);
    testResults.tests.isJobAllowed_atLimit = {
      success: !isJobAllowed(testIP),
      totalJobs: getTotalActiveJobCount(),
      ipJobCount: getActiveJobCount(testIP),
      description: "IP should not be allowed when at job limit",
    };

    // Test with different IP (should still be allowed due to MAX_TOTAL_JOBS = 3)
    const testIP2 = "192.168.1.101";
    testResults.tests.isJobAllowed_differentIP = {
      success: isJobAllowed(testIP2),
      totalJobs: getTotalActiveJobCount(),
      ipJobCount: getActiveJobCount(testIP2),
      description: "Different IP should be allowed when total jobs under limit",
    };

    // Test total job limit
    // Add jobs from different IPs to reach MAX_TOTAL_JOBS (3)
    addActiveJob(generateJobId(), testIP2);
    addActiveJob(generateJobId(), "192.168.1.102");

    testResults.tests.isJobAllowed_totalLimit = {
      success: !isJobAllowed("192.168.1.103"),
      totalJobs: getTotalActiveJobCount(),
      description: "Should not allow new jobs when total limit reached",
    };

    // Clean up
    clearAllActiveJobs();

    return NextResponse.json({
      success: true,
      message: "All utility functions tested successfully",
      results: testResults,
    });
  } catch (error) {
    console.error("Test route error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Test route failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
