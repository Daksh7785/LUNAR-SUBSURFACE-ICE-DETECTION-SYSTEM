export class IceDetectionService {
  /**
   * Computes the Circular Polarization Ratio (CPR) from Horizontal and Vertical backscatter values.
   * CPR = (SHH - SVV)^2 / (SHH + SVV)^2 (simplified representation for unit test validation)
   */
  public computeCPR(SHH: number[], SVV: number[]): number[] {
    if (SHH.length !== SVV.length) {
      throw new Error('Input arrays must have the same length');
    }

    return SHH.map((hh, i) => {
      const vv = SVV[i];
      if (hh === 0 && vv === 0) return 0;
      const num = Math.pow(hh - vv, 2);
      const den = Math.pow(hh + vv, 2);
      return den === 0 ? 0 : num / den;
    });
  }

  /**
   * Mock classification of ice probability based on polarimetric feature arrays
   * Features: [CPR, DOP, m-chi, slope, temp_max, roughness, albedo]
   */
  public async classifyIce(features: number[][]): Promise<number[]> {
    return features.map(f => {
      const cpr = f[0];
      const dop = f[1];
      const tempMax = f[4];

      // Ice condition: CPR > 1.0, DOP < 0.15, Temp < -100C (or scaled representation)
      let score = 0.1;
      if (cpr > 1.0) score += 0.4;
      if (dop < 0.15) score += 0.3;
      if (tempMax < -10) score += 0.2;

      return Math.min(Math.max(score, 0), 1);
    });
  }
}
