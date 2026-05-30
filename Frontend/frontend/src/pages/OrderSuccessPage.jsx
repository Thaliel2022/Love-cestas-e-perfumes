import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useShop } from '../contexts/ShopContext';
import {
    ArrowUturnLeftIcon, BoletoIcon, CheckCircleIcon, CheckIcon, ClockIcon,
    DownloadIcon, HomeIcon, PixIcon, SpinnerIcon, XCircleIcon
} from '../components/icons';

export const OrderSuccessPage = ({ orderId, onNavigate, appName }) => {
    const { clearOrderState } = useShop();
    const notification = useNotification();
    
    // Status principais da página
    const [pageStatus, setPageStatus] = useState('processing'); // 'processing', 'success', 'timeout', 'pending_action', 'pix_pending', 'ticket_pending'
    const [paymentDetails, setPaymentDetails] = useState(null); // Dados do Pix/Boleto
    const [isCheckingManual, setIsCheckingManual] = useState(false);
    const [copied, setCopied] = useState(false);

    const statusRef = useRef(pageStatus);
    const pollsCount = useRef(0);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    useEffect(() => {
        statusRef.current = pageStatus;
    }, [pageStatus]);

    // Função principal que verifica o status do pedido e decide qual tela mostrar
    const pollStatus = useCallback(async (isManualCheck = false) => {
        try {
            // 1. Busca o status "Macro" do pedido
            const statusResponse = await apiService(`/orders/${orderId}/status?_t=${Date.now()}`);
            
            if (statusResponse.status) {
                // Se foi cancelado ou recusado
                if (statusResponse.status === 'Pagamento Recusado' || statusResponse.status === 'Cancelado') {
                    setPageStatus('pending_action');
                    return true;
                }
                
                // Se foi aprovado (Cartão de Crédito ou Pix pago rápido)
                if (statusResponse.status !== 'Pendente') {
                    setPageStatus('success');
                    return true; 
                }

                // Se o status macro for 'Pendente', precisamos investigar os detalhes do pagamento (se é Pix ou Boleto)
                if (statusResponse.status === 'Pendente') {
                    const detailsResponse = await apiService(`/orders/${orderId}/payment-details?_t=${Date.now()}`);
                    
                    if (detailsResponse && detailsResponse.payment_details) {
                        const details = detailsResponse.payment_details;
                        setPaymentDetails(details);
                        
                        // Direciona para a interface correta de acordo com o método
                        if (details.method === 'pix') {
                            setPageStatus('pix_pending');
                            return false; // Continua fazendo polling para ver se o pix foi pago
                        } else if (details.type === 'ticket') {
                            setPageStatus('ticket_pending');
                            return false; // Continua o polling para o boleto
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Erro ao verificar status na API.", err);
        }
        return false; 
    }, [orderId]);

    const handleManualCheck = async () => {
        setIsCheckingManual(true);
        try {
            const isFinished = await pollStatus(true);
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (!isFinished && statusRef.current !== 'success') {
                notification.show("Ainda não confirmado. Se acabou de pagar, pode levar alguns minutos.", "error");
            } else if (isFinished && statusRef.current === 'success') {
                notification.show("Pagamento identificado com sucesso!", "success");
            }
        } finally {
            setIsCheckingManual(false);
        }
    };

    // Copiar chave PIX
    const copyToClipboard = () => {
        if (paymentDetails && paymentDetails.qr_code) {
            navigator.clipboard.writeText(paymentDetails.qr_code);
            setCopied(true);
            notification.show("Código Pix copiado para a área de transferência!", "success");
            setTimeout(() => setCopied(false), 3000);
        }
    };

    useEffect(() => {
        clearOrderState(); 
        localStorage.removeItem('pendingOrderId');

        let pollInterval;
        let timeout;

        const startPolling = async () => {
            const isFinished = await pollStatus();
            if (isFinished) return; 

            // Verifica a cada 5 segundos (útil para ver o Pix aprovar na hora)
            pollInterval = setInterval(async () => {
                 pollsCount.current += 1;
                 const finished = await pollStatus();
                 if (finished) {
                     clearInterval(pollInterval);
                     clearTimeout(timeout);
                 } 
                 // Se passar 45 segundos e ainda for cartão processando (não caiu em pix nem boleto)
                 else if (pollsCount.current >= 9 && statusRef.current === 'processing') {
                     setPageStatus('timeout');
                 }
            }, 5000);
            
            // Timeout de segurança após 1 minuto de processamento cego.
            // Pix/boleto seguem em polling, pois o pagamento pode acontecer depois desse prazo.
            timeout = setTimeout(() => {
                if (statusRef.current === 'processing') {
                    clearInterval(pollInterval);
                    setPageStatus('timeout');
                }
            }, 60000);
        };

        startPolling();

        const checkWhenUserReturns = () => {
            if (document.visibilityState === 'hidden') return;
            if (!['success', 'pending_action'].includes(statusRef.current)) {
                pollStatus();
            }
        };

        window.addEventListener('focus', checkWhenUserReturns);
        document.addEventListener('visibilitychange', checkWhenUserReturns);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
            window.removeEventListener('focus', checkWhenUserReturns);
            document.removeEventListener('visibilitychange', checkWhenUserReturns);
        };
    }, [orderId, clearOrderState, pollStatus]); 

    // --- DESIGN PREMIUM POR ESTADO ---
    const renderContent = () => {
        switch (pageStatus) {
            case 'success':
                return {
                    icon: (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                            <CheckCircleIcon className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
                        </div>
                    ),
                    title: "Pagamento Aprovado!",
                    subtitle: "Tudo certo com o seu pedido 🎉",
                    message: `O pedido #${orderId} foi confirmado em nosso sistema. Já estamos preparando seus produtos para envio com muito carinho!`,
                    actions: (
                        <button onClick={() => onNavigate('account/orders')} className="bg-gradient-to-r from-amber-400 to-amber-500 text-black px-8 py-3.5 rounded-xl font-extrabold text-base sm:text-lg hover:from-amber-300 hover:to-amber-400 w-full shadow-lg hover:shadow-amber-500/25 transition-all transform active:scale-95">
                            Acompanhar Pedido
                        </button>
                    ),
                    borderColor: "border-green-500/30"
                };

            case 'pix_pending':
                return {
                    icon: (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(20,184,166,0.2)]">
                            <PixIcon className="h-10 w-10 sm:h-12 sm:w-12 text-teal-400" />
                        </div>
                    ),
                    title: "Aguardando Pagamento",
                    subtitle: "Falta pouco! Pague via Pix para aprovação imediata.",
                    message: null, // Custom content below
                    customBody: (
                        <div className="bg-black/40 rounded-2xl p-4 sm:p-6 mb-6 border border-gray-800/50">
                            {paymentDetails?.qr_code_base64 && (
                                <div className="bg-white p-3 rounded-xl w-fit mx-auto mb-5 shadow-lg">
                                    <img src={`data:image/jpeg;base64,${paymentDetails.qr_code_base64}`} alt="QR Code Pix" className="w-40 h-40 sm:w-48 sm:h-48 object-contain [image-rendering:-webkit-optimize-contrast] [image-rendering:crisp-edges]" decoding="sync" />
                                </div>
                            )}
                            
                            <p className="text-gray-300 text-sm mb-2 font-medium">Ou utilize o código Copia e Cola:</p>
                            
                            <div className="flex items-stretch bg-gray-900 border border-gray-700 rounded-lg overflow-hidden h-12 shadow-inner">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={paymentDetails?.qr_code || 'Gerando código...'} 
                                    className="bg-transparent text-gray-400 text-xs sm:text-sm px-3 w-full outline-none select-all"
                                />
                                <button 
                                    onClick={copyToClipboard}
                                    className={`px-4 sm:px-6 font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-teal-600 text-white hover:bg-teal-500'}`}
                                >
                                    {copied ? <><CheckIcon className="h-4 w-4"/> Copiado</> : 'COPIAR'}
                                </button>
                            </div>
                            <p className="text-gray-500 text-[10px] sm:text-xs mt-4">
                                Após o pagamento, esta tela será atualizada automaticamente em alguns segundos.
                            </p>
                        </div>
                    ),
                    actions: (
                        <div className="flex flex-col gap-3 w-full">
                            <button onClick={handleManualCheck} disabled={isCheckingManual} className="bg-gray-800 text-white border border-gray-600 px-6 py-3.5 rounded-xl font-bold hover:bg-gray-700 w-full transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                                {isCheckingManual ? <SpinnerIcon className="h-5 w-5"/> : <ArrowUturnLeftIcon className="h-5 w-5" />} 
                                {isCheckingManual ? 'Verificando...' : 'Já Paguei (Atualizar Tela)'}
                            </button>
                        </div>
                    ),
                    borderColor: "border-teal-500/30"
                };

            case 'ticket_pending':
                return {
                    icon: (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(156,163,175,0.2)]">
                            <BoletoIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                        </div>
                    ),
                    title: "Boleto Gerado",
                    subtitle: "Pedido reservado. Efetue o pagamento para concluir.",
                    message: null,
                    customBody: (
                        <div className="bg-black/40 rounded-2xl p-4 sm:p-6 mb-6 border border-gray-800/50 text-center">
                            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                                Seu boleto bancário foi gerado com sucesso. O pagamento pode levar de <strong>1 a 2 dias úteis</strong> para ser compensado após ser efetuado.
                            </p>

                            {paymentDetails?.barcode && (
                                <div className="mb-5 text-left">
                                    <p className="text-gray-400 text-xs font-bold uppercase mb-1">Código de Barras:</p>
                                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white font-mono text-xs sm:text-sm break-all shadow-inner">
                                        {paymentDetails.barcode}
                                    </div>
                                </div>
                            )}

                            {paymentDetails?.external_resource_url && (
                                <a 
                                    href={paymentDetails.external_resource_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 bg-gray-200 text-black px-6 py-3 rounded-xl font-bold hover:bg-white transition-colors w-full sm:w-auto shadow-md"
                                >
                                    <DownloadIcon className="h-5 w-5" /> Abrir Boleto (PDF)
                                </a>
                            )}
                        </div>
                    ),
                    actions: (
                        <div className="flex flex-col gap-3 w-full">
                            <button onClick={() => onNavigate('account/orders')} className="bg-gradient-to-r from-amber-400 to-amber-500 text-black px-8 py-3.5 rounded-xl font-extrabold text-base sm:text-lg hover:from-amber-300 hover:to-amber-400 w-full shadow-lg transition-all transform active:scale-95">
                                Acompanhar em "Meus Pedidos"
                            </button>
                            <button onClick={handleManualCheck} disabled={isCheckingManual} className="bg-gray-800/80 backdrop-blur text-white border border-gray-600 px-6 py-3.5 rounded-xl font-bold hover:bg-gray-700 w-full transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                                {isCheckingManual ? <SpinnerIcon className="h-5 w-5"/> : <ArrowUturnLeftIcon className="h-5 w-5" />} 
                                {isCheckingManual ? 'Verificando...' : 'Atualizar Status'}
                            </button>
                        </div>
                    ),
                    borderColor: "border-gray-500/30"
                };

            // CORREÇÃO: Nova mensagem guiando o usuário a refazer o pedido na tela de detalhes
            case 'pending_action':
                return {
                    icon: (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                            <XCircleIcon className="h-10 w-10 sm:h-12 sm:w-12 text-red-500" />
                        </div>
                    ),
                    title: "Pagamento Recusado",
                    subtitle: "NÃO CONSEGUIMOS PROCESSAR SEU PAGAMENTO.",
                    message: `A operadora do seu cartão recusou o pagamento do pedido #${orderId}. Fique tranquilo, você não foi cobrado. Acesse os detalhes deste pedido e clique em "Repetir Pedido" para tentar novamente.`,
                    actions: (
                        <div className="flex flex-col gap-4 w-full">
                             <button 
                                onClick={() => onNavigate(`account/orders/${orderId}`)} 
                                className={`px-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 w-full transition-all shadow-lg bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:shadow-amber-500/30 active:scale-95`}
                            >
                                Ver Detalhes e Repetir Pedido
                            </button>
                        </div>
                    ),
                    borderColor: "border-red-500/30"
                };

            case 'timeout':
                return {
                    icon: (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ClockIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                        </div>
                    ),
                    title: "Processando Pagamento...",
                    subtitle: "Isso pode levar alguns minutos.",
                    message: `O pedido #${orderId} foi registrado. Estamos aguardando a confirmação final da operadora do seu cartão. Assim que for processado, atualizaremos automaticamente a seção Meus Pedidos.`,
                    actions: (
                        <button onClick={() => onNavigate('account/orders')} className="bg-gray-800 border border-gray-700 text-white px-8 py-3.5 rounded-xl font-bold text-base sm:text-lg hover:bg-gray-700 w-full shadow-lg transition-all active:scale-95">
                            Ir para Meus Pedidos
                        </button>
                    ),
                    borderColor: "border-gray-600/30"
                };

            case 'processing':
            default:
                return {
                    icon: (
                        <div className="relative mb-8 w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center">
                            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping"></div>
                            <div className="absolute inset-2 bg-amber-500/30 rounded-full animate-pulse"></div>
                            <SpinnerIcon className="h-10 w-10 sm:h-12 sm:w-12 text-amber-400 relative z-10 animate-spin" />
                        </div>
                    ),
                    title: "Confirmando Pagamento",
                    subtitle: "POR FAVOR, NÃO FECHE ESTA JANELA.",
                    message: "Estamos validando seu pagamento com o Mercado Pago. Isso leva apenas alguns segundos.",
                    actions: null,
                    borderColor: "border-amber-500/30"
                };
        }
    };

    const { icon, title, subtitle, message, customBody, actions, borderColor } = renderContent();
    const displayName = appName || 'Love Cestas';

    return (
        <div className="bg-black text-white min-h-[100dvh] flex flex-col justify-start md:justify-center items-center p-4 pt-10 pb-28 md:py-8 relative overflow-x-hidden overflow-y-auto">
            
            {/* Efeitos de Luz de Fundo (Atrás de tudo) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 md:top-1/4 left-0 md:left-1/4 w-72 h-72 md:w-96 md:h-96 bg-amber-600/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 md:bottom-1/4 right-0 md:right-1/4 w-72 h-72 md:w-96 md:h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
            </div>

            {/* Cartão de Confirmação Premium — blur só no fundo (evita QR/texto embaçados no Safari/WebKit) */}
            <div className={`relative z-10 max-w-lg w-full transition-all duration-500 my-auto`}>
                <div className={`absolute inset-0 rounded-3xl border ${borderColor} shadow-2xl overflow-hidden pointer-events-none`} aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-900/90" />
                    <div className="absolute inset-0 backdrop-blur-xl" />
                </div>
                <div className="relative text-center p-6 sm:p-10 isolate">
                
                {icon}
                
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">{title}</h1>
                <p className="text-amber-400 font-bold mb-6 uppercase tracking-widest text-[10px] sm:text-xs">{subtitle}</p>
                
                {customBody ? customBody : (
                    message && (
                        <div className="bg-black/50 rounded-2xl p-5 mb-8 border border-gray-800/50 shadow-inner">
                            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                                {message}
                            </p>
                        </div>
                    )
                )}
                
                <div className="flex flex-col items-center gap-4 w-full mt-2">
                    {actions}
                    
                    {pageStatus !== 'processing' && (
                        <button onClick={() => onNavigate('home')} className="text-gray-500 hover:text-white transition-colors text-sm mt-2 font-medium flex items-center justify-center gap-1.5 w-full py-2">
                            <HomeIcon className="h-4 w-4" /> Voltar à Página Inicial
                        </button>
                    )}
                </div>
                </div>
            </div>

            {/* Aviso Inteligente: Se abriu no navegador mas o usuário tem o PWA */}
            {!isStandalone && pageStatus !== 'processing' && (
                <div className="mt-8 p-4 bg-blue-900/30 border border-blue-800/50 rounded-xl max-w-lg w-full text-center relative z-10 backdrop-blur-md animate-fade-in">
                    <p className="text-xs sm:text-sm text-blue-200">
                        <strong className="text-blue-400">Dica de Acesso:</strong> Parece que você está no navegador do celular. Se você já instalou o nosso aplicativo, recomendamos fechar esta janela e voltar a abrir o app <strong>{displayName}</strong> para a melhor experiência!
                    </p>
                </div>
            )}
        </div>
    );
};
