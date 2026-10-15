import { registerRootComponent } from 'expo';

// Registra a tarefa nativa de rastreamento em segundo plano (TaskManager)
// antes de inicializar o componente App. Isso é crucial para o Android executar
// o rastreamento com a tela apagada/bloqueada.
import './src/services/locationTask';

import App from './App';

registerRootComponent(App);
