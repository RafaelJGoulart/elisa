# Skill — Executar e diagnosticar o launcher desktop

## Pré-requisitos

1. Ambiente virtual e dependências:
   `.\.venv\Scripts\python.exe -m pip install -r backend\requirements-desktop.txt`
2. Banco migrado a partir de `backend/`:
   `..\.venv\Scripts\flask.exe --app run db upgrade`
3. Build do frontend:
   `cd frontend; npm run build`

O launcher exige WebView2 no Windows. Ele usa `pywebview` apenas para a janela de controle e Waitress para o servidor local. Não substitui o fluxo de desenvolvimento com Vite.

## Executar

Na raiz, com console para diagnóstico:

```powershell
.\.venv\Scripts\python.exe elisa_desktop.py
```

Ou com duplo clique em `iniciar_elisa.cmd`. O atalho gera `frontend/dist` apenas quando o build estiver ausente e abre a janela sem console.

Opções:

```powershell
.\.venv\Scripts\python.exe elisa_desktop.py --port 5050
.\.venv\Scripts\python.exe elisa_desktop.py --debug
```

`--debug` abre as ferramentas do webview, não o modo debug do Flask.

## Ciclo de vida

1. A janela de controle abre e consulta o estado do serviço.
2. O launcher carrega `.env`, verifica se já existe uma instância, valida o build e o esquema do banco.
3. Se a porta estiver livre, cria a app factory e inicia o Waitress em `127.0.0.1`, na porta configurada.
4. O estado real muda de **iniciando** para **em execução**; **Abrir Elisa** abre `http://127.0.0.1:<porta>` no navegador padrão.
5. **Encerrar Elisa** ou fechar a janela para somente o servidor iniciado pelo launcher.

`FLASK_HOST` não é usado no modo desktop; o launcher permanece em loopback. Não o exponha na rede.

## Instância externa

Se já existir uma Elisa em execução no endereço, a janela mostra **instância externa**, permite abrir a aplicação e não encerra esse processo. Nesse estado, o botão apenas fecha o launcher. O launcher nunca encerra processos que não iniciou.

## Diagnóstico

- Log: `data/elisa-desktop.log` (ignorado pelo Git).
- Porta ocupada: use `--port` ou ajuste `FLASK_PORT`.
- Build ausente: execute `npm run build` em `frontend/`.
- Banco sem esquema: aplique as migrações em `backend/`.
- `pywebview` ou `waitress` ausente: instale `backend/requirements-desktop.txt`.
- WebView2 ausente no Windows: instale o runtime oficial da Microsoft.

Não coloque regra de negócio no launcher e não carregue a interface React dentro dele. A aplicação principal continua no navegador.
