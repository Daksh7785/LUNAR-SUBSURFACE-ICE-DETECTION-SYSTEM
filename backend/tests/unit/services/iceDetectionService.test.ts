import { describe, it, expect, beforeEach } from 'vitest';
import { IceDetectionService } from '../../../src/services/iceDetectionService';

describe('IceDetectionService', () => {
  let service: IceDetectionService;

  beforeEach(() => {
    service = new IceDetectionService();
  });

  describe('computeCPR', () => {
    it('should compute CPR correctly', () => {
      const SHH = [1, 2, 3];
      const SVV = [1.5, 2.5, 3.5];

      const result = service.computeCPR(SHH, SVV);

      expect(result).toHaveLength(3);
      // (1 - 1.5)^2 / (1 + 1.5)^2 = 0.25 / 6.25 = 0.04
      expect(result[0]).toBeCloseTo(0.04, 2);
    });

    it('should handle zero values', () => {
      const SHH = [0, 1, 2];
      const SVV = [0, 1, 2];

      const result = service.computeCPR(SHH, SVV);

      expect(result[0]).toBeDefined();
      expect(isNaN(result[0])).toBe(false);
    });
  });

  describe('classifyIce', () => {
    it('should classify ice pixels correctly', async () => {
      const features = [[1.2, 0.08, 0.9, -0.5, -15, 0.3, 0.2]];
      
      const result = await service.classifyIce(features);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeGreaterThanOrEqual(0);
      expect(result[0]).toBeLessThanOrEqual(1);
    });

    it('should handle batch predictions', async () => {
      const features = Array(1000).fill([1.2, 0.08, 0.9, -0.5, -15, 0.3, 0.2]);

      const result = await service.classifyIce(features);

      expect(result).toHaveLength(1000);
    });
  });
});
