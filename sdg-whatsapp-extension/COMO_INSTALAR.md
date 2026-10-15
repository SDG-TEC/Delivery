# 🚀 Como Instalar e Usar a Extensão do WhatsApp Web no Google Chrome

Esta extensão adiciona uma **bolinha flutuante inteligente** diretamente dentro do seu WhatsApp Web (`web.whatsapp.com`) para que a pessoa no balcão possa lançar pedidos em menos de 10 segundos, reconhecer clientes automaticamente pelo telefone, calcular valores para fechamento de caixa, enviar para o motoboy e disparar a impressão na cozinha na impressora Elgin i8!

---

## 📥 Passo a Passo de Instalação no Google Chrome (1 Minuto)

1. Abra o navegador **Google Chrome**.
2. Na barra de endereços, digite:
   ```text
   chrome://extensions
   ```
   e aperte **Enter**.
3. No canto superior direito da tela, ative a chavinha **"Modo do desenvolvedor"** *(Developer mode)*.
4. No canto superior esquerdo, clique no botão **"Carregar sem compactação"** *(Load unpacked)*.
5. Na janela de seleção de pastas que se abrir, navegue até a pasta do seu projeto e selecione a pasta:
   ```text
   C:\Trabalho\SDG Delivery\sdg-whatsapp-extension
   ```
6. Pronto! A extensão **"SDG Delivery - Lançador Rápido WhatsApp & Balcão"** já estará instalada e ativa no seu Chrome.
7. *(Recomendado)* Clique no ícone de "quebra-cabeça" das extensões no canto superior direito do Chrome e clique no **alfinete 📌** ao lado de "SDG Delivery" para fixá-la na barra de ferramentas.

---

## 🎯 Como Usar no WhatsApp Web

1. Abra o **WhatsApp Web** normalmente em: [web.whatsapp.com](https://web.whatsapp.com).
2. Você verá a **bolinha flutuante do SDG Delivery** no canto inferior direito da tela.
   * **Arraste e Solte:** Você pode segurar e arrastar a bolinha para qualquer lugar da tela onde fique mais confortável para você.
3. **Clique na bolinha**: Ela abrirá instantaneamente o painel lateral de lançamento sem você precisar sair da conversa com o cliente!

---

## ✨ Recursos Principais da Extensão

### 1. 📲 Puxar Chat Aberto & Reconhecimento do Cliente
* Clique em **"📲 Puxar Chat Aberto"** para capturar o nome ou número do cliente da conversa que você está conversando.
* Assim que o número de telefone é digitado ou capturado:
  * Se o cliente **já comprou antes**, o sistema exibe o aviso verde com o total de pedidos e **já preenche automaticamente o Nome e o Endereço de Entrega** salvos no Supabase!
  * Se for um **novo cliente**, basta digitar o endereço que ele será cadastrado automaticamente no banco para os próximos pedidos.

### 2. ⚡ Lançamento Rápido com 1-Clique
* **Cardápio Rápido:** Clique nos botões dos produtos (X-Tudo, Misto Quente, Macarrão na Chapa, Pizzas, Coca 2L, etc.) para somá-los ao pedido na hora.
* **Digitação Manual:** Pode digitar qualquer nome e valor de item personalizado e clicar em "Adicionar Item".

### 3. 🪄 Aba "Colar do Zap" (Copia e Cola Inteligente)
* O cliente mandou uma mensagem grande com os pedidos? Basta copiar do WhatsApp, colar na aba **"Colar do Zap"** e clicar em **"Processar e Preencher Pedido"**.
* O sistema identifica automaticamente:
  * Nomes e quantidades dos itens
  * Endereço de entrega
  * Forma de pagamento (Pix, Dinheiro, Cartão)
  * Observações ("sem cebola", "ponto da carne", etc.)

### 4. 🚀 Lançar Pedido & Imprimir Cozinha
* Clique no botão dourado **"🚀 Lançar Pedido & Imprimir na Cozinha"**:
  * O pedido entra **imediatamente** no sistema com status de **Pagamento Confirmado**.
  * Aparece no **Painel do Balcão**, na **Linha de Produção da Cozinha (KDS)** e no **Painel do Motoboy** com endereço completo.
  * O valor entra no **Financeiro de Hoje** para fechamento de caixa.
  * O cupom é **impresso automaticamente na impressora Elgin i8** na cozinha.
* Em seguida, você tem 2 botões rápidos:
  * **"💬 Inserir no Chat do Zap":** Coloca o resumo bonitinho do pedido com emojis diretamente na caixa de mensagem do WhatsApp do cliente para você só apertar Enter!
  * **"📋 Copiar Resumo":** Copia a confirmação para a área de transferência.

### 5. 📋 Anotações & Fechamento de Caixa
* Na aba **"Anotações"**, você vê o resumo de quantos pedidos foram lançados no dia pelo WhatsApp e o **valor total faturado**.
* Cada pedido possui botões para **Re-imprimir** a qualquer momento ou re-copiar os dados.

### 6. 🔒 Sem Senha
* Não exige login nem senha de funcionários — conecta-se com segurança diretamente ao banco de dados Supabase do seu estabelecimento.
