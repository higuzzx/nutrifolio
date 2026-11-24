# Nutrifolio

Aplicativo mobile em React Native e Expo SDK 54, baseado nos protótipos enviados e no MVP da EAP de setembro de 2026. Interface em português, escura e laranja, com navegação inferior e área segura de Android/iOS. A mesma base oferece uma prévia web responsiva.

## Executar no celular

Requer Node.js 22.18+ (ou 24 LTS) e npm.

São dois terminais: um para o servidor (API + banco) e outro para o app.

```powershell
cd C:\nutrifolio\project
npm install
npm run api      # terminal 1: servidor em http://localhost:4000
npm run dev      # terminal 2: app (Expo)
```

O servidor mostra os endereços da rede local ao iniciar. O app encontra o servidor sozinho: no navegador, usa o mesmo computador; no Expo Go, usa o IP do computador que serve o app. Para fixar outro endereço, defina `EXPO_PUBLIC_API_URL=http://IP:4000` antes do `npm run dev`. No Windows, permita o Node.js no firewall da rede privada quando solicitado, para os celulares alcançarem a porta 4000.

Abra o QR code pelo Expo Go compatível com SDK 54, com computador e celular na mesma rede. Para usar uma instalação independente, gere o build de desenvolvimento ou APK abaixo. A disponibilidade da versão SDK 54 no Expo Go depende da plataforma; o build próprio elimina essa dependência.

```powershell
npm run web
npm run android
```

`npm run ios` abre o simulador somente em macOS com Xcode. Windows pode servir o projeto para um iPhone físico ou solicitar builds iOS pelo EAS.

## Funcionalidades

- Boas-vindas, modo convidado e perfil local editável.
- Resumo diário com calorias consumidas, saldo consistente e metas de macros.
- Refeições com categoria/nome, data, horário, alimentos e quantidades em gramas; edição e exclusão com confirmação.
- Busca de alimentos sem distinção de acentos em três fontes: catálogo e alimentos do aparelho, **Tabela TACO** (591 alimentos brasileiros, servidos pela API local) e **Open Food Facts** (produtos industrializados com foto). Favoritos, detalhes nutricionais com a fonte e cadastro manual.
- Leitura de códigos de barras por câmera ou digitação. O app procura primeiro no aparelho e depois na Open Food Facts. Produtos encontrados ficam salvos no aparelho. Produtos desconhecidos abrem o cadastro dos valores do rótulo.
- Diário por data, gráficos em 7/30/90 dias, peso, cintura, metas semanais, streak e conquistas.
- Metas manuais, lembrete local diário com permissão, relatórios CSV e exportação/restauração JSON.
- Exclusão integral dos dados, validação de cópias, mensagens de erro e estados vazios.
- Tipos de refeição personalizados (ex.: Pré-treino), além dos padrões, criados no registro da refeição ou em Perfil → Tipos de refeição.

### Nutricionista e paciente

- **Login com e-mail e senha.** No cadastro, a pessoa escolhe **Sou paciente** (nome, e-mail, CPF e senha) ou **Sou nutricionista** (nome, e-mail, CRN e senha). Também pode continuar como convidada, sem servidor. A senha tem no mínimo 8 caracteres e pode ser trocada no Perfil; a troca encerra as outras sessões.
- **Vínculo por CPF com aceite:** o nutricionista envia o convite pelo CPF; o paciente vê o convite na aba **Dieta** e aceita ou recusa. Nada é compartilhado antes do aceite. O app não informa ao nutricionista se o CPF já tem conta. Qualquer lado pode encerrar o vínculo. Cada paciente tem um nutricionista ativo por vez.
- **Dieta estruturada:** por refeição (tipos padrão ou criados na hora), horário, alimentos com gramas (calorias e macros calculados), substituições e observações, além de orientações gerais.
- **Paciente:** a aba Dieta mostra o plano, o progresso do dia e o botão **Registrar esta refeição**, que abre o registro já preenchido. Também é possível usar os totais da dieta como metas diárias.
- **Acompanhamento:** o nutricionista vê a adesão dos últimos 7 dias, as refeições do plano feitas hoje, as calorias consumidas comparadas com as do plano, os registros recentes e o último peso. Uma refeição conta como seguida quando o paciente registra uma refeição com o mesmo nome no mesmo dia.

Os dados começam vazios, são gravados com AsyncStorage e permanecem após fechar o aplicativo. Cada conta tem seu próprio diário no aparelho. O convidado usa o armazenamento original, então quem já usava o app continua com os mesmos dados. Ao criar uma conta de paciente, os registros feitos como convidado são copiados para ela.

**Servidor (`server/`):** API HTTP em Node.js com banco SQLite (`node:sqlite`, sem dependências extras), gravado em `server/nutrifolio.db`. Para começar do zero, pare o servidor e apague esse arquivo. As senhas são armazenadas com hash scrypt e salt. A sessão usa um token aleatório válido por 30 dias, guardado no servidor apenas como hash SHA-256. Após 5 tentativas erradas, o login fica bloqueado por 15 minutos. **As regras de acesso ficam no servidor:** o nutricionista só lê o diário (refeições, medidas e metas) e só publica dieta para pacientes com vínculo ativo; convites pendentes não dão acesso; o nome do paciente só aparece após o aceite. O paciente envia o diário completo ao servidor a cada alteração, então ao entrar em outro aparelho os registros são restaurados. Sem servidor, as alterações ficam salvas no aparelho e são reenviadas na próxima abertura.

A tela de assinatura informa que o MVP é gratuito e não executa cobranças, conforme a EAP.

No navegador, exportações baixam arquivos. No Android/iOS, abrem o compartilhamento do sistema com o conteúdo do relatório/cópia. Restaure uma cópia colando o JSON em Configurações. A cópia não altera o agendamento de notificações do aparelho de destino.

## Builds

```powershell
npm run build:web
npx expo export --platform android --platform ios --output-dir dist-native
```

Esses comandos geram os bundles; não geram APK/IPA assinados. `eas.json` prepara os perfis para um instalável:

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile production
```

Os builds EAS exigem conta Expo, vínculo do projeto e, para distribuição iOS, credenciais Apple. Identificadores sugeridos: `com.dnatechnology.nutrifolio`; confirme a titularidade antes de publicar. Não foi feita publicação nas lojas.

## Verificação

```powershell
npm run typecheck
npm test
npm run build:web
python -m http.server 8081 --bind 127.0.0.1 --directory dist
npx playwright test
```

Execute o servidor estático em outro terminal antes do Playwright. O próprio Playwright sobe a API com banco em memória (`webServer` em `playwright.config.ts`). Os testes usam Edge em modo headless, isolado, com dados fictícios e viewports de 320 e 390 pixels. Relatório em `playwright-report/index.html`. Testes de regras cobrem porções, totais por data, calendário e streak.

## Estrutura

- `app/index.tsx`: navegação, telas e formulários.
- `src/ui.tsx`: componentes visuais e gráficos SVG.
- `src/model.ts`: tipos, catálogo e regras puras.
- `src/storage.ts`: leitura validada e fila de gravações.
- `src/validation.ts`: contrato de dados persistidos e backups.
- `src/export.ts`: download web e compartilhamento nativo.
- `src/backend.ts`: cliente da API (login, sessão, vínculos, dietas, diário compartilhado e busca de alimentos).
- `src/foodSearch.tsx`: busca e exibição de alimentos da TACO e da Open Food Facts.
- `src/password.tsx`: troca de senha.
- `server/index.mjs`: API, banco SQLite, autenticação e regras de acesso.
- `server/foods.mjs` e `server/data/taco.json`: busca na TACO e consulta à Open Food Facts com cache (`scripts/build-taco.py` gera o JSON).
- `src/welcome.tsx`: boas-vindas, criação de conta e escolha de perfil.
- `src/nutritionist.tsx`: app do nutricionista (pacientes, convites, ficha, editor de dieta).
- `tests/`: regras e jornadas de interface.
- `docs/`: materiais originais e rastreabilidade do escopo.

## Limites e homologação

Valores do catálogo inicial são médias aproximadas por 100 g. A TACO é a referência brasileira de composição de alimentos. Os dados da Open Food Facts são colaborativos, vêm do rótulo e podem conter erros ou estar incompletos. Metas não são prescrição de dieta. O saldo do período usa a meta atual e apenas dias registrados, não estima gasto energético. Gráficos não preenchem dados fictícios.

É necessário homologar câmera, permissão negada, entrega dos lembretes em segundo plano, teclado e área segura em aparelhos físicos Android e iOS. O ambiente usado nesta entrega verifica bundles nativos e interface web mobile, sem substituir essa homologação.

CPF e registros alimentares são dados pessoais, e os registros alimentares são dados de saúde (dados sensíveis pela LGPD). O servidor local usa HTTP sem criptografia e serve para uso acadêmico na rede local. Antes de publicar, use HTTPS e defina consentimento, política de privacidade, criptografia em trânsito e em repouso, e retenção e exclusão dos dados compartilhados. A dieta é prescrita pelo nutricionista. O aplicativo só apresenta o plano e não gera recomendações.

Os dados locais dependem da proteção do aparelho; AsyncStorage não oferece criptografia própria. Limpar dados ou desinstalar pode removê-los. Exporte uma cópia antes. Nenhuma telemetria de produto ou envio de registros foi implementado.

As correções compatíveis de dependências foram aplicadas. A árvore do Expo SDK 54 ainda contém alertas transitivos no `npm audit`, sem alertas críticos na última análise. Uma migração do SDK requer validação dedicada; não use `npm audit fix --force` indiscriminadamente.

## Fontes de dados e créditos

- **TACO – Tabela Brasileira de Composição de Alimentos**, 4ª edição revisada e ampliada. NEPA-UNICAMP, Campinas, 2011. A reprodução é permitida com citação da fonte. Os CSVs normalizados vêm de [raulfdm/taco-api](https://github.com/raulfdm/taco-api) e foram convertidos por `scripts/build-taco.py`. Valores vazios na tabela (traços ou não analisados) foram tratados como 0, e itens sem energia foram descartados.
- **Open Food Facts** ([openfoodfacts.org](https://world.openfoodfacts.org)): dados sob licença Open Database License (ODbL) e imagens sob CC BY-SA. A API é pública e sem chave. A busca tem limite de 10 requisições por minuto, respeitado pelo servidor, e as respostas ficam em cache por 7 dias. Para identificar o app junto à Open Food Facts, defina `OFF_USER_AGENT="Nutrifolio/1.1 (seu-email@exemplo.com)"`.
