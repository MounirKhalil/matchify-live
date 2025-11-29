/**
 * Similarity Matcher Test Suite
 * Tests vector similarity calculations, rule-based scoring, and matching logic
 */

import { describe, it, expect } from "@jest/globals";
import {
  cosineSimilarity,
  calculateRuleBasedScore,
} from "../services/similarity-matcher";
import {
  generateMockCandidate,
  generateMockJob,
  generateRandomEmbedding,
  generateSimilarEmbedding,
  calculateCosineSimilarity as testCalculateCosineSimilarity,
} from "../utils/test-utils";

describe("Similarity Matcher", () => {
  describe("cosineSimilarity", () => {
    it("should calculate cosine similarity between identical vectors", () => {
      const vec = [1, 0, 0];
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it("should handle normalized vectors", () => {
      const vec1 = [0.707, 0.707];
      const vec2 = [0.707, 0.707];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1.0, 2);
    });

    it("should throw error for mismatched dimensions", () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0];
      expect(() => cosineSimilarity(vec1, vec2)).toThrow(
        "Vector dimensions must match"
      );
    });

    it("should return 0 for zero vectors", () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });

    it("should maintain similarity between 0 and 1", () => {
      const vec1 = generateRandomEmbedding();
      const vec2 = generateRandomEmbedding();
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe("calculateRuleBasedScore", () => {
    it("should calculate score for perfect match", () => {
      const candidate = generateMockCandidate({
        skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"],
      });
      const job = generateMockJob({
        requirements: [
          { name: "TypeScript", priority: "must_have" },
          { name: "React", priority: "must_have" },
          { name: "Node.js", priority: "must_have" },
        ],
      });

      const { score, reasons } = calculateRuleBasedScore(candidate, job, 0.9);

      expect(score).toBeGreaterThanOrEqual(70);
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons.some((r) => r.includes("required skills"))).toBe(true);
    });

    it("should penalize missing required skills", () => {
      const candidate = generateMockCandidate({
        skills: ["JavaScript", "HTML", "CSS"],
      });
      const job = generateMockJob({
        requirements: [
          { name: "TypeScript", priority: "must_have" },
          { name: "React", priority: "must_have" },
          { name: "Node.js", priority: "must_have" },
        ],
      });

      const { score, reasons } = calculateRuleBasedScore(candidate, job, 0.5);

      expect(score).toBeLessThan(100);
      expect(reasons.some((r) => r.includes("Missing"))).toBe(true);
    });

    it("should bonus for nice-to-have skills", () => {
      const candidate = generateMockCandidate({
        skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      });
      const job = generateMockJob({
        requirements: [
          { name: "TypeScript", priority: "must_have" },
          { name: "React", priority: "must_have" },
          { name: "PostgreSQL", priority: "nice_to_have" },
          { name: "AWS", priority: "nice_to_have" },
        ],
      });

      const { score, reasons } = calculateRuleBasedScore(candidate, job, 0.8);

      expect(score).toBeGreaterThan(70);
      expect(reasons.some((r) => r.includes("nice-to-have"))).toBe(true);
    });

    it("should penalize missing education", () => {
      const candidate = generateMockCandidate({
        education: [],
      });
      const job = generateMockJob();

      const { score } = calculateRuleBasedScore(candidate, job, 0.7);

      expect(score).toBeLessThan(100);
    });

    it("should penalize missing work experience", () => {
      const candidate = generateMockCandidate({
        work_experience: [],
      });
      const job = generateMockJob();

      const { score } = calculateRuleBasedScore(candidate, job, 0.7);

      expect(score).toBeLessThan(100);
    });

    it("should bonus for category matches", () => {
      const candidate = generateMockCandidate({
        preferred_categories: ["Technology", "Startups"],
      });
      const job = generateMockJob({
        categories: ["Technology", "Software Development"],
      });

      const { score, reasons } = calculateRuleBasedScore(candidate, job, 0.7);

      expect(reasons.some((r) => r.includes("category"))).toBe(true);
    });

    it("should clamp score between 0 and 100", () => {
      const candidate = generateMockCandidate();
      const job = generateMockJob();

      const { score } = calculateRuleBasedScore(candidate, job, 0.5);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should include embedding similarity in score", () => {
      const candidate = generateMockCandidate();
      const job = generateMockJob();

      const { reasons } = calculateRuleBasedScore(candidate, job, 0.85);

      expect(reasons.some((r) => r.includes("Semantic match"))).toBe(true);
    });
  });

  describe("Integration tests", () => {
    it("should differentiate between good and poor matches", () => {
      const goodCandidate = generateMockCandidate({
        skills: [
          "TypeScript",
          "React",
          "Node.js",
          "PostgreSQL",
          "AWS",
          "Docker",
        ],
        preferred_categories: ["Technology", "Startups"],
      });

      const poorCandidate = generateMockCandidate({
        skills: ["HTML", "CSS"],
        work_experience: [],
        education: [],
      });

      const job = generateMockJob({
        requirements: [
          { name: "TypeScript", priority: "must_have" },
          { name: "React", priority: "must_have" },
          { name: "Node.js", priority: "must_have" },
        ],
        categories: ["Technology", "Software Development"],
      });

      const { score: goodScore } = calculateRuleBasedScore(
        goodCandidate,
        job,
        0.85
      );
      const { score: poorScore } = calculateRuleBasedScore(
        poorCandidate,
        job,
        0.3
      );

      expect(goodScore).toBeGreaterThan(poorScore);
    });

    it("should handle cases with no skills on either side", () => {
      const candidate = generateMockCandidate({
        skills: [],
      });
      const job = generateMockJob({
        requirements: [],
      });

      const { score } = calculateRuleBasedScore(candidate, job, 0.7);

      expect(score).toBeDefined();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should generate meaningful match reasons", () => {
      const candidate = generateMockCandidate();
      const job = generateMockJob();

      const { reasons } = calculateRuleBasedScore(candidate, job, 0.75);

      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons.every((r) => typeof r === "string")).toBe(true);
      expect(reasons.every((r) => r.length > 0)).toBe(true);
    });
  });
});
