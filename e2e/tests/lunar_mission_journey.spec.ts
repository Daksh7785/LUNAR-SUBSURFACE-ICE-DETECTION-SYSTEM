import { test, expect } from '@playwright/test';

test.describe('ISRO LUPEX Complete Enterprise Mission User Journey', () => {
  test('should execute full workflow: login, workspace setup, radar ingestion, AI analysis, and 3D simulation', async ({ page }) => {
    // 1. Navigate to portal and verify title
    await page.goto('/');
    await expect(page).toHaveTitle(/Lunar Subsurface Ice Detection/i);

    // 2. Expert Authentication Flow
    const loginButton = page.getByRole('button', { name: /Mission Clearance Login/i });
    if (await loginButton.isVisible()) {
      await page.getByPlaceholder(/Expert Email/i).fill('mission_control@isro.gov.in');
      await page.getByPlaceholder(/Security Code/i).fill('isro_secure_admin_2026');
      await loginButton.click();
    }

    // Verify Dashboard Loaded
    await expect(page.getByText(/Mission Control Dashboard/i)).toBeVisible({ timeout: 10000 });

    // 3. Project Workspace Creation
    const newProjectBtn = page.getByRole('button', { name: /Initialize New Mission/i });
    if (await newProjectBtn.isVisible()) {
      await newProjectBtn.click();
      await page.getByPlaceholder(/Mission /i).fill('Faustini Crater Ice Survey');
      await page.getByPlaceholder(/Latitude/i).fill('-87.3');
      await page.getByPlaceholder(/Longitude/i).fill('42.1');
      await page.getByRole('button', { name: /Create Workspace/i }).click();
    }

    // 4. Radar Data Ingestion (DFSAR & OHRC)
    await page.getByRole('tab', { name: /Data Ingestion/i }).click();
    await expect(page.getByText(/Upload Chandrayaan-2 DFSAR/i)).toBeVisible();
    
    // Simulate attaching files (using mock upload button trigger)
    const ingestActionBtn = page.getByRole('button', { name: /Process Radar Data Streams/i });
    if (await ingestActionBtn.isVisible()) {
      await ingestActionBtn.click();
    }

    // 5. AI Analysis Polling & Telemetry Inspection
    await page.getByRole('tab', { name: /AI Ice Analysis/i }).click();
    
    // Wait for Celery worker processing completion state
    await expect(page.getByText(/Top 5m Ice Volume/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Average Ice Concentration/i)).toBeVisible();
    await expect(page.getByText(/Detected Ice Area/i)).toBeVisible();

    // Verify exact polarimetric criteria badges are rendered
    await expect(page.getByText(/CPR > 1.0/i)).toBeVisible();
    await expect(page.getByText(/DOP < 0.13/i)).toBeVisible();

    // 6. 3D Simulation Sandbox & Rover Traverse Inspection
    await page.getByRole('tab', { name: /3D Simulation/i }).click();
    await expect(page.getByText(/Candidate Landing Sites/i)).toBeVisible();
    await expect(page.getByText(/Rover Traverse Waypoints/i)).toBeVisible();

    // Take a full page screenshot for visual regression archiving
    await page.screenshot({ path: 'test-results/mission_full_flow_completion.png', fullPage: true });

    // 7. Secure Logout Cleanup
    await page.getByRole('button', { name: /Logout/i }).click();
    await expect(page.getByRole('button', { name: /Mission Clearance Login/i })).toBeVisible();
  });
});
