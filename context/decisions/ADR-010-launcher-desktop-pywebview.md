# ADR-010 — Launcher desktop local com pywebview

- Data: 2026-10-21
- Status: Aceita

## Contexto

A Elisa é uma aplicação local-first com frontend React e backend Flask. O uso diário pelo navegador funciona, mas exige iniciar o servidor, abrir uma aba e lembrar de encerrá-lo. Uma janela pequena de controle pode tornar esse ciclo mais previsível.

## Problema

Como iniciar, monitorar e encerrar o servidor local em uma janela desktop, exibir o endereço da aplicação e permitir abri-la no navegador, sem migrar a interface React para uma janela nativa nem duplicar a aplicação?

## Alternativas consideradas

1. Manter apenas o navegador e um script de inicialização.
2. Criar um aplicativo Electron ou Tauri, adicionando outro runtime e processo de build.
3. Usar pywebview somente como janela de controle do servidor local.
4. Embutir o frontend React dentro do pywebview.
5. Empacotar tudo em um executável com PyInstaller nesta etapa.

## Decisão

- Criar `elisa_desktop.py` como launcher desktop.
- Usar `pywebview` 6.2.1 somente para a janela pequena de controle. **A interface React não é carregada, reescrita, migrada ou incorporada ao pywebview.**
- Servir a aplicação no navegador, a partir do endereço local, como no uso atual.
- Usar `waitress` 3.0.2 como servidor WSGI local em uma thread, sempre em `127.0.0.1`; o launcher não usa o modo debug do Flask.
- Servir o build existente de `frontend/dist` pelo Flask. O launcher não inicia Vite automaticamente; o fluxo de desenvolvimento com Vite continua separado.
- Exibir na janela de controle: identificação da Elisa, estado real do serviço, endereço local, **Abrir Elisa** e **Encerrar Elisa**.
- Encerrar somente o servidor pertencente ao launcher quando o botão for acionado ou a janela for fechada.
- Detectar uma instância externa já ativa e não encerrá-la; nesse caso, o launcher permite abrir a aplicação e fechar apenas a si mesmo.
- Oferecer `iniciar_elisa.cmd` para gerar o build ausente e abrir o launcher sem console.
- Manter as migrações explícitas: o launcher recusa iniciar se o banco ainda não foi preparado e informa o comando necessário.
- Registrar falhas em `data/elisa-desktop.log`, sem expor segredos.

## Justificativa

- Preserva integralmente React, TypeScript, Vite, Tailwind, shadcn/ui, Flask e os contratos existentes.
- Evita Electron, Tauri e a duplicação de uma segunda interface.
- A janela de controle não compete com a aplicação principal nem vira uma nova UI de negócio.
- O servidor roda no próprio processo do launcher, sem processos filhos que possam ficar órfãos.
- A instância externa é tratada com segurança: o launcher nunca encerra um processo que não iniciou.
- A dependência é opcional; backend, testes e uso pelo navegador continuam funcionando sem ela.

## Consequências e limitações

- A aplicação principal continua sendo acessada no navegador; o launcher não é a interface da Elisa.
- No Windows, o launcher depende do runtime WebView2 e de `pywebview`.
- O servidor usa Waitress em loopback. Ele não deve ser exposto à rede sem autenticação e uma revisão de segurança.
- O endereço é fixo em loopback; `FLASK_HOST` não é usado para expor o launcher.
- O build do frontend precisa existir. `iniciar_elisa.cmd` o gera somente quando ausente; após alterações no frontend, execute `npm run build`.
- O fluxo de desenvolvimento com Vite continua manual e separado; o launcher não gerencia o Vite.
- Não há instalador ou executável independente nesta etapa; `iniciar_elisa.cmd` depende do ambiente virtual do projeto.
- O banco não é migrado automaticamente.
- O launcher não encerra instâncias externas, mesmo que estejam usando a mesma porta.
- Logs operacionais ficam em `data/elisa-desktop.log`, ignorado pelo Git.

## Regra para futuras alterações

PyWebView é exclusivamente o launcher e controlador do servidor. Não mova a interface da Elisa para ele, não recrie telas em HTML/CSS/JS paralelos e não altere a arquitetura React/Flask para fazer a aplicação inteira rodar dentro de uma janela nativa.
