# Animações de execução e mais exercícios opcionais

## Objetivo
Adicionar demonstrações em movimento e ampliar as opções de substituição dos 24 exercícios atuais, sem alterar o plano de treino nem misturar os históricos de carga.

## Etapas
1. **Revisar a biblioteca atual**
   - Mapear os exercícios, grupos musculares, equipamentos e alternativas existentes.
   - Identificar os vídeos já disponíveis e os exercícios ainda sem animação.

2. **Adicionar as demonstrações em movimento**
   - Exibir vídeos curtos em loop, automáticos e sem som.
   - Incluir controle acessível de pausar e reproduzir.
   - Respeitar a preferência do aparelho por movimento reduzido.
   - Manter a ilustração estática como alternativa caso o vídeo não carregue.

3. **Completar as animações**
   - Incorporar primeiro os vídeos já disponíveis.
   - Criar as demonstrações restantes no mesmo estilo visual do app.
   - Conferir se cada animação representa execução e postura corretas antes de incorporá-la.

4. **Ampliar as opções de exercícios**
   - Adicionar alternativas com barra, halteres, máquinas, cabos e peso corporal.
   - Incluir nome, equipamento, grupo muscular, instruções, postura e mídia em cada novo exercício.
   - Buscar pelo menos cinco alternativas seguras por exercício quando houver equivalentes adequados.

5. **Melhorar as trocas**
   - Priorizar exercícios do mesmo grupo muscular e padrão de movimento.
   - Informar o equipamento necessário em cada opção.
   - Evitar equivalências com estímulos muito diferentes.
   - Preservar separadamente o histórico de carga de cada exercício.

6. **Validar**
   - Testar reprodução, pausa, imagem alternativa e movimento reduzido.
   - Testar trocas em todos os grupos musculares.
   - Confirmar que regenerar o plano ou trocar exercícios não apaga cargas.
   - Validar em celular e computador, sem erros visíveis.

## Detalhes técnicos
- Criar um componente reutilizável para vídeo, controles e imagem alternativa.
- Adicionar uma referência opcional de mídia animada aos exercícios sem remover as imagens atuais.
- Classificar alternativas por grupo muscular, padrão de movimento e equipamento, em vez de oferecer apenas qualquer exercício do mesmo grupo.
- Manter os identificadores atuais para não romper planos salvos nem históricos de carga.

## Fora do escopo
- Alterar a fórmula que gera o plano de treino.
- Modificar alimentação, metas ou evolução de peso.
- Migrar os dados locais para contas ou armazenamento online.
