# Nutrifolio

Aplicativo mobile em React Native e Expo SDK 54, baseado nos protótipos enviados e no MVP da EAP de setembro de 2026. Interface em português, escura e laranja, com navegação inferior e área segura de Android/iOS. A mesma base oferece uma prévia web responsiva.

## Executar no celular

Requer Node.js 22.18+ (ou 24 LTS) e npm.

```powershell
cd C:\nutrifolio\project
npm install
npm run dev
```

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
- Catálogo local, busca sem distinção de acentos, favoritos, detalhes nutricionais e cadastro de alimentos.
- Leitura de códigos de barras por câmera ou digitação. Produtos desconhecidos abrem o cadastro dos valores do rótulo; não há consulta a banco externo.
- Diário por data, gráficos em 7/30/90 dias, peso, cintura, metas semanais, streak e conquistas.
- Metas manuais, lembrete local diário com permissão, relatórios CSV e exportação/restauração JSON.
- Exclusão integral dos dados, validação de cópias, mensagens de erro e estados vazios.

Os dados começam vazios, são gravados com AsyncStorage e permanecem após fechar o aplicativo. Não há servidor, conta remota, autenticação por senha ou sincronização. O e-mail opcional é apenas um campo do perfil. A tela de assinatura informa que o MVP é gratuito e não executa cobranças, conforme a EAP.

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

Execute o servidor em outro terminal antes do Playwright. Os testes usam Edge em modo headless, isolado, com dados fictícios e viewports de 320 e 390 pixels. Relatório em `playwright-report/index.html`. Testes de regras cobrem porções, totais por data, calendário e streak.

## Estrutura

- `app/index.tsx`: navegação, telas e formulários.
- `src/ui.tsx`: componentes visuais e gráficos SVG.
- `src/model.ts`: tipos, catálogo e regras puras.
- `src/storage.ts`: leitura validada e fila de gravações.
- `src/validation.ts`: contrato de dados persistidos e backups.
- `src/export.ts`: download web e compartilhamento nativo.
- `tests/`: regras e jornadas de interface.
- `docs/`: materiais originais e rastreabilidade do escopo.

## Limites e homologação

Valores do catálogo são médias aproximadas por 100 g, não uma base nutricional certificada. Metas não são prescrição de dieta. O saldo do período usa a meta atual e apenas dias registrados, não estima gasto energético. Gráficos não preenchem dados fictícios.

É necessário homologar câmera, permissão negada, entrega dos lembretes em segundo plano, teclado e área segura em aparelhos físicos Android e iOS. O ambiente usado nesta entrega verifica bundles nativos e interface web mobile, sem substituir essa homologação.

Os dados locais dependem da proteção do aparelho; AsyncStorage não oferece criptografia própria. Limpar dados ou desinstalar pode removê-los. Exporte uma cópia antes. Nenhuma telemetria de produto ou envio de registros foi implementado.

As correções compatíveis de dependências foram aplicadas. A árvore do Expo SDK 54 ainda contém alertas transitivos no `npm audit`, sem alertas críticos na última análise. Uma migração do SDK requer validação dedicada; não use `npm audit fix --force` indiscriminadamente.
