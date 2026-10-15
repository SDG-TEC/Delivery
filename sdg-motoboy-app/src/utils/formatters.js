export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const formatPaymentMethod = (method) => {
  switch (method) {
    case 'money':
    case 'cash':
      return 'Dinheiro na Entrega';
    case 'pix':
      return 'PIX Online';
    case 'card':
    case 'credit':
    case 'debit':
      return 'Cartão na Entrega';
    default:
      return method || 'Não informado';
  }
};
