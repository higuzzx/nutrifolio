import { test, expect } from '@playwright/test';

// A TACO vem do próprio servidor (dados locais), então o resultado é estável.
// Produtos da Open Food Facts dependem da internet e não são verificados aqui.
test('food search uses the TACO table from the local API', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar como convidado' }).click();
  await page
    .getByRole('button', { name: 'Adicionar refeição', exact: true })
    .click();
  await page.getByLabel('Buscar alimento').fill('arroz integral');
  await expect(
    page.getByText('Tabela TACO (Unicamp) · alimentos in natura e preparados'),
  ).toBeVisible();
  await page.getByText('Arroz, integral, cozido', { exact: true }).click();
  await expect(
    page.getByText('Fonte: Tabela TACO (NEPA-Unicamp) · Cereais e derivados'),
  ).toBeVisible();
  await page.getByLabel('Quantidade (g)', { exact: true }).fill('200');
  await page
    .getByRole('button', { name: 'Adicionar à refeição', exact: true })
    .click();
  await expect(page.getByText('248 kcal', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Salvar refeição', exact: true })
    .click();
  await expect(
    page.getByText('Diário alimentar', { exact: true }),
  ).toBeVisible();
});
