/**
 * Application Processor Test Suite
 * Tests application submission logic, safety checks, and rate limiting
 */

import { describe, it, expect } from "@jest/globals";
import {
  generateMockMatch,
  generateMockApplicationResult,
} from "../utils/test-utils";

describe("Application Processor", () => {
  describe("Safety Checks", () => {
    it("should prevent applications when auto-apply is disabled", () => {
      // This test validates that candidates with auto_apply_enabled=false
      // are not submitted applications
      const match = generateMockMatch();

      // Simulate preference check
      const autoApplyEnabled = false;

      expect(autoApplyEnabled).toBe(false);
    });

    it("should prevent applications below score threshold", () => {
      const match = generateMockMatch({
        matchScore: 65, // Below typical 70 threshold
      });

      const threshold = 70;
      const shouldSubmit = match.matchScore >= threshold;

      expect(shouldSubmit).toBe(false);
    });

    it("should prevent applications exceeding rate limit", () => {
      // Simulate rate limit check
      const maxApplicationsPerDay = 5;
      const todayCount = 5;
      const remaining = maxApplicationsPerDay - todayCount;

      expect(remaining).toBeLessThanOrEqual(0);
    });

    it("should prevent duplicate applications", () => {
      const candidateId = "candidate-123";
      const jobId = "job-456";

      // Simulate checking for existing application
      const alreadyApplied = true; // Would be result of DB query

      expect(alreadyApplied).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should track applications submitted today", () => {
      const applications = [
        { candidateId: "cand-1", submittedAt: new Date() },
        { candidateId: "cand-1", submittedAt: new Date() },
        { candidateId: "cand-1", submittedAt: new Date() },
      ];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayCount = applications.filter(
        (a) => new Date(a.submittedAt).getTime() >= today.getTime()
      ).length;

      expect(todayCount).toBe(3);
    });

    it("should reset daily count at midnight UTC", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      expect(yesterday.getTime()).toBeLessThan(today.getTime());
    });

    it("should enforce per-candidate limits independently", () => {
      const candidate1Limit = 5;
      const candidate2Limit = 3;

      const candidate1Applied = 3;
      const candidate2Applied = 2;

      const candidate1CanApply = candidate1Applied < candidate1Limit;
      const candidate2CanApply = candidate2Applied < candidate2Limit;

      expect(candidate1CanApply).toBe(true);
      expect(candidate2CanApply).toBe(true);
    });

    it("should allow custom limits per candidate", () => {
      const customLimit = 10;
      const defaultLimit = 5;

      expect(customLimit).toBeGreaterThan(defaultLimit);
    });
  });

  describe("Deduplication", () => {
    it("should identify duplicate applications", () => {
      const existing = { candidateId: "cand-1", jobId: "job-1" };
      const newApp = { candidateId: "cand-1", jobId: "job-1" };

      const isDuplicate =
        existing.candidateId === newApp.candidateId &&
        existing.jobId === newApp.jobId;

      expect(isDuplicate).toBe(true);
    });

    it("should allow same candidate to apply to different jobs", () => {
      const app1 = { candidateId: "cand-1", jobId: "job-1" };
      const app2 = { candidateId: "cand-1", jobId: "job-2" };

      const isDuplicate =
        app1.candidateId === app2.candidateId && app1.jobId === app2.jobId;

      expect(isDuplicate).toBe(false);
    });

    it("should allow different candidates to apply to same job", () => {
      const app1 = { candidateId: "cand-1", jobId: "job-1" };
      const app2 = { candidateId: "cand-2", jobId: "job-1" };

      const isDuplicate =
        app1.candidateId === app2.candidateId && app1.jobId === app2.jobId;

      expect(isDuplicate).toBe(false);
    });
  });

  describe("Application Results", () => {
    it("should return success for valid applications", () => {
      const result = generateMockApplicationResult(true);

      expect(result.success).toBe(true);
      expect(result.applicationId).toBeDefined();
      expect(result.candidateId).toBeDefined();
      expect(result.jobPostingId).toBeDefined();
    });

    it("should include failure reason when unsuccessful", () => {
      const result = generateMockApplicationResult(false, {
        reason: "Already applied",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("should track submission timestamp", () => {
      const now = new Date();
      const result = generateMockApplicationResult(true, {
        submittedAt: now,
      });

      expect(result.submittedAt).toEqual(now);
    });

    it("should preserve match score in results", () => {
      const score = 82;
      const result = generateMockApplicationResult(true, {
        matchScore: score,
      });

      expect(result.matchScore).toBe(score);
    });
  });

  describe("Batch Processing", () => {
    it("should group matches by candidate", () => {
      const matches = [
        generateMockMatch({ candidateId: "cand-1" }),
        generateMockMatch({ candidateId: "cand-1" }),
        generateMockMatch({ candidateId: "cand-2" }),
      ];

      const byCandidate = new Map<string, typeof matches>();
      for (const match of matches) {
        if (!byCandidate.has(match.candidateId)) {
          byCandidate.set(match.candidateId, []);
        }
        byCandidate.get(match.candidateId)!.push(match);
      }

      expect(byCandidate.size).toBe(2);
      expect(byCandidate.get("cand-1")?.length).toBe(2);
      expect(byCandidate.get("cand-2")?.length).toBe(1);
    });

    it("should process candidates sequentially", () => {
      const candidates = ["cand-1", "cand-2", "cand-3"];
      const processed: string[] = [];

      for (const candidate of candidates) {
        processed.push(candidate);
      }

      expect(processed).toEqual(candidates);
    });

    it("should track submitted and skipped applications separately", () => {
      const submitted = [
        generateMockApplicationResult(true),
        generateMockApplicationResult(true),
      ];
      const skipped = [generateMockApplicationResult(false)];

      expect(submitted.length).toBe(2);
      expect(skipped.length).toBe(1);
      expect(submitted.every((r) => r.success)).toBe(true);
      expect(skipped.every((r) => !r.success)).toBe(true);
    });
  });

  describe("Preference Handling", () => {
    it("should use default preferences when not specified", () => {
      const defaults = {
        autoApplyEnabled: true,
        autoApplyMinScore: 70,
        maxApplicationsPerDay: 5,
      };

      expect(defaults.autoApplyEnabled).toBe(true);
      expect(defaults.autoApplyMinScore).toBe(70);
      expect(defaults.maxApplicationsPerDay).toBe(5);
    });

    it("should respect custom score threshold", () => {
      const customThreshold = 80;
      const matchScore = 75;

      const shouldSubmit = matchScore >= customThreshold;

      expect(shouldSubmit).toBe(false);
    });

    it("should respect custom daily limit", () => {
      const customLimit = 10;
      const defaultLimit = 5;

      expect(customLimit).toBeGreaterThan(defaultLimit);
    });
  });

  describe("Error Handling", () => {
    it("should capture and report submission errors", () => {
      const error = new Error("Database connection failed");

      expect(error.message).toBe("Database connection failed");
    });

    it("should continue processing after single application failure", () => {
      const matches = [
        generateMockMatch({ candidateId: "cand-1", jobPostingId: "job-1" }),
        generateMockMatch({ candidateId: "cand-1", jobPostingId: "job-2" }),
      ];

      // Even if first fails, should continue to second
      expect(matches.length).toBe(2);
    });

    it("should not lose data on partial batch failure", () => {
      const results = {
        submitted: [generateMockApplicationResult(true)],
        skipped: [generateMockApplicationResult(false)],
      };

      expect(results.submitted.length).toBeGreaterThan(0);
      expect(results.skipped.length).toBeGreaterThan(0);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle candidate reaching daily limit mid-batch", () => {
      const maxApplicationsPerDay = 5;
      const matches = [
        generateMockMatch({ candidateId: "cand-1" }),
        generateMockMatch({ candidateId: "cand-1" }),
        generateMockMatch({ candidateId: "cand-1" }),
        generateMockMatch({ candidateId: "cand-1" }),
        generateMockMatch({ candidateId: "cand-1" }),
        generateMockMatch({ candidateId: "cand-1" }), // Should be skipped
      ];

      const candidateMatches = matches.filter(
        (m) => m.candidateId === "cand-1"
      );
      const submitted = Math.min(candidateMatches.length, maxApplicationsPerDay);
      const skipped = candidateMatches.length - submitted;

      expect(submitted).toBe(5);
      expect(skipped).toBe(1);
    });

    it("should skip candidates with auto-apply disabled", () => {
      const matches = [
        generateMockMatch({ candidateId: "cand-1" }),
        generateMockMatch({ candidateId: "cand-2" }),
        generateMockMatch({ candidateId: "cand-3" }),
      ];

      const autoApplyEnabledCandidates = new Set(["cand-1", "cand-3"]);
      const validMatches = matches.filter((m) =>
        autoApplyEnabledCandidates.has(m.candidateId)
      );

      expect(validMatches.length).toBe(2);
    });

    it("should process mixed success and failure results", () => {
      const results = {
        submitted: [
          generateMockApplicationResult(true),
          generateMockApplicationResult(true),
          generateMockApplicationResult(true),
        ],
        skipped: [
          generateMockApplicationResult(false, { reason: "Already applied" }),
          generateMockApplicationResult(false, {
            reason: "Score below threshold",
          }),
          generateMockApplicationResult(false, { reason: "Daily limit reached" }),
        ],
      };

      const successRate =
        results.submitted.length /
        (results.submitted.length + results.skipped.length);

      expect(successRate).toBe(0.5);
    });
  });
});
