# Histórico de carga por exercício

## Objetivo
Permitir registrar a carga usada em cada exercício e acompanhar sua evolução sem alterar o plano de treino.

## Implementação
- Adicionar um histórico local, separado por exercício, com data, carga em kg e identificador único.
- Incluir em cada exercício do treino um campo de carga e uma ação para salvar o registro.
- Mostrar a carga mais recente e a variação em relação ao registro anterior.
- No detalhe do exercício, exibir o histórico cronológico em gráfico e uma lista dos registros, com opção de excluir.
- Manter o histórico ligado ao exercício mesmo quando o plano for regenerado ou o exercício for trocado.

## Validação
- Registrar cargas em dois exercícios.
- Confirmar atualização da última carga, variação e gráfico.
- Reabrir a página para confirmar que os dados permanecem salvos.
- Conferir a experiência em tela de celular e computador.

## Fora deste escopo
- Não criar novas animações de exercícios agora.
