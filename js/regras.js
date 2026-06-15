function openRegrasModal() {
  let overlay = document.getElementById('regras-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'regras-modal';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2000;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width:620px;width:100%;max-height:88vh;overflow-y:auto">
        <h3 style="color:var(--verde);font-size:1.3rem">📋 Regras do Bolão Copa Amigos da URI</h3>

        <section class="regras-section">
          <h4>Como participar</h4>
          <ol>
            <li>Cadastre-se no site com seu nome e uma senha e aguarde a aprovação do administrador.</li>
            <li>Efetue o pagamento de <strong>R$ 30,00</strong> via Pix para a chave <strong>[CHAVE PIX]</strong> e envie o comprovante no grupo do WhatsApp.</li>
            <li>Entre no grupo do WhatsApp pelo link: <strong>[LINK DO GRUPO]</strong></li>
            <li>Após confirmação do pagamento, sua conta será aprovada e você poderá fazer seus palpites.</li>
          </ol>
        </section>

        <section class="regras-section">
          <h4>Quais jogos entram no bolão?</h4>
          <p>O bolão vale a partir da <strong>segunda fase da Copa do Mundo 2026</strong> (rodada de 32 — fase eliminatória). Os jogos da fase de grupos <strong>não</strong> entram na pontuação. O administrador cadastra os jogos manualmente.</p>
        </section>

        <section class="regras-section">
          <h4>Como fazer palpites</h4>
          <ul>
            <li>Acesse a aba <strong>Apostas</strong> e informe o placar que você acha que vai sair em cada jogo.</li>
            <li>Você pode alterar seu palpite a qualquer momento <strong>até o prazo de apostas do jogo encerrar</strong> (normalmente o horário de início da partida).</li>
            <li>Escolha também o seu <strong>palpite de campeão</strong> enquanto a janela estiver aberta. Atenção: essa escolha <strong>só pode ser feita uma vez</strong> e não pode ser alterada depois.</li>
          </ul>
        </section>

        <section class="regras-section">
          <h4>Pontuação por jogo</h4>
          <table class="regras-table">
            <thead>
              <tr><th>Acerto</th><th>Pontos</th><th>Exemplo</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Placar exato</td>
                <td class="pts">8 pts</td>
                <td>Apostou 2×1, saiu 2×1</td>
              </tr>
              <tr>
                <td>Saldo de gols certo (vencedor + diferença de gols)</td>
                <td class="pts">5 pts</td>
                <td>Apostou 2×1, saiu 3×2 — ambos venceu com +1 de saldo <em>(não se aplica a empates)</em></td>
              </tr>
              <tr>
                <td>Vencedor certo (saldo errado) ou empate certo (placar errado)</td>
                <td class="pts">3 pts</td>
                <td>Apostou 2×1, saiu 3×1 — acertou o vencedor mas não o saldo</td>
              </tr>
              <tr>
                <td>Nenhum dos acima</td>
                <td class="pts">0 pts</td>
                <td>Apostou 1×0, saiu 0×1</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="regras-section">
          <h4>Palpite de campeão</h4>
          <table class="regras-table">
            <thead>
              <tr><th>Acerto</th><th>Pontos</th></tr>
            </thead>
            <tbody>
              <tr><td>Acertou o campeão final</td><td class="pts">20 pts</td></tr>
              <tr><td>Errou o campeão</td><td class="pts">0 pts</td></tr>
            </tbody>
          </table>
          <p style="margin-top:8px;font-size:0.85rem;color:var(--cinza)">Os palpites de campeão ficam ocultos até que o administrador opte por revelá-los no ranking.</p>
        </section>

        <section class="regras-section">
          <h4>Exemplos completos de pontuação por jogo</h4>
          <ul>
            <li><strong>Resultado real: Brasil 2 × 1 Argentina</strong>
              <ul>
                <li>Apostou 2×1 → <strong>8 pts</strong> (placar exato)</li>
                <li>Apostou 3×2 → <strong>5 pts</strong> (vencedor Brasil, saldo +1 = correto)</li>
                <li>Apostou 2×0 → <strong>3 pts</strong> (acertou vencedor Brasil, saldo errado)</li>
                <li>Apostou 1×2 → <strong>0 pts</strong> (errou o vencedor)</li>
              </ul>
            </li>
            <li style="margin-top:10px"><strong>Resultado real: França 0 × 0 Espanha (empate)</strong>
              <ul>
                <li>Apostou 0×0 → <strong>8 pts</strong> (placar exato)</li>
                <li>Apostou 1×1 → <strong>3 pts</strong> (acertou o empate, mas placar errado)</li>
                <li>Apostou 2×0 → <strong>0 pts</strong> (errou — não empatou)</li>
              </ul>
            </li>
          </ul>
        </section>

        <section class="regras-section">
          <h4>Premiação</h4>
          <p>O valor arrecadado (R$ 30,00 por participante) será distribuído entre os três primeiros colocados:</p>
          <table class="regras-table">
            <thead><tr><th>Colocação</th><th>% do prêmio</th></tr></thead>
            <tbody>
              <tr><td>🥇 1º lugar</td><td class="pts">50%</td></tr>
              <tr><td>🥈 2º lugar</td><td class="pts">30%</td></tr>
              <tr><td>🥉 3º lugar</td><td class="pts">20%</td></tr>
            </tbody>
          </table>
        </section>

        <div class="modal-actions" style="justify-content:flex-end">
          <button onclick="closeRegrasModal()" class="btn btn-primary">Entendi!</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeRegrasModal(); });
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
}

function closeRegrasModal() {
  const overlay = document.getElementById('regras-modal');
  if (overlay) overlay.style.display = 'none';
}
