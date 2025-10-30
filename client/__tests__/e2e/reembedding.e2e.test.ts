/**
 * E2E tests for reembedding workflow
 */

import { test, expect } from "@playwright/test";

test.describe("Reembedding Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the single-cell explorer
    // This assumes a test dataset is available
    await page.goto("/");
    
    // Wait for the application to load
    await expect(page.locator('[data-testid="graph"]')).toBeVisible({ timeout: 10000 });
  });

  test("should display reembedding button in menu bar", async ({ page }) => {
    // Check that the reembedding button is present in the menu bar
    await expect(page.locator('[data-testid="reembedding-options"]')).toBeVisible();
  });

  test("should open reembedding dialog when button is clicked", async ({ page }) => {
    // Click the reembedding button
    await page.click('[data-testid="reembedding-options"]');
    
    // Verify the dialog opens
    await expect(page.locator('.bp3-dialog')).toBeVisible();
    await expect(page.getByText('Preprocessing')).toBeVisible();
    await expect(page.getByText('Reembedding')).toBeVisible();
  });

  test("should switch between preprocessing and reembedding tabs", async ({ page }) => {
    // Open reembedding dialog
    await page.click('[data-testid="reembedding-options"]');
    
    // Should start on preprocessing tab
    await expect(page.getByRole('button', { name: 'Preprocessing' })).toHaveClass(/bp3-intent-primary/);
    
    // Click reembedding tab
    await page.click('text=Reembedding');
    
    // Should switch to reembedding tab
    await expect(page.getByRole('button', { name: 'Reembedding' })).toHaveClass(/bp3-intent-primary/);
  });

  test("should show preprocessing parameters", async ({ page }) => {
    // Open reembedding dialog
    await page.click('[data-testid="reembedding-options"]');
    
    // Check that preprocessing parameters are visible
    await expect(page.getByText('Cell and Gene Filtering')).toBeVisible();
    await expect(page.getByText('Highly Variable Genes')).toBeVisible();
    await expect(page.getByText('Normalization')).toBeVisible();
    await expect(page.getByText('Batch Preprocessing')).toBeVisible();
  });

  test("should show dimensionality reduction parameters", async ({ page }) => {
    // Open reembedding dialog
    await page.click('[data-testid="reembedding-options"]');
    
    // Click reembedding tab
    await page.click('text=Reembedding');
    
    // Check that dimensionality reduction parameters are visible
    await expect(page.getByText('Embedding Name')).toBeVisible();
    await expect(page.getByText('Embedding Mode')).toBeVisible();
    await expect(page.getByText('Principal Component Analysis')).toBeVisible();
    await expect(page.getByText('Neighbors')).toBeVisible();
    await expect(page.getByText('UMAP')).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    // Open reembedding dialog
    await page.click('[data-testid="reembedding-options"]');
    
    // Go to reembedding tab
    await page.click('text=Reembedding');
    
    // The run button should be enabled by default (with default parameters)
    const runButton = page.getByRole('button', { name: /Preprocess and run/i });
    await expect(runButton).toBeEnabled();
    
    // Change embedding mode to "Run UMAP" which requires latent space
    await page.selectOption('#embeddingMode', 'Run UMAP');
    
    // Run button should be disabled when latent space is not selected
    await expect(runButton).toBeDisabled();
  });

  test("should update parameter values", async ({ page }) => {
    // Open reembedding dialog
    await page.click('[data-testid="reembedding-options"]');
    
    // Change a preprocessing parameter
    await page.fill('#minCountsCF', '100');
    
    // Go to reembedding tab
    await page.click('text=Reembedding');
    
    // Enter embedding name
    await page.fill('#embName', 'test-embedding');
    
    // Change number of PCs
    await page.fill('#numPCs', '30');
    
    // Verify values are updated
    expect(await page.inputValue('#embName')).toBe('test-embedding');
    expect(await page.inputValue('#numPCs')).toBe('30');
  });

  test("should close dialog when close button is clicked", async ({ page }) => {
    // Open reembedding dialog
    await page.click('[data-testid="reembedding-options"]');
    
    // Click close button
    await page.click('text=Close');
    
    // Dialog should be closed
    await expect(page.locator('.bp3-dialog')).not.toBeVisible();
  });

  test.skip("should execute reembedding workflow", async ({ page }) => {
    // This test is skipped because it requires a full backend implementation
    // In a real implementation, this would:
    // 1. Open reembedding dialog
    // 2. Configure parameters
    // 3. Click run button
    // 4. Wait for completion
    // 5. Verify new embedding appears in embedding selector
    // 6. Verify graph updates with new embedding
    
    await page.click('[data-testid="reembedding-options"]');
    await page.click('text=Reembedding');
    await page.fill('#embName', 'e2e-test-embedding');
    await page.click('text=Preprocess and run');
    
    // Would need to wait for actual processing...
    // await expect(page.getByText('e2e-test-embedding')).toBeVisible();
  });
});