# Demonstrações em movimento e evolução de cargas

## Resultado
- Trocar as imagens estáticas dos exercícios por demonstrações curtas em loop, mantendo o estilo visual atual e permitindo pausar/reproduzir.
- Permitir informar a carga usada em cada exercício durante o treino.
- Salvar cada registro com exercício, data e carga, preservando o histórico mesmo quando o plano for regenerado.
- Mostrar no próprio exercício a última carga, a variação desde o registro anterior e um atalho para ver a evolução.
- Exibir um gráfico do histórico de carga por exercício, com opção de excluir um registro incorreto.

## Experiência
- Os movimentos serão reproduzidos automaticamente sem som; em aparelhos com economia de movimento, ficarão pausados até a pessoa iniciar.
- Exercícios de peso corporal aceitarão carga opcional, inclusive `0 kg`.
- Ao concluir o treino, as cargas preenchidas serão registradas juntas e os campos permanecerão prontos para a próxima sessão.
- A troca de exercício não mistura históricos: cada movimento mantém sua própria evolução.

## Detalhes técnicos
- Adicionar um registro local de cargas por exercício ao armazenamento já usado pelo app.
- Criar componentes reutilizáveis para a demonstração animada e o histórico de carga.
- Gerar e incorporar demonstrações em loop para a biblioteca atual de 24 exercícios.
- Atualizar a tela de treinos e o resumo inicial sem alterar a lógica de geração do plano.
- Validar o fluxo em telas de celular e computador e conferir reprodução, salvamento e gráfico.
