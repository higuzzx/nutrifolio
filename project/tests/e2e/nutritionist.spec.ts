import { test, expect, Page } from '@playwright/test';

// Requer a API local (o Playwright sobe com banco em memória). E-mails e CPF
// são gerados por execução para não colidir com dados de execuções anteriores.
function randomCpf() {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (const len of [9, 10]) {
    const sum = d.reduce((a, n, i) => a + n * (len + 1 - i), 0);
    const r = (sum * 10) % 11;
    d.push(r === 10 ? 0 : r);
  }
  return d.join('');
}
const run = Date.now().toString(36);
const CPF = randomCpf();
const masked = `***.${CPF.slice(3, 6)}.${CPF.slice(6, 9)}-**`;
const PATIENT = { email: `ana-${run}@teste.com`, password: 'senha-ana-123' };
const NUTRI = { email: `bruno-${run}@teste.com`, password: 'senha-bruno-123' };

async function logout(page: Page) {
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await page.getByText('Sair da conta', { exact: true }).click();
}
async function login(page: Page, who: { email: string; password: string }) {
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('E-mail').fill(who.email);
  await page.getByLabel('Senha', { exact: true }).fill(who.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
async function switchTo(page: Page, who: { email: string; password: string }) {
  await logout(page);
  await login(page, who);
}

test('login, CPF invite with consent, diet-driven logging and adherence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');

  // Paciente cria conta com e-mail, CPF e senha.
  await page.getByText('Sou paciente', { exact: true }).click();
  await page.getByLabel('Nome completo').fill('Ana Paciente');
  await page.getByLabel('E-mail').fill(PATIENT.email);
  await page.getByLabel('CPF').fill('52998224724');
  await page.getByLabel('Senha (mínimo 8 caracteres)').fill(PATIENT.password);
  await page.getByLabel('Confirmar senha').fill('outra-senha');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('As senhas não conferem.')).toBeVisible();
  await page.getByLabel('Confirmar senha').fill(PATIENT.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Informe um CPF válido.')).toBeVisible();
  await page.getByLabel('CPF').fill(CPF);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Olá, Ana')).toBeVisible();

  // Tipo de refeição personalizado.
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Tipos de refeição' }).click();
  await page.getByLabel('Novo tipo de refeição').fill('Pré-treino');
  await page.getByRole('button', { name: 'Criar tipo' }).click();
  await expect(page.getByLabel('Excluir tipo Pré-treino')).toBeVisible();
  await page.getByLabel('Fechar').click();

  // Nutricionista cria conta e convida pelo CPF.
  await logout(page);
  await page.getByText('Sou nutricionista', { exact: true }).click();
  await page.getByLabel('Nome completo').fill('Bruno Nutri');
  await page.getByLabel('E-mail').fill(NUTRI.email);
  await page.getByLabel('CRN').fill('CRN-3 12345');
  await page.getByLabel('Senha (mínimo 8 caracteres)').fill(NUTRI.password);
  await page.getByLabel('Confirmar senha').fill(NUTRI.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Olá, Bruno')).toBeVisible();
  await page.getByText('＋ Vincular').click();
  await page.getByLabel('CPF do paciente').fill(CPF);
  await page.getByRole('button', { name: 'Enviar convite' }).click();
  await expect(page.getByText(`CPF ${masked}`)).toBeVisible();

  // Senha errada é recusada; a certa entra.
  await logout(page);
  await login(page, { ...PATIENT, password: 'senha-errada' });
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
  await page.getByLabel('Senha', { exact: true }).fill(PATIENT.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  // Paciente aceita o convite.
  await page.getByRole('tab', { name: 'Dieta', exact: true }).click();
  await expect(page.getByText('Convite de acompanhamento')).toBeVisible();
  await page.getByRole('button', { name: 'Aceitar' }).click();
  await expect(page.getByText('Dieta em preparação')).toBeVisible();

  // Nutricionista monta a dieta com um tipo próprio.
  await switchTo(page, NUTRI);
  await page.getByText('Ana Paciente', { exact: true }).click();
  await page.getByRole('button', { name: 'Criar dieta' }).click();
  await page.getByText('＋ Almoço', { exact: true }).click();
  await page.getByText('Adicionar alimento', { exact: true }).click();
  await page.getByLabel('Buscar alimento').fill('frango');
  await page.getByText('Peito de frango grelhado', { exact: true }).click();
  await page.getByLabel('Quantidade (g)').fill('150');
  await page.getByRole('button', { name: 'Adicionar à refeição' }).click();
  await page.getByLabel('Novo tipo de refeição').fill('Pós-treino');
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar dieta' }).click();
  await expect(
    page.getByText(/Pós-treino.*pelo menos um alimento/),
  ).toBeVisible();
  await page.getByText('Adicionar alimento', { exact: true }).nth(1).click();
  await page.getByText('Banana prata', { exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar à refeição' }).click();
  await page
    .getByLabel('Substituições (opcional)')
    .first()
    .fill('Frango ↔ peixe branco');
  await page.getByRole('button', { name: 'Publicar dieta' }).click();
  await expect(page.getByText('Dieta publicada para o paciente')).toBeVisible();
  await expect(page.getByText(/2 refeições · 346 kcal/)).toBeVisible();
  await page.getByLabel('Fechar').click();

  // Paciente registra o almoço direto da dieta.
  await switchTo(page, PATIENT);
  await page.getByRole('tab', { name: 'Dieta', exact: true }).click();
  await expect(
    page.getByText('Substituições: Frango ↔ peixe branco'),
  ).toBeVisible();
  await expect(
    page.getByText('Hoje: 0 de 2 refeições registradas'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Registrar esta refeição' })
    .first()
    .click();
  await expect(page.getByLabel('Nome da refeição')).toHaveValue('Almoço');
  await expect(page.getByText('Pré-treino', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Pós-treino', { exact: true }).last(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Salvar refeição', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Dieta', exact: true }).click();
  await expect(
    page.getByText('Hoje: 1 de 2 refeições registradas'),
  ).toBeVisible();

  // Nutricionista vê a adesão (dados vindos do servidor).
  await switchTo(page, NUTRI);
  await expect(page.getByText('Hoje: 1/2 refeições do plano')).toBeVisible();
  await page.getByText('Ana Paciente', { exact: true }).click();
  await expect(page.getByText(/Consumido: 248 de 346 kcal/)).toBeVisible();
  await page.getByLabel('Fechar').click();

  // "Outro aparelho": sem armazenamento local, o login restaura o diário.
  await logout(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await login(page, PATIENT);
  await expect(
    page.getByText('248 kcal', { exact: true }).first(),
  ).toBeVisible();

  // A sessão sobrevive ao recarregar a página.
  await page.reload();
  await expect(page.getByText('Olá, Ana')).toBeVisible();

  // Paciente desvincula: nutricionista perde o acesso.
  await page.getByRole('tab', { name: 'Dieta', exact: true }).click();
  await page.getByRole('button', { name: 'Desvincular nutricionista' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Nenhum nutricionista vinculado')).toBeVisible();
  await switchTo(page, NUTRI);
  await expect(page.getByText('Nenhum paciente ainda')).toBeVisible();
  expect(errors).toEqual([]);
});
