import React, { useState, useEffect, memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useShop } from '../../contexts/ShopContext';
import { Modal } from '../ui/Modal';
import {
    CheckBadgeIcon, CheckCircleIcon, ClipboardDocListIcon, ClockIcon,
    CurrencyDollarIcon, MapPinIcon, XCircleIcon
} from '../icons';

export const TrackingModal = memo(({ isOpen, onClose, order }) => {
    const { pickupConfig } = useShop(); 
    const [trackingInfo, setTrackingInfo] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const isPickupOrder = order?.shipping_method === 'Retirar na loja';

    useEffect(() => {
        if (isOpen && order && !isPickupOrder && order.tracking_code) {
            const fetchTracking = async () => {
                setIsLoading(true);
                setError('');
                setTrackingInfo([]);
                try {
                    const data = await apiService(`/track/${order.tracking_code}`);
                    setTrackingInfo(data);
                } catch (err) {
                    setError(err.message || "Não foi possível obter informações de rastreio.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchTracking();
        }
    }, [isOpen, order, isPickupOrder]);

    const renderPickupStatus = () => {
        let statusMessage;
        switch (order.status) {
            case 'Pronto para Retirada':
                statusMessage = <p className="flex items-center gap-2 text-green-700 font-semibold"><CheckCircleIcon className="h-5 w-5"/> Seu pedido já está separado e pronto para ser retirado!</p>;
                break;
            case 'Entregue':
                statusMessage = <p className="flex items-center gap-2 text-green-700 font-semibold"><CheckBadgeIcon className="h-5 w-5"/> Este pedido já foi retirado.</p>;
                break;
            case 'Reembolsado':
                statusMessage = <p className="flex items-center gap-2 text-gray-700 font-semibold"><CurrencyDollarIcon className="h-5 w-5"/> O pagamento para este pedido foi reembolsado.</p>;
                break;
            case 'Cancelado':
            case 'Pagamento Recusado':
                 statusMessage = <p className="flex items-center gap-2 text-red-700 font-semibold"><XCircleIcon className="h-5 w-5"/> Este pedido foi cancelado.</p>;
                break;
            default:
                statusMessage = <p className="flex items-center gap-2 text-amber-700 font-semibold"><ClockIcon className="h-5 w-5"/> Estamos preparando seu pedido. Você será notificado assim que estiver pronto.</p>;
        }

        const address = pickupConfig?.address;
        const isAddressObj = typeof address === 'object' && address !== null;
        const pickupMapsLink = pickupConfig?.mapsLink ? String(pickupConfig.mapsLink).replace(/&amp;/g, '&') : '';
        
        const hours = pickupConfig?.hours || 'Segunda a Sábado, das 9h às 11h30 e das 15h às 17h30';
        const instructions = pickupConfig?.instructions || 'Apresentar documento com foto (RG/CNH) e número do pedido.';

        return (
            <div className="space-y-6 text-gray-800">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Status Atual: <span className="text-blue-600">{order.status}</span></h3>
                    <div className="p-4 bg-gray-100 rounded-lg border">
                        {statusMessage}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-900 mb-2">Instruções para Retirada</h3>
                    <div className="text-sm bg-gray-100 p-4 rounded-lg border space-y-3">
                        <div className="flex items-start gap-2">
                            <MapPinIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="w-full">
                                <p className="font-bold text-gray-800 mb-1">Endereço:</p>
                                {isAddressObj ? (
                                    <div className="space-y-1 bg-white p-3 border rounded-md shadow-sm">
                                        <div className="flex"><span className="font-bold text-gray-500 w-16">Rua:</span> <span className="text-gray-800 font-medium">{address.rua}</span></div>
                                        <div className="flex"><span className="font-bold text-gray-500 w-16">Nº:</span> <span className="text-gray-800">{address.numero}</span></div>
                                        <div className="flex"><span className="font-bold text-gray-500 w-16">Bairro:</span> <span className="text-gray-800">{address.bairro}</span></div>
                                        <div className="flex"><span className="font-bold text-gray-500 w-16">Cidade:</span> <span className="text-gray-800">{address.cidade}</span></div>
                                        <div className="flex"><span className="font-bold text-gray-500 w-16">Estado:</span> <span className="text-gray-800">{address.estado || address.uf}</span></div>
                                        <div className="flex"><span className="font-bold text-gray-500 w-16">CEP:</span> <span className="text-gray-800 font-mono bg-gray-100 px-1 rounded">{address.cep}</span></div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600">{address || 'R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB'}</p>
                                )}
                                
                                {pickupMapsLink && (
                                    <a href={pickupMapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-bold mt-2 inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                                        Abrir Localização no Google Maps &rarr;
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="flex items-start gap-2 pt-3 border-t border-gray-200">
                            <ClockIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p><strong>Horário:</strong><br/> <span className="text-gray-600">{hours}</span></p>
                        </div>
                        <div className="flex items-start gap-2 pt-3 border-t border-gray-200">
                            <ClipboardDocListIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p><strong>No momento da retirada, é necessário:</strong></p>
                                <p className="text-gray-600 mt-1">{instructions}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderShippingTracking = () => (
        <>
            {isLoading && <p>Buscando informações...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && trackingInfo.length > 0 && (
                <div className="space-y-6">
                    {trackingInfo.map((event, index) => (
                        <div key={index} className="flex space-x-4">
                            <div className="flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-amber-500' : 'bg-gray-300'}`}>
                                    {index === 0 && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                                {index < trackingInfo.length - 1 && <div className="w-px h-full bg-gray-300"></div>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{event.status}</p>
                                <p className="text-sm text-gray-600">{event.location}</p>
                                <p className="text-xs text-gray-400">{new Date(event.date).toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {!isLoading && !error && trackingInfo.length === 0 && (
                <p>Nenhuma informação de rastreio disponível no momento.</p>
            )}
        </>
    );

    return (
        <AnimatePresence>
            {isOpen && order && (
                <Modal isOpen={isOpen} onClose={onClose} title={isPickupOrder ? `Status da Retirada: Pedido #${order.id}` : `Rastreio do Pedido: ${order.tracking_code}`}>
                    {isPickupOrder ? renderPickupStatus() : renderShippingTracking()}
                </Modal>
            )}
        </AnimatePresence>
    );
});
