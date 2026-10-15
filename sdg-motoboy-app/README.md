# SDG Entregador - App Android (React Native + Expo) 🛵💨

Aplicativo nativo Android desenvolvido em **React Native / Expo** para os entregadores do **SDG Delivery**, projetado especificamente para **rastreamento GPS contínuo em tempo real mesmo com a tela apagada/bloqueada no bolso do motoboy**.

---

## 🚀 Por que este app resolve o problema do navegador web?

| Característica | Sistema Web no Navegador (Chrome/Android) | App Nativo Android (SDG Entregador) |
| :--- | :--- | :--- |
| **Tela Apagada / No Bolso** | ❌ O Android congela abas em segundo plano e desliga o GPS | ✅ **Rastreia 100% contínuo via Android Foreground Service** |
| **Conexão em Tempo Real** | ❌ O navegador derruba o WebSocket quando minimizado | ✅ Mantém envio contínuo para o Supabase (DB + Broadcast) |
| **Bateria do Celular** | ⚠️ Exigia tela ligada direto (esquenta e gasta bateria) | ✅ Tela fica apagada, consumindo o mínimo de bateria |
| **Abertura de Rotas** | ⚠️ Links lentos no navegador | ✅ Abre **Google Maps** ou **Waze** com 1 toque |
| **Contato com Cliente** | ⚠️ Precisa copiar número | ✅ Abre **WhatsApp** com mensagem pronta ou liga direto |

---

## 📱 Funcionalidades Principais

1. **Rastreamento em Segundo Plano (Foreground Service):**
   - Notificação contínua na barra de status do Android (`SDG Entregador: Rastreando rota`).
   - O sistema operacional Android é instruído a **nunca suspender o processo**.
   - Atualiza a cada poucos segundos / metros no banco `motoboy_locations` e no canal broadcast `sdg-motoboy-broadcast`.
2. **Painel de Pedidos Dividido por Abas:**
   - **Prontos:** Pedidos que saíram da cozinha aguardando motoboy coletar.
   - **Em Rota:** Pedidos ativos em entrega com você.
   - **Entregues:** Histórico de entregas realizadas hoje.
3. **Ações Rápidas por Pedido:**
   - 🗺️ **Google Maps:** Inicia a rota GPS para o endereço do cliente.
   - 🚗 **Waze:** Inicia navegação ponto a ponto no Waze.
   - 💬 **WhatsApp:** Envia mensagem personalizada: *"Olá [Cliente]! Sou o entregador do SDG Delivery e estou no seu portão!"*.
   - 📞 **Ligar:** Disca direto para o telefone do cliente.
   - 🛵 **Iniciar Entrega / Finalizar Entrega:** Atualiza o status em tempo real no painel da cozinha e no mapa do cliente.
4. **Resumo Financeiro do Dia:**
   - Contagem de entregas realizadas hoje.
   - Estimativa do total de taxas ganhas.
   - Acerto de caixa (valor total recolhido em dinheiro na entrega a repassar para o caixa).
5. **Ajustes e Conexão Supabase:**
   - Botão para alterar o nome do entregador (ex: *Carlos - Moto 01*).
   - Conexão pré-configurada com o Supabase do projeto, com botão de teste de conexão.
   - Guia interativo de otimização de bateria do Android.

---

## 🛠️ Como Testar no Celular com Expo Go

1. No celular Android do motoboy, baixe o app **Expo Go** na Google Play Store.
2. No computador, abra o terminal nesta pasta (`sdg-motoboy-app`):
   ```bash
   npx expo start
   ```
3. O terminal exibirá um **QR Code**.
4. Abra o app **Expo Go** no celular, toque em **"Scan QR code"** e aponte para o QR Code da tela do computador.
5. O aplicativo carregará instantaneamente no aparelho!

---

## 📦 Como Gerar o Arquivo APK Instalador para os Motoboys

Você pode gerar o arquivo `.apk` diretamente para enviar pelo WhatsApp para os motoboys instalarem no celular Android:

### Opção 1: Gerar APK na Nuvem (EAS Build - Gratuito e Fácil)
1. Instale o EAS CLI (se ainda não tiver):
   ```bash
   npm install -g eas-cli
   ```
2. Faça login na sua conta gratuita do Expo:
   ```bash
   npx eas login
   ```
3. Gere o APK:
   ```bash
   npx eas build -p android --profile preview
   ```
4. Ao finalizar, o terminal fornecerá um link direto para download do arquivo `.apk` que você pode mandar pelo WhatsApp para os motoboys instalarem!

### Opção 2: Gerar APK Localmente no Computador (Com Android SDK / Gradle)
```bash
npx expo prebuild
npx expo run:android --variant release
```

---

## 🔋 Regras Essenciais no Android do Motoboy (Tela Apagada)

Para garantir que celulares agressivos com bateria (Xiaomi/MIUI, Samsung, Motorola) não fechem o app depois de 10 minutos com a tela apagada:

1. **Permissão de Localização:**
   - Ao abrir o app, quando pedir permissão de localização, escolha **"Permitir o tempo todo"** (ou configure em *Configurações > Apps > SDG Entregador > Permissões > Localização > Permitir o tempo todo*).
2. **Economia de Bateria do Android:**
   - Acesse *Configurações > Apps > SDG Entregador > Bateria* e selecione **"Sem restrições"** (ou "Não otimizar").
   - Em aparelhos **Xiaomi/Redmi/Poco**, ative também a opção **"Início Automático" (Autostart)**.

---

## 🗄️ Estrutura de Arquivos

```text
sdg-motoboy-app/
├── app.json                       # Configurações nativas, permissões de GPS e serviço Android
├── package.json                   # Dependências do projeto (Expo 57, React Native 0.86)
├── index.js                       # Entrada raiz com registro do TaskManager nativo
├── App.js                         # Interface principal (Abas, Lista, Status GPS, Métricas)
├── eas.json                       # Configuração para geração de APK direto
└── src/
    ├── config/
    │   └── supabase.js            # Conexão singleton com o Supabase
    ├── services/
    │   ├── locationTask.js        # Foreground Service e transmissão GPS em segundo plano
    │   └── orderService.js        # Sincronização em tempo real dos pedidos
    ├── utils/
    │   ├── formatters.js          # Moeda (R$), datas e métodos de pagamento
    │   ├── navigation.js          # Links para Waze, Google Maps, WhatsApp e Telefone
    │   └── storage.js             # Armazenamento local de configurações e status
    └── components/
        ├── Header.js              # Barra superior com toggle Online/Pausa e perfil
        ├── GpsStatusCard.js       # Card indicador de status do GPS e métricas ao vivo
        ├── EarningsSummary.js     # Resumo de entregas do dia, taxas e dinheiro do caixa
        ├── OrderCard.js           # Cartão do pedido de alto contraste com botões de ação
        ├── SettingsModal.js       # Modal de configuração do Supabase e entregador
        ├── DriverProfileModal.js  # Modal rápido para alterar o nome do entregador
        └── BatteryOptimizationGuideModal.js # Guia passo a passo para telas apagadas
```
