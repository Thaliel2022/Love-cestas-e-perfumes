import React, { useMemo } from 'react';
import { Modal } from '../ui/Modal';
import {
    CheckBadgeIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon, HomeIcon,
    PackageIcon, TruckIcon, XCircleIcon
} from '../icons';

export const OrderStatusTimeline = ({ history, currentStatus, onStatusClick }) => {
    const STATUS_DEFINITIONS = useMemo(() => ({
        'Pendente': { title: 'Pedido Pendente', description: 'Aguardando a confirmação do pagamento. Se você pagou com boleto, pode levar até 2 dias úteis.', icon: <ClockIcon className="h-6 w-6" />, color: 'amber' },
        'Pagamento Aprovado': { title: 'Pagamento Aprovado', description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido para o envio.', icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green' },
        'Pagamento Recusado': { title: 'Pagamento Recusado', description: 'A operadora não autorizou o pagamento. Por favor, tente novamente ou use outra forma de pagamento.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Separando Pedido': { title: 'Separando Pedido', description: 'Seu pedido está sendo cuidadosamente separado e embalado em nosso estoque.', icon: <PackageIcon className="h-6 w-6" />, color: 'blue' },
        'Enviado': { title: 'Pedido Enviado', description: 'Seu pedido foi coletado pela transportadora e está a caminho do seu endereço. Use o código de rastreio para acompanhar.', icon: <TruckIcon className="h-6 w-6" />, color: 'blue' },
        'Saiu para Entrega': { title: 'Saiu para Entrega', description: 'O carteiro ou entregador saiu com sua encomenda para fazer a entrega no seu endereço hoje.', icon: <TruckIcon className="h-6 w-6" />, color: 'blue' },
        'Entregue': { title: 'Pedido Entregue', description: 'Seu pedido foi entregue com sucesso! Esperamos que goste.', icon: <HomeIcon className="h-6 w-6" />, color: 'green' },
        'Cancelado': { title: 'Pedido Cancelado', description: 'Este pedido foi cancelado. Se tiver alguma dúvida, entre em contato conosco.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Reembolsado': { title: 'Pedido Reembolsado', description: 'O valor deste pedido foi estornado. O prazo para aparecer na sua fatura depende da operadora do cartão.', icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray' }
    }), []);

    const colorClasses = useMemo(() => ({
        amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
        green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
        blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
        red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
        gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
    }), []);
    
    const timelineOrder = useMemo(() => [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue'
    ], []);

    // FILTRO DE SEGURANÇA: Garante que o histórico seja sempre uma lista válida de objetos com status.
    const historyMap = useMemo(() =>
        new Map(
            (Array.isArray(history) ? history : [])
                .filter(h => h && typeof h === 'object' && h.status)
                .map(h => [h.status, h])
        )
    , [history]);
    
    const currentStatusIndex = timelineOrder.indexOf(currentStatus);

    if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
        const specialStatus = STATUS_DEFINITIONS[currentStatus];
        if (!specialStatus) return <div className="p-4 bg-red-100 text-red-700 rounded-md">Status desconhecido: {currentStatus}</div>;

        const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
        return (
            <div className="p-4 bg-gray-800 rounded-lg">
                <div onClick={() => onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                        {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                        <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* --- VISTA DESKTOP --- */}
            <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                    
                    return (
                        <React.Fragment key={statusKey}>
                            <div 
                                className={`flex flex-col items-center ${isStepActive && statusInfo ? 'cursor-pointer group' : 'cursor-default'}`} 
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''}`}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                            </div>
                            {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${isStepActive ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* --- VISTA MOBILE --- */}
            <div className="md:hidden flex flex-col">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                    return (
                        <div key={statusKey} className="flex">
                            <div className="flex flex-col items-center mr-4">
                                <div 
                                    className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''} ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${index < currentStatusIndex ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                            </div>
                            <div 
                                className={`pt-1.5 pb-8 ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <p className={`font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const PickupOrderStatusTimeline = ({ history, currentStatus, onStatusClick }) => {
    const STATUS_DEFINITIONS = useMemo(() => ({
        'Pendente': { title: 'Pedido Pendente', description: 'Aguardando a confirmação do pagamento.', icon: <ClockIcon className="h-6 w-6" />, color: 'amber' },
        'Pagamento Aprovado': { title: 'Pagamento Aprovado', description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido.', icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green' },
        'Pagamento Recusado': { title: 'Pagamento Recusado', description: 'A operadora não autorizou o pagamento. Por favor, tente novamente ou use outra forma de pagamento.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Separando Pedido': { title: 'Separando Pedido', description: 'Seu pedido está sendo cuidadosamente separado e embalado.', icon: <PackageIcon className="h-6 w-6" />, color: 'blue' },
        'Pronto para Retirada': { title: 'Pronto para Retirada', description: 'Seu pedido está pronto! Você já pode vir retirá-lo em nosso endereço dentro do horário de funcionamento.', icon: <CheckCircleIcon className="h-6 w-6" />, color: 'blue' },
        'Entregue': { title: 'Pedido Retirado', description: 'Seu pedido foi retirado com sucesso! Esperamos que goste.', icon: <HomeIcon className="h-6 w-6" />, color: 'green' },
        'Cancelado': { title: 'Pedido Cancelado', description: 'Este pedido foi cancelado. Se tiver alguma dúvida, entre em contato conosco.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Reembolsado': { title: 'Pedido Reembolsado', description: 'O valor deste pedido foi estornado.', icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray' }
    }), []);

    const colorClasses = useMemo(() => ({
        amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
        green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
        blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
        red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
        gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
    }), []);
    
    const timelineOrder = useMemo(() => [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue'
    ], []);

    // FILTRO DE SEGURANÇA: Garante que o histórico seja sempre uma lista válida de objetos com status.
    const historyMap = useMemo(() =>
        new Map(
            (Array.isArray(history) ? history : [])
                .filter(h => h && typeof h === 'object' && h.status)
                .map(h => [h.status, h])
        )
    , [history]);

    const currentStatusIndex = timelineOrder.indexOf(currentStatus);

    if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
        const specialStatus = STATUS_DEFINITIONS[currentStatus];
        if (!specialStatus) return <div className="p-4 bg-red-100 text-red-700 rounded-md">Status desconhecido: {currentStatus}</div>;
        
        const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
        return (
            <div className="p-4 bg-gray-800 rounded-lg">
                <div onClick={() => onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                        {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                        <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* --- VISTA DESKTOP --- */}
            <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                    
                    return (
                        <React.Fragment key={statusKey}>
                            <div 
                                className={`flex flex-col items-center ${isStepActive && statusInfo ? 'cursor-pointer group' : 'cursor-default'}`} 
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''}`}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                            </div>
                            {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${isStepActive ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>
            {/* --- VISTA MOBILE --- */}
            <div className="md:hidden flex flex-col">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                    return (
                        <div key={statusKey} className="flex">
                            <div className="flex flex-col items-center mr-4">
                                <div 
                                    className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''} ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${index < currentStatusIndex ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                            </div>
                            <div 
                                className={`pt-1.5 pb-8 ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <p className={`font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export const StatusDescriptionModal = ({ isOpen, onClose, details }) => {
    if (!isOpen || !details) return null;

    const colorMap = {
        amber: { bg: 'bg-amber-100', icon: 'text-amber-600', title: 'text-amber-800' },
        green: { bg: 'bg-green-100', icon: 'text-green-600', title: 'text-green-800' },
        blue:  { bg: 'bg-blue-100', icon: 'text-blue-600', title: 'text-blue-800' },
        red:   { bg: 'bg-red-100', icon: 'text-red-600', title: 'text-red-800' },
        gray:  { bg: 'bg-gray-100', icon: 'text-gray-600', title: 'text-gray-800' }
    };

    const theme = colorMap[details.color] || colorMap.gray;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Status">
             <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme.bg} ${theme.icon} mb-4`}>
                    {React.cloneElement(details.icon, { className: 'h-8 w-8' })}
                </div>
                <h3 className={`text-xl font-bold ${theme.title} mb-2`}>{details.title}</h3>
                <p className="text-gray-600">{details.description}</p>
            </div>
        </Modal>
    );
};
