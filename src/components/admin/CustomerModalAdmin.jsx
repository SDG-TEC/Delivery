import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, User, Phone, MapPin, Award, KeyRound, ShieldAlert, Camera, Upload, Loader2 } from 'lucide-react';
import { uploadMediaToSupabase } from '../../services/storageService';

export const CustomerModalAdmin = ({ isOpen, customer, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    address: '',
    total_orders: 1,
    pin: '',
    avatar_url: ''
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (customer) {
      // Extrair PIN de neighborhood se existir
      let extractedPin = '';
      if (customer.pin) {
        extractedPin = customer.pin;
      } else if (customer.neighborhood && customer.neighborhood.startsWith('PIN:')) {
        extractedPin = customer.neighborhood.replace('PIN:', '').trim();
      }

      setFormData({
        id: customer.id || '',
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        total_orders: customer.total_orders !== undefined ? Number(customer.total_orders) : 1,
        pin: extractedPin,
        avatar_url: customer.avatar_url || ''
      });
    } else {
      setFormData({
        id: '',
        name: '',
        phone: '',
        address: '',
        total_orders: 0,
        pin: '',
        avatar_url: ''
      });
    }
    setConfirmDelete(false);
  }, [customer, isOpen]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const res = await uploadMediaToSupabase(file, { folder: 'avatars', maxDim: 500 });
    setUploadingAvatar(false);

    if (res.url) {
      setFormData(prev => ({ ...prev, avatar_url: res.url }));
    } else {
      alert('Erro ao enviar foto: ' + (res.error || 'Falha no upload'));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Por favor, informe o nome do cliente.');
    if (!formData.phone.trim()) return alert('Por favor, informe o WhatsApp/telefone do cliente.');

    onSave({
      ...formData,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      total_orders: Number(formData.total_orders) || 0,
      pin: formData.pin.trim(),
      avatar_url: formData.avatar_url || ''
    });
    onClose();
  };

  const isEditing = Boolean(customer && customer.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {isEditing ? 'Editar Cadastro de Cliente' : 'Novo Cliente'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? `Alterando dados de ${formData.name || 'cliente'}` : 'Cadastre um cliente manualmente no sistema'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Foto de Perfil */}
          <div className="flex items-center space-x-3.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="relative w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt={formData.name || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-slate-500" />
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">Foto de Perfil do Cliente</p>
              <p className="text-[11px] text-slate-400 mb-1.5">Salva no Supabase Storage</p>
              <div className="flex items-center space-x-2">
                <label className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold cursor-pointer transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{uploadingAvatar ? 'Enviando...' : formData.avatar_url ? 'Trocar Foto' : 'Carregar Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
                {formData.avatar_url && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, avatar_url: '' }))}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
              Nome do Cliente *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                required
                placeholder="Ex: Carlos Oliveira"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
              WhatsApp / Telefone *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                required
                placeholder="(11) 99999-8888"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
              Endereço Padrão de Entrega
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Rua das Flores, 123 - Apto 45"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Fidelidade & PIN */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                Pedidos Feitos
              </label>
              <div className="relative">
                <Award className="w-4 h-4 absolute left-3 top-3 text-amber-400" />
                <input
                  type="number"
                  min="0"
                  value={formData.total_orders}
                  onChange={e => setFormData({ ...formData, total_orders: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-amber-400 font-black focus:border-amber-500 outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Carimbos Fidelidade</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                PIN de Acesso
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-purple-400" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6 dígitos"
                  value={formData.pin}
                  onChange={e => setFormData({ ...formData, pin: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-purple-400 font-mono font-bold focus:border-purple-500 outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Senha do cliente</span>
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          {isEditing && (
            confirmDelete ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onDelete(formData.id)}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-md"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center space-x-1.5 transition-all"
                title="Excluir cadastro do cliente"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            )
          )}

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isEditing ? 'Salvar Cliente' : 'Cadastrar'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
