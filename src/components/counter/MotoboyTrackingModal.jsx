import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X, Bike, Store, MapPin, Navigation, Compass, Clock,
  RefreshCw, ChevronRight, User, Phone, CheckCircle2, ShieldAlert,
  Crosshair, Home, Eye, ExternalLink, Sparkles
} from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const MotoboyTrackingModal = ({ isOpen, onClose, targetDriverId, targetOrderId }) => {
  const { orders, motoboyLocations, storeSettings, sendMotoboyLocation, customer } = useOrder();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const storeMarkerRef = useRef(null);
  const userGpsMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);

  const [activeTab, setActiveTab] = useState(targetOrderId ? 'orders' : 'motoboys'); // 'motoboys' | 'orders'
  const [selectedDriverId, setSelectedDriverId] = useState(targetDriverId || null);
  const [selectedOrderId, setSelectedOrderId] = useState(targetOrderId || null);
  const [userCoords, setUserCoords] = useState(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // Store coordinates (Almenara - MG default: -16.1834, -40.6936)
  const isNearSP = storeSettings?.latitude && Math.abs(Number(storeSettings.latitude) - (-23.550520)) < 0.01;
  const storeLat = storeSettings?.latitude && !isNearSP ? Number(storeSettings.latitude) : -16.1834;
  const storeLng = storeSettings?.longitude && !isNearSP ? Number(storeSettings.longitude) : -40.6936;

  // Active delivery orders (in route or in preparation/ready)
  const deliveryOrders = useMemo(() => {
    return orders.filter(o => o.deliveryType === 'delivery' && o.status !== 'cancelado');
  }, [orders]);

  const inRouteOrders = useMemo(() => {
    return deliveryOrders.filter(o => o.status === 'saiu_para_entrega');
  }, [deliveryOrders]);

  // List of active motoboys with locations (combines direct motoboy signal + order deliveryGps)
  const activeMotoboys = useMemo(() => {
    const map = { ...(motoboyLocations || {}) };

    // Sincroniza também qualquer entregador ativo que tenha transmitido GPS no pedido
    inRouteOrders.forEach(o => {
      if (o.deliveryGps && o.deliveryGps.latitude && o.deliveryGps.longitude) {
        const id = o.deliveryGps.driverName || 'Entregador';
        if (!map[id] || new Date(o.deliveryGps.updatedAt || 0) > new Date(map[id].updatedAt || 0)) {
          map[id] = {
            id,
            driverName: id,
            orderId: o.id,
            latitude: Number(o.deliveryGps.latitude),
            longitude: Number(o.deliveryGps.longitude),
            speed: Number(o.deliveryGps.speed || 0),
            heading: Number(o.deliveryGps.heading || 0),
            accuracy: Number(o.deliveryGps.accuracy || 0),
            isOnline: true,
            updatedAt: o.deliveryGps.updatedAt || o.updatedAt || new Date().toISOString()
          };
        }
      }
    });

    return Object.values(map).filter(m => m && m.latitude && m.longitude);
  }, [motoboyLocations, inRouteOrders]);

  // Stable coordinate generator for order address around Almenara downtown
  const getOrderCoords = (order) => {
    if (!order) return [storeLat, storeLng];
    if (order.customerGps?.latitude && order.customerGps?.longitude) {
      return [Number(order.customerGps.latitude), Number(order.customerGps.longitude)];
    }
    const match = (order.address || '').match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
    let hash = 0;
    const seed = `${order.address || ''}_${order.customerPhone || ''}_${order.id}`;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const latOff = ((Math.abs(hash) % 1000) / 1000) * 0.018 - 0.009;
    const lngOff = (((Math.abs(hash) >> 3) % 1000) / 1000) * 0.018 - 0.009;
    return [storeLat + latOff, storeLng + lngOff];
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([storeLat, storeLng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Marcador da Loja / Restaurante (Sede em Almenara - MG)
      const storeIcon = L.divIcon({
        className: 'custom-store-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background: #0f172a; border: 2px solid #f59e0b; color: #f59e0b; padding: 4px 10px; border-radius: 9999px; font-weight: 900; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.6);">
              🏢 ${storeSettings?.restaurantName || 'Restaurante'} (Sede)
            </div>
            <div style="width: 16px; height: 16px; background: #f59e0b; border-radius: 50%; border: 3px solid #0f172a; margin-top: -3px; box-shadow: 0 0 14px #f59e0b;"></div>
          </div>
        `,
        iconSize: [140, 44],
        iconAnchor: [70, 42]
      });

      storeMarkerRef.current = L.marker([storeLat, storeLng], { icon: storeIcon })
        .addTo(map)
        .bindPopup(`
          <div style="padding: 6px; font-family: sans-serif;">
            <b style="color: #0f172a; font-size: 13px;">${storeSettings?.restaurantName || 'Sede da Loja'}</b>
            <p style="color: #475569; font-size: 11px; margin: 4px 0 0 0;">${storeSettings?.address || 'Centro, Almenara - MG'}</p>
            <div style="margin-top: 6px; font-size: 10px; color: #f59e0b; font-weight: bold;">
              📍 Ponto de Partida dos Motoboys (Almenara - MG)
            </div>
          </div>
        `);
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, storeLat, storeLng, storeSettings]);

  // Clean up on modal close
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
      storeMarkerRef.current = null;
      userGpsMarkerRef.current = null;
    }
  }, [isOpen]);

  // Sincroniza e focaliza o pedido ou entregador selecionado ao abrir ou atualizar
  useEffect(() => {
    if (!isOpen) return;

    if (targetOrderId) {
      setSelectedOrderId(targetOrderId);
      setActiveTab('orders');

      const order = deliveryOrders.find(o => o.id === targetOrderId);
      if (order && mapInstanceRef.current) {
        const destCoords = getOrderCoords(order);
        const moto = activeMotoboys.find(m => m.orderId === targetOrderId || m.driverName === order.deliveryGps?.driverName);

        const timer = setTimeout(() => {
          if (!mapInstanceRef.current) return;
          if (moto && moto.latitude && moto.longitude) {
            setSelectedDriverId(moto.id);
            const bounds = L.latLngBounds([
              [moto.latitude, moto.longitude],
              destCoords
            ]);
            mapInstanceRef.current.fitBounds(bounds, { padding: [70, 70], maxZoom: 17 });
          } else {
            mapInstanceRef.current.flyTo(destCoords, 16, { duration: 1 });
          }
        }, 350);

        return () => clearTimeout(timer);
      }
    } else if (targetDriverId) {
      setSelectedDriverId(targetDriverId);
      setActiveTab('motoboys');
      const moto = activeMotoboys.find(m => m.id === targetDriverId);
      if (moto && mapInstanceRef.current && moto.latitude && moto.longitude) {
        const timer = setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([moto.latitude, moto.longitude], 16, { duration: 1 });
          }
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, targetOrderId, targetDriverId, deliveryOrders, activeMotoboys]);

  // Linha de rota ao vivo conectando o motoboy ao endereço do cliente
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const activeOrder = selectedOrderId
      ? deliveryOrders.find(o => o.id === selectedOrderId)
      : deliveryOrders.find(o => o.status === 'saiu_para_entrega' && activeMotoboys.some(m => m.orderId === o.id || m.driverName === o.deliveryGps?.driverName));

    if (activeOrder) {
      const destCoords = getOrderCoords(activeOrder);
      const moto = activeMotoboys.find(m => m.orderId === activeOrder.id || m.driverName === activeOrder.deliveryGps?.driverName);

      if (moto && moto.latitude && moto.longitude) {
        const startCoords = [moto.latitude, moto.longitude];

        if (routePolylineRef.current) {
          routePolylineRef.current.setLatLngs([startCoords, destCoords]);
        } else {
          routePolylineRef.current = L.polyline([startCoords, destCoords], {
            color: '#10b981',
            weight: 4,
            opacity: 0.85,
            dashArray: '8, 8',
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
        }
        return;
      }
    }

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
  }, [selectedOrderId, selectedDriverId, activeMotoboys, deliveryOrders, storeLat, storeLng]);

  // Update Motoboy Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    activeMotoboys.forEach((moto) => {
      const isSelected = selectedDriverId === moto.id;
      const key = `moto_${moto.id}`;

      const iconHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: ${isSelected ? '#10b981' : '#0284c7'}; color: #ffffff; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 4px; border: 2px solid #ffffff;">
            <span>🛵 ${moto.driverName}</span>
            ${moto.speed > 0 ? `<span style="background: rgba(0,0,0,0.25); padding: 1px 4px; border-radius: 6px; font-size: 9px;">${moto.speed} km/h</span>` : ''}
          </div>
          <div style="position: relative; width: 16px; height: 16px; margin-top: -2px;">
            <div style="position: absolute; inset: -4px; background: ${isSelected ? '#10b981' : '#0284c7'}; border-radius: 50%; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; inset: 0; background: ${isSelected ? '#10b981' : '#0284c7'}; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: `custom-moto-pin-${moto.id}`,
        html: iconHtml,
        iconSize: [130, 44],
        iconAnchor: [65, 42]
      });

      if (markersRef.current[key]) {
        markersRef.current[key].setLatLng([moto.latitude, moto.longitude]);
        markersRef.current[key].setIcon(customIcon);
      } else {
        const marker = L.marker([moto.latitude, moto.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
              <h4 style="font-weight: 900; font-size: 13px; margin: 0; color: #0f172a;">🛵 ${moto.driverName}</h4>
              <p style="font-size: 11px; color: #475569; margin: 4px 0;">
                ${moto.orderId ? `<b>Levando Pedido:</b> #${moto.orderId}` : 'Disponível em trânsito'}
              </p>
              <div style="font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
                ${moto.speed > 0 ? `Velocidade: <b>${moto.speed} km/h</b><br/>` : 'Parado no momento<br/>'}
                Último sinal: ${formatDateTime(moto.updatedAt)}
              </div>
            </div>
          `);

        marker.on('click', () => {
          setSelectedDriverId(moto.id);
          setActiveTab('motoboys');
        });

        markersRef.current[key] = marker;
      }
    });

    Object.keys(markersRef.current).forEach((key) => {
      if (key.startsWith('moto_')) {
        const id = key.replace('moto_', '');
        if (!activeMotoboys.some(m => m.id === id)) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      }
    });
  }, [activeMotoboys, selectedDriverId]);

  // Update Customer / Order Pins on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    deliveryOrders.forEach((order) => {
      const isSelected = selectedOrderId === order.id;
      const key = `order_${order.id}`;
      const [orderLat, orderLng] = getOrderCoords(order);

      const isInRoute = order.status === 'saiu_para_entrega';
      const isDelivered = order.status === 'entregue';
      const badgeBg = isSelected ? '#ec4899' : (isInRoute ? '#f59e0b' : (isDelivered ? '#10b981' : '#6366f1'));

      const iconHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: ${badgeBg}; color: #ffffff; padding: 2px 7px; border-radius: 9999px; font-weight: 800; font-size: 10px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 3px; border: 2px solid #ffffff;">
            <span>🏠 ${order.customerName.split(' ')[0]}</span>
            <span style="background: rgba(0,0,0,0.25); padding: 0.5px 4px; border-radius: 4px; font-size: 8px;">#${order.id}</span>
          </div>
          <div style="width: 12px; height: 12px; background: ${badgeBg}; border-radius: 50%; border: 2px solid #ffffff; margin-top: -2px; box-shadow: 0 0 10px ${badgeBg};"></div>
        </div>
      `;

      const orderIcon = L.divIcon({
        className: `custom-order-pin-${order.id}`,
        html: iconHtml,
        iconSize: [120, 38],
        iconAnchor: [60, 36]
      });

      if (markersRef.current[key]) {
        markersRef.current[key].setLatLng([orderLat, orderLng]);
        markersRef.current[key].setIcon(orderIcon);
      } else {
        const marker = L.marker([orderLat, orderLng], { icon: orderIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; min-width: 200px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <b style="color: #0f172a; font-size: 12px;">Pedido #${order.id}</b>
                <span style="background: ${badgeBg}; color: white; padding: 1px 6px; border-radius: 9999px; font-size: 9px; font-weight: bold;">
                  ${order.status === 'saiu_para_entrega' ? 'EM ROTA' : order.status.toUpperCase()}
                </span>
              </div>
              <div style="font-size: 11px; color: #1e293b; font-weight: bold; margin-top: 4px;">
                👤 ${order.customerName}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                📍 ${order.address}
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                <span style="color: #64748b;">Total:</span>
                <b style="color: #059669;">${formatCurrency(order.total)}</b>
              </div>
            </div>
          `);

        marker.on('click', () => {
          setSelectedOrderId(order.id);
          setActiveTab('orders');
        });

        markersRef.current[key] = marker;
      }
    });

    Object.keys(markersRef.current).forEach((key) => {
      if (key.startsWith('order_')) {
        const id = key.replace('order_', '');
        if (!deliveryOrders.some(o => o.id === id)) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      }
    });
  }, [deliveryOrders, selectedOrderId, storeLat, storeLng]);

  // Marcador da Conta do Cliente Logado (se houver)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !customer?.name) return;

    const key = 'customer_account_pin';
    const [custLat, custLng] = getOrderCoords({
      address: customer.address || 'Centro, Almenara - MG',
      customerPhone: customer.phone,
      id: customer.id || 'me'
    });

    const custIcon = L.divIcon({
      className: 'custom-account-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: #9333ea; color: #ffffff; padding: 3px 9px; border-radius: 9999px; font-weight: 900; font-size: 10px; white-space: nowrap; box-shadow: 0 4px 12px rgba(147, 51, 234, 0.6); display: flex; align-items: center; gap: 4px; border: 2px solid #ffffff;">
            <span>⭐ Minha Conta: ${customer.name.split(' ')[0]}</span>
          </div>
          <div style="width: 14px; height: 14px; background: #9333ea; border-radius: 50%; border: 3px solid #ffffff; margin-top: -3px; box-shadow: 0 0 12px #9333ea;"></div>
        </div>
      `,
      iconSize: [140, 42],
      iconAnchor: [70, 40]
    });

    if (markersRef.current[key]) {
      markersRef.current[key].setLatLng([custLat, custLng]);
    } else {
      const marker = L.marker([custLat, custLng], { icon: custIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <b style="color: #9333ea; font-size: 12px;">⭐ Sua Conta de Teste</b>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #0f172a; font-weight: bold;">${customer.name}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">${customer.address || 'Endereço em Almenara - MG'}</p>
          </div>
        `);
      markersRef.current[key] = marker;
    }
  }, [customer, storeLat, storeLng]);

  // Focus on selected driver
  const handleFocusDriver = (driver) => {
    setSelectedDriverId(driver.id);
    if (mapInstanceRef.current && driver.latitude && driver.longitude) {
      mapInstanceRef.current.flyTo([driver.latitude, driver.longitude], 16, { duration: 1.2 });
      const key = `moto_${driver.id}`;
      if (markersRef.current[key]) {
        markersRef.current[key].openPopup();
      }
    }
  };

  // Focus on selected order
  const handleFocusOrder = (order) => {
    setSelectedOrderId(order.id);
    const coords = getOrderCoords(order);
    if (mapInstanceRef.current && coords) {
      mapInstanceRef.current.flyTo(coords, 16, { duration: 1.2 });
      const key = `order_${order.id}`;
      if (markersRef.current[key]) {
        markersRef.current[key].openPopup();
      }
    }
  };

  // Obter localização exata do aparelho do usuário (GPS nativo)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords([lat, lng]);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });

          const userIcon = L.divIcon({
            className: 'custom-user-gps-pin',
            html: `
              <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                <div style="background: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; white-space: nowrap; box-shadow: 0 4px 12px rgba(37,99,235,0.6); border: 2px solid #ffffff;">
                  📍 Você Está Aqui
                </div>
                <div style="position: relative; width: 16px; height: 16px; margin-top: -2px;">
                  <div style="position: absolute; inset: -4px; background: #2563eb; border-radius: 50%; opacity: 0.5; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                  <div style="position: absolute; inset: 0; background: #2563eb; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px #2563eb;"></div>
                </div>
              </div>
            `,
            iconSize: [120, 42],
            iconAnchor: [60, 40]
          });

          if (userGpsMarkerRef.current) {
            userGpsMarkerRef.current.setLatLng([lat, lng]);
          } else {
            userGpsMarkerRef.current = L.marker([lat, lng], { icon: userIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup(`
                <div style="padding: 4px; font-family: sans-serif;">
                  <b style="color: #2563eb; font-size: 12px;">📍 Sua Localização Atual</b>
                  <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">
                    Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}
                  </p>
                </div>
              `)
              .openPopup();
          }
        }
      },
      (err) => {
        setIsLocatingUser(false);
        alert('Não foi possível obter sua localização. Verifique as permissões de GPS do navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reset view to Almenara store and all active elements
  const handleResetView = () => {
    if (!mapInstanceRef.current) return;

    const points = [[storeLat, storeLng]];
    activeMotoboys.forEach(m => points.push([m.latitude, m.longitude]));
    deliveryOrders.forEach(o => points.push(getOrderCoords(o)));
    if (userCoords) points.push(userCoords);

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      mapInstanceRef.current.flyTo([storeLat, storeLng], 15);
    }
  };

  // Simulação de motoboy para teste no Centro de Almenara - MG
  const handleSimulateDriver = () => {
    const randomOffsetLat = (Math.random() - 0.5) * 0.015;
    const randomOffsetLng = (Math.random() - 0.5) * 0.015;
    const simLat = storeLat + randomOffsetLat;
    const simLng = storeLng + randomOffsetLng;
    const driverKey = `Entregador-${Math.floor(1 + Math.random() * 5)}`;

    sendMotoboyLocation({
      id: driverKey,
      driverName: driverKey,
      orderId: inRouteOrders[0]?.id || (deliveryOrders[0]?.id || 'PED-1001'),
      latitude: simLat,
      longitude: simLng,
      speed: Math.round(25 + Math.random() * 20),
      heading: Math.round(Math.random() * 360),
      accuracy: 6,
      isOnline: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Rastreamento em Almenara - MG
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 uppercase flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>GPS Ativo</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acompanhe motoboys na rua e o destino das contas e pedidos de clientes em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocatingUser}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Mostrar onde o seu aparelho está agora no mapa"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isLocatingUser ? 'animate-spin' : ''}`} />
              <span>{isLocatingUser ? 'Localizando...' : 'Meu GPS'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetView}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              title="Ajustar zoom para ver a loja, todos os motoboys e pedidos em Almenara"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Todos</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Fechar mapa"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content: Map + Side Panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">
          
          {/* MAP CANVAS (8 COLS ON DESKTOP) */}
          <div className="lg:col-span-8 relative h-full w-full bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Floating Map Legend Overlay */}
            <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-2xl shadow-xl text-xs space-y-1.5 pointer-events-auto">
              <div className="flex items-center space-x-2 text-[11px] font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>🏢 Loja Sede: Almenara - MG</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-bold text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>🛵 Motoboys Conectados ({activeMotoboys.length})</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-bold text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>🏠 Pedidos e Contas ({deliveryOrders.length})</span>
              </div>
            </div>

            {/* Floating Action Buttons */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-auto flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSimulateDriver}
                className="px-3 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs flex items-center space-x-1.5 shadow-xl transition-all cursor-pointer"
                title="Gera uma posição de teste em Almenara para você ver a moto andando pelas ruas"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Simular Posição (Teste)</span>
              </button>

              <button
                type="button"
                onClick={handleLocateMe}
                className="sm:hidden px-3 py-2 rounded-xl bg-blue-600/90 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xl transition-all cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Meu GPS</span>
              </button>
            </div>
          </div>

          {/* SIDE PANEL: TABS + LIST (4 COLS) */}
          <div className="lg:col-span-4 bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-hidden">
            
            {/* Panel Tabs */}
            <div className="p-2 border-b border-slate-800 bg-slate-900/50 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('motoboys')}
                className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'motoboys'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Motoboys ({activeMotoboys.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Contas & Pedidos ({deliveryOrders.length})</span>
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              
              {/* TAB: MOTOBOYS */}
              {activeTab === 'motoboys' && (
                <>
                  {activeMotoboys.length === 0 ? (
                    <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
                        <Bike className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-300">Nenhum motoboy transmitindo no momento</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Abra o app do motoboy no celular em <b>/motoboy</b> ou clique no botão abaixo para simular.
                      </p>
                      <button
                        type="button"
                        onClick={handleSimulateDriver}
                        className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer"
                      >
                        <span>Testar com Motoboy Simulado</span>
                      </button>
                    </div>
                  ) : (
                    activeMotoboys.map((moto) => {
                      const isSelected = selectedDriverId === moto.id;
                      const activeOrder = orders.find(o => o.id === moto.orderId);

                      return (
                        <div
                          key={moto.id}
                          onClick={() => handleFocusDriver(moto)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                            isSelected
                              ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black">
                                <Bike className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white">{moto.driverName}</h4>
                                <span className="text-[10px] text-slate-400">
                                  {moto.speed > 0 ? `🚴 Em trânsito (${moto.speed} km/h)` : '🟡 Parado no local'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center space-x-1 transition-all"
                            >
                              <span>Focar</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          {activeOrder ? (
                            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1">
                              <div className="flex justify-between font-bold">
                                <span className="text-amber-400">Pedido #{activeOrder.id}</span>
                                <span className="text-white">{formatCurrency(activeOrder.total)}</span>
                              </div>
                              <p className="text-slate-300 font-semibold truncate">
                                Cliente: {activeOrder.customerName}
                              </p>
                              <p className="text-slate-400 truncate text-[10px]">
                                End: {activeOrder.address}
                              </p>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 italic">
                              Disponível / Aguardando entrega
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/60 pt-2">
                            <span>Sinal: ±{moto.accuracy || 5}m</span>
                            <span>{formatDateTime(moto.updatedAt)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* TAB: ORDERS & CUSTOMER ACCOUNTS */}
              {activeTab === 'orders' && (
                <>
                  {/* Card da Conta Logada */}
                  {customer?.name && (
                    <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-1.5 shadow">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-black text-[10px] border border-purple-500/30 flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>SUA CONTA CONECTADA</span>
                        </span>
                        <span className="text-[10px] text-purple-400 font-bold">{customer.phone}</span>
                      </div>
                      <div className="text-xs font-black text-white">{customer.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        📍 {customer.address || 'Centro, Almenara - MG'}
                      </div>
                    </div>
                  )}

                  {deliveryOrders.length === 0 ? (
                    <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                      Nenhum pedido de entrega no momento.
                    </div>
                  ) : (
                    deliveryOrders.map((order) => {
                      const isSelected = selectedOrderId === order.id;
                      const isInRoute = order.status === 'saiu_para_entrega';

                      return (
                        <div
                          key={order.id}
                          onClick={() => handleFocusOrder(order)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                            isSelected
                              ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                #{order.id}
                              </span>
                              <span className="text-xs font-extrabold text-white truncate max-w-[140px]">
                                {order.customerName}
                              </span>
                            </div>

                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              isInRoute ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isInRoute ? '🛵 Em Rota' : order.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-start space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{order.address}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                            <span className="text-[10px] text-slate-400">Total:</span>
                            <span className="font-black text-emerald-400">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-900 text-center text-[11px] text-slate-400">
              Cidade Sede: <b className="text-white">Almenara - MG</b> • GPS e 4G Conectados
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
