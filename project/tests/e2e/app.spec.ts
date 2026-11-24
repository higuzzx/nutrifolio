import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
test('backup download, validation and restoration preserve profile', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar como convidado' }).click();
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Minha conta' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Backup Teste');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await page
    .getByRole('button', { name: 'Configurações e privacidade' })
    .click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Exportar todos os dados (JSON)' })
    .click();
  const download = await downloadPromise;
  const backup = await fs.readFile((await download.path())!, 'utf8');
  expect(JSON.parse(backup).profile.name).toBe('Backup Teste');
  await page.getByLabel('Conteúdo do backup JSON').fill('{"version":1}');
  await page.getByRole('button', { name: 'Verificar e restaurar' }).click();
  await expect(
    page.getByText('Cópia inválida ou incompatível. Nenhum dado foi alterado.'),
  ).toBeVisible();
  await page.getByLabel('Conteúdo do backup JSON').fill(backup);
  await page.getByRole('button', { name: 'Verificar e restaurar' }).click();
  await page.getByRole('button', { name: 'Confirmar restauração' }).click();
  await expect(page.getByText('Backup Teste', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Olá, Backup')).toBeVisible();
});
test('mobile onboarding, meal CRUD, persistence, goals and progress', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar como convidado' }).click();
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Minha conta' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa Teste');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await page.getByRole('tab', { name: 'Início', exact: true }).click();
  await expect(page.getByText('Olá, Pessoa')).toBeVisible();
  await page
    .getByRole('button', { name: 'Adicionar refeição', exact: true })
    .click();
  await page.getByLabel('Buscar alimento').fill('frango');
  await page.getByText('Peito de frango grelhado', { exact: true }).click();
  await page.getByLabel('Quantidade (g)', { exact: true }).fill('150');
  await page
    .getByRole('button', { name: 'Adicionar à refeição', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Salvar refeição', exact: true })
    .click();
  await expect(
    page.getByText('Diário alimentar', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('248 kcal', { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Olá, Pessoa')).toBeVisible();
  await expect(
    page.getByText('248 kcal', { exact: true }).first(),
  ).toBeVisible();
  await page.getByText('Almoço', { exact: true }).click();
  await page.getByLabel('Nome da refeição').fill('Almoço editado');
  await page
    .getByRole('button', { name: 'Salvar refeição', exact: true })
    .click();
  await expect(page.getByText('Almoço editado', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: 'Editar metas' }).click();
  await page.getByLabel('Meta diária (kcal)', { exact: true }).fill('2000');
  await page.getByRole('button', { name: 'Salvar metas' }).click();
  await expect(page.getByText('2.000', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Progresso' }).click();
  await expect(page.getByText('Primeiro passo', { exact: true })).toBeVisible();
  await page.getByText('Peso', { exact: true }).click();
  await page.getByRole('button', { name: 'Registrar peso e medidas' }).click();
  await page.getByLabel('Peso (kg)', { exact: true }).fill('79,2');
  await page.getByLabel('Cintura (cm, opcional)').fill('85');
  await page.getByRole('button', { name: 'Salvar medidas' }).click();
  await expect(
    page.getByText('79.2 kg · 85 cm', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Início', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Fechar', exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByText('Salvo com sucesso', { exact: true }),
  ).not.toBeVisible();
  await page.screenshot({
    path: 'test-results/home-mobile.png',
    fullPage: true,
  });
  await page.getByText('Almoço editado', { exact: true }).click();
  await page
    .getByRole('button', { name: 'Excluir refeição', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(
    page.getByText('Seu diário começa aqui', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('320px layout, invalid form and custom barcode flow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar como convidado' }).click();
  await expect(
    page.getByRole('button', { name: 'Continuar como convidado' }),
  ).not.toBeVisible();
  await expect(page.getByText('Resumo diário', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/home-320.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir scanner' }).click();
  await page.getByLabel('Ou digite o código de barras').fill('7891234567890');
  await page.getByRole('button', { name: 'Buscar código' }).click();
  await page.getByRole('button', { name: 'Salvar alimento' }).click();
  await expect(page.getByText(/Preencha os nutrientes/)).toBeVisible();
  await page
    .getByLabel('Nome do alimento', { exact: true })
    .fill('Iogurte teste');
  await page.getByLabel('Calorias (kcal / 100 g)', { exact: true }).fill('60');
  await page.getByLabel('Proteínas (g / 100 g)', { exact: true }).fill('3');
  await page.getByLabel('Carboidratos (g / 100 g)', { exact: true }).fill('5');
  await page.getByLabel('Gorduras (g / 100 g)', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Salvar alimento' }).click();
  await expect(
    page.getByText('Detalhes do alimento', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Quantidade (g)', { exact: true }).fill('0');
  await page
    .getByRole('button', { name: 'Adicionar à refeição', exact: true })
    .click();
  await expect(page.getByText(/Informe uma quantidade/)).toBeVisible();
  await page.getByLabel('Quantidade (g)', { exact: true }).fill('200');
  await page
    .getByRole('button', { name: 'Adicionar à refeição', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Salvar refeição', exact: true })
    .click();
  await expect(
    page.getByText('120 kcal', { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Abrir scanner' }).click();
  await page.getByLabel('Ou digite o código de barras').fill('7891234567890');
  await page.getByRole('button', { name: 'Buscar código' }).click();
  await expect(
    page.getByText('Detalhes do alimento', { exact: true }),
  ).toBeVisible();
});
