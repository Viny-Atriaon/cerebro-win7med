# CORREÇÕES — Cérebro Win7 Med
> Registro de bugs não-triviais (glossário da Constituição). O código corrigido REFERENCIA
> a entrada (`// ver docs/CORRECOES.md#NN`). Sessão futura que achar o código "estranho"
> lê aqui ANTES de "melhorar": o estranho pode ser a correção.

## 01 · Impressão do diagnóstico sem as cores de fundo (14/10/2026)
- **Sintoma:** ao imprimir ou salvar o diagnóstico em PDF, o placar, o fechamento e os cabeçalhos de tabela saíam sem o fundo escuro.
- **Causa:** em `motor1-diagnostico/motor/laudo.css`, dentro de `@media print`, a regra `.placar, .fechamento, ...` tinha perdido o bloco de declarações (terminava em `, }`). O navegador descartava a regra.
- **Correção:** a regra voltou com `-webkit-print-color-adjust: exact; print-color-adjust: exact;`. No mesmo bloco entraram as regras do Mapa do Onboarding em PDF (`.mapa-doc`): seções fluem, cartões não se partem.
- **Não fazer:** trocar `print-color-adjust` por cores fixas no HTML; a cor vetada pelo cliente é trocada no CSS.
