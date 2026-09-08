# Rastreabilidade do MVP

Os anexos foram usados como requisitos de produto e referências visuais. As instruções gerenciais presentes na EAP não representam aprovações, entrevistas ou aceite já realizados.

| EAP       | Entrega implementada                                                            | Verificação                                                          |
| --------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1.3 / 1.4 | Design escuro/laranja, quatro abas, estados vazios, alvos de toque, área segura | TypeScript, jornadas mobile e screenshots                            |
| 1.5       | Busca, catálogo, porções, detalhes, refeições, histórico, códigos de barras     | Testes de regras e jornadas de CRUD/cadastro                         |
| 1.6       | Metas, macros, streak, conquistas, meta semanal                                 | Testes de datas/streak e edição de metas                             |
| 1.7       | Perfil local, lembretes, CSV/JSON, privacidade e assinatura ilustrativa         | Jornadas de perfil/peso; nativo requer aparelho                      |
| 1.8       | Modelo tipado, persistência, serviços e validação                               | Reabertura com persistência, TypeScript                              |
| 1.9       | Testes automatizados, tratamento de erros e controles de dados                  | `npm test`, Playwright e auditoria de dependências                   |
| 1.10      | Configuração de build e documentação                                            | Export web e bundles nativos; assinatura/publicação externa pendente |

## Critérios de aceite

1. Uma refeição salva aparece no diário da data escolhida e altera somente os totais daquela data.
2. Alterar porções recalcula calorias e macros; editar/excluir uma refeição atualiza os indicadores.
3. Reiniciar preserva perfil, refeições, favoritos, metas e medidas.
4. Entradas inválidas não são gravadas; falha de leitura não substitui registros por dados vazios.
5. Busca funciona sem acentos; código desconhecido solicita os valores do rótulo.
6. Gráficos e conquistas se baseiam no histórico real; períodos e dias sem registros são identificados.
7. Exclusão integral exige confirmação na interface e remove os lembretes locais do produto.

## Pendências externas ao código

- Homologação pelo usuário em aparelhos reais, especialmente câmera e notificações.
- Conta/credenciais Expo e Apple para compilação assinada e distribuição nas lojas.
- Entrevistas, aprovação de baseline, aceite do Product Owner e encerramento gerencial: dependem da equipe; não foram inventados ou assinados pelo agente.

Cobrança real, saúde conectada, comunidade, orientação clínica e reconhecimento de refeições por imagem permanecem fora do MVP conforme a EAP.
