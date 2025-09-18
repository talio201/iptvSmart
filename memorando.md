# Memorando: Análise de Migração do Backend para Vercel + Supabase

**Data:** 09/09/2025
**Para:** Interessados no Projeto IPTV
**De:** Gemini
**Assunto:** Análise de viabilidade para migração do backend para uma arquitetura Serverless (Vercel + Supabase)

## 1. Objetivo

Este documento detalha a análise do projeto `iptv-backend` para determinar a viabilidade e os passos necessários para migrá-lo de sua configuração atual (servidor Flask com banco de dados SQLite local) para uma arquitetura serverless utilizando **Vercel** para hospedagem da aplicação e **Supabase** como provedor de banco de dados PostgreSQL.

O objetivo final é ter um backend online, escalável e de baixa manutenção para ser consumido por um aplicativo cliente, como um desenvolvido em Tizen Studio.

## 2. Análise do Backend Atual

- **Tecnologias:** Python, Flask, Flask-SQLAlchemy.
- **Banco de Dados:** SQLite (`app.db`), um banco de dados baseado em arquivo local.
- **Funcionalidade Principal:**
    1.  Atua como um proxy/cache para uma API Xtream.
    2.  Autentica-se no servidor Xtream.
    3.  Sincroniza (copia) dados como categorias, canais, filmes e séries da API Xtream para o banco de dados local (`app.db`).
    4.  Serve os dados cacheados para o frontend, tornando as consultas muito mais rápidas.
    5.  Fornece uma rota de proxy (`/proxy`) para retransmitir streams de vídeo, evitando problemas de CORS no cliente.
- **Processos:** Utiliza `threading` para executar a sincronização de dados em segundo plano (`sync_data`), evitando que a interface do usuário trave durante a autenticação ou atualização manual.

## 3. Avaliação de Compatibilidade com Vercel + Supabase

A migração é **altamente viável**. A arquitetura atual, que já separa o backend do frontend, facilita enormemente o processo. No entanto, algumas adaptações críticas são necessárias.

### 3.1. Banco de Dados (SQLite vs. Supabase)

- **Problema:** O ambiente serverless da Vercel é efêmero. O sistema de arquivos é somente leitura, exceto por uma pasta `/tmp` temporária. Isso significa que o banco de dados `app.db` **não pode ser usado**, pois não persistiria entre as execuções das funções.
- **Solução:** Substituir o SQLite pelo **Supabase**, que oferece bancos de dados PostgreSQL hospedados.
- **Impacto:** Baixo a Médio. A biblioteca `Flask-SQLAlchemy` já abstrai o banco de dados. A principal mudança será na configuração.

### 3.2. Lógica da Aplicação (Flask)

- **Problema:** Nenhum problema fundamental. A Vercel tem suporte nativo para aplicações WSGI como o Flask.
- **Solução:** A estrutura do projeto precisará ser ligeiramente ajustada para que a Vercel possa identificar e construir a aplicação Flask corretamente.
- **Impacto:** Baixo.

### 3.3. Processos em Background (`threading`)

- **Problema:** Funções serverless na Vercel têm um tempo máximo de execução (e.g., 10-60 segundos, dependendo do plano). Processos em `threading` iniciados a partir de uma requisição HTTP não têm garantia de continuar executando após a resposta ser enviada e podem ser terminados abruptamente. A sincronização completa pode levar mais tempo do que o permitido.
- **Solução:**
    1.  **Funções Cron da Vercel:** A melhor abordagem. Configurar um "Cron Job" na Vercel para chamar uma rota de API específica (ex: `/api/iptv/cron_sync`) em intervalos regulares (ex: a cada 24 horas). Isso desacopla a sincronização das interações do usuário.
    2.  **Acionamento Manual:** Manter a rota de sincronização manual, mas ciente de que ela pode sofrer `timeout`. Para o primeiro carregamento de dados, pode ser necessário executá-la algumas vezes ou otimizar a função de `sync`.
- **Impacto:** Médio. Requer uma mudança na forma como a sincronização é acionada.

## 4. Plano de Migração Detalhado

### Fase 1: Configuração e Migração do Banco de Dados (Supabase)

1.  **Criar Projeto no Supabase:** Crie uma nova conta/projeto no [Supabase](https://supabase.com/).
2.  **Obter Connection String:** No painel do seu projeto Supabase, vá para `Project Settings` > `Database` e encontre a "Connection string" no formato `postgresql://...`.
3.  **Adaptar o Código:**
    - No arquivo `iptv-backend/src/main.py`, substitua a configuração do `SQLALCHEMY_DATABASE_URI`:
      ```python
      # Linha antiga
      # app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"

      # Linha nova
      app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
      ```
4.  **Variáveis de Ambiente:** Adicione a `DATABASE_URL` obtida do Supabase às suas variáveis de ambiente locais (`.env`) e, posteriormente, às "Environment Variables" do projeto na Vercel.
5.  **Migração de Dados (Opcional):** Se houver dados importantes no `app.db` local, eles podem ser migrados. O processo geralmente envolve exportar os dados do SQLite para SQL e importá-los para o PostgreSQL, mas para um cache, pode ser mais fácil iniciar com um banco de dados limpo e executar a sincronização.

### Fase 2: Adaptação do Backend para Vercel

1.  **Criar `vercel.json`:** Na raiz do projeto (`D:/PASTA_PROJETOS_ANDAMENTO/MANUS/`), crie um arquivo `vercel.json` para instruir a Vercel sobre como construir o backend:

    ```json
    {
      "builds": [
        {
          "src": "iptv-backend/src/main.py",
          "use": "@vercel/python",
          "config": { "maxLambdaSize": "15mb" }
        }
      ],
      "routes": [
        {
          "src": "/api/(.*)",
          "dest": "iptv-backend/src/main.py"
        }
      ]
    }
    ```

2.  **Mover `requirements.txt`:** Mova o arquivo `iptv-backend/requirements.txt` para a raiz do projeto, pois é onde a Vercel espera encontrá-lo por padrão.

3.  **Adaptar `main.py`:**
    - A Vercel espera uma variável `app` no escopo global do arquivo de entrada. O seu `main.py` já faz isso, então está correto.
    - Remova a seção `if __name__ == '__main__':`, pois a Vercel gerencia o servidor.

4.  **Variáveis de Ambiente:** Configure as credenciais do Xtream (`XTREAM_SERVER_URL`, `XTREAM_USERNAME`, `XTREAM_PASSWORD`) e a `DATABASE_URL` no painel do projeto na Vercel.

### Fase 3: Adaptação do Frontend

1.  **Atualizar URL da API:** No código do seu frontend React, localize onde a URL base da API está definida (provavelmente em um arquivo de configuração ou diretamente nas chamadas `fetch`/`axios`).
2.  Altere a URL de `http://localhost:5000/api` para a URL que a Vercel fornecerá para o seu backend (ex: `https://seu-projeto.vercel.app/api`). É uma boa prática usar uma variável de ambiente para isso (ex: `VITE_API_URL`).

## 5. Riscos e Considerações

- **Timeouts de Funções:** A rota de proxy (`/proxy`) e a sincronização manual podem exceder o tempo limite da função serverless se o stream demorar a responder ou a sincronização for muito longa. A sincronização via Cron Jobs é a mitigação principal para o segundo ponto.
- **Custo:** Vercel e Supabase possuem generosos planos gratuitos, mas o uso intenso (muitas requisições, armazenamento de dados grande, tempo de execução de funções) pode gerar custos.
- **`hls_temp/`:** A pasta `hls_temp` no backend não parece ser utilizada ativamente pelo código fornecido, mas sua existência sugere que pode ter havido planos para manipulação de HLS. Ambientes serverless não são ideais para manipulação de arquivos de vídeo em tempo real ou transcodificação. A rota de proxy atual, que apenas retransmite os dados (`stream_with_context`), é eficiente e compatível.

## 6. Conclusão

A migração do backend para Vercel + Supabase não é apenas **possível**, mas também **recomendada** para o caso de uso descrito. Ela resolve o requisito principal de ter um backend online e oferece benefícios de escalabilidade, baixa manutenção e um fluxo de trabalho de desenvolvimento moderno (CI/CD).

O esforço principal será na reconfiguração do banco de dados e no ajuste da estrutura do projeto para se alinhar com as convenções da Vercel.
