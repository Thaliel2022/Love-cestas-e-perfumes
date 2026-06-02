import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Modal } from '../../components/ui/Modal';
import { CheckIcon, CreditCardIcon, SpinnerIcon } from '../../components/icons';

export const AdminPaymentSettings = () => {
    const [config, setConfig] = useState({ interest_free_installments: 4, max_installments: 10, min_installment_amount: 100 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInput, setAuthInput] = useState('');
    const [isSyncingMp, setIsSyncingMp] = useState(false);
    const [mpCurrent, setMpCurrent] = useState(null);
    const notification = useNotification();

    const clampInstallmentValue = (value, fallback = 1) => {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? Math.max(1, Math.min(24, parsed)) : fallback;
    };

    const normalizePaymentConfig = (currentConfig) => {
        const interestFreeInstallments = clampInstallmentValue(currentConfig.interest_free_installments, 1);
        const maxInstallments = Math.max(
            interestFreeInstallments,
            clampInstallmentValue(currentConfig.max_installments, interestFreeInstallments)
        );
        const minInstallmentAmount = Math.max(0, Number(currentConfig.min_installment_amount) || 0);

        return {
            interest_free_installments: interestFreeInstallments,
            max_installments: maxInstallments,
            min_installment_amount: minInstallmentAmount
        };
    };

    useEffect(() => {
        apiService('/settings/payment-installments')
            .then(data => {
                setConfig({
                    interest_free_installments: Number(data.interest_free_installments) || 4,
                    max_installments: Number(data.max_installments) || 10,
                    min_installment_amount: Number.isFinite(Number(data.min_installment_amount)) ? Number(data.min_installment_amount) : 100
                });
            })
            .catch(() => notification.show('Erro ao carregar configurações de parcelamento.', 'error'))
            .finally(() => setIsLoading(false));
    }, []);

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleBlur = () => {
        setConfig(prev => normalizePaymentConfig(prev));
    };

    const handleSave = () => {
        setIsAuthModalOpen(true);
    };

    const confirmSaveWithAuth = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const normalizedConfig = normalizePaymentConfig(config);
            const payload = {
                ...normalizedConfig,
                password: authInput,
                token: authInput.length === 6 && !isNaN(authInput) ? authInput : null
            };
            const response = await apiService('/settings/payment-installments', 'PUT', payload);
            const savedConfig = response.config || payload;
            setConfig(savedConfig);
            window.dispatchEvent(new CustomEvent('payment-installments-updated', { detail: savedConfig }));
            setIsAuthModalOpen(false);
            setAuthInput('');
            notification.show('Configurações de parcelamento salvas com sucesso!');
        } catch (error) {
            notification.show(error.message || 'Erro ao salvar parcelamento. Verifique sua senha ou código 2FA.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const syncInterestFreeFromMercadoPago = async () => {
        setIsSyncingMp(true);
        try {
            const data = await apiService('/settings/payment-installments/mercadopago-current');
            setMpCurrent(data);
            setConfig(prev => ({
                ...prev,
                interest_free_installments: Number(data.interest_free_installments) || prev.interest_free_installments
            }));
            notification.show(`Mercado Pago retornou ${data.interest_free_installments}x sem juros para o valor de referência.`);
        } catch (error) {
            notification.show(error.message || 'Erro ao consultar o Mercado Pago.', 'error');
        } finally {
            setIsSyncingMp(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-10"><SpinnerIcon className="h-8 w-8 text-indigo-600"/></div>;

    const previewConfig = normalizePaymentConfig(config);

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {isAuthModalOpen && (
                <Modal isOpen={true} onClose={() => setIsAuthModalOpen(false)} title="Confirmação de Segurança">
                    <form onSubmit={confirmSaveWithAuth} className="space-y-4">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <p className="text-sm text-yellow-700">
                                Alterar parcelamento afeta preço, checkout e comunicação com o cliente. Confirme sua <strong>senha</strong> ou código <strong>2FA</strong> para salvar.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Senha ou Código 2FA</label>
                            <input
                                type="password"
                                value={authInput}
                                onChange={(e) => setAuthInput(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Digite sua senha ou token..."
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setIsAuthModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70">
                                {isSaving && <SpinnerIcon className="h-4 w-4"/>}
                                Confirmar e Salvar
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <div>
                <h1 className="text-3xl font-bold text-slate-800">Configurações de Parcelamento</h1>
                <p className="text-slate-500">Defina o número máximo de parcelas do checkout. As parcelas <strong>sem juros</strong> são controladas no Mercado Pago.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5 text-indigo-600"/> Parcelas do Cartão
                </h3>

                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                    <p className="font-bold mb-1">As parcelas SEM JUROS não são definidas aqui.</p>
                    <p>
                        Quantas parcelas são sem juros no checkout é uma configuração da sua conta no Mercado Pago, em
                        <strong> Negócio &gt; Configurações &gt; Taxas e parcelas &gt; Checkout</strong>. O site não consegue forçar isso —
                        ele apenas exibe o que o Mercado Pago retorna. Alterações lá podem demorar algumas horas para propagar.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de parcelas (controla o checkout)</label>
                        <input
                            type="number"
                            min="1"
                            max="24"
                            value={config.max_installments}
                            onChange={(e) => handleChange('max_installments', e.target.value)}
                            onBlur={handleBlur}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">Limite total de parcelas exibidas no checkout. Esta é a única opção que o site realmente controla.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas sem juros (apenas exibição)</label>
                        <input
                            type="number"
                            min="1"
                            max="24"
                            value={config.interest_free_installments}
                            onChange={(e) => handleChange('interest_free_installments', e.target.value)}
                            onBlur={handleBlur}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">Usado só no texto da página do produto (ex.: “em até 4x sem juros”). <strong>Mantenha igual</strong> ao configurado no Mercado Pago para não confundir o cliente no checkout.</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={syncInterestFreeFromMercadoPago}
                                disabled={isSyncingMp}
                                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
                            >
                                {isSyncingMp && <SpinnerIcon className="h-4 w-4"/>}
                                Buscar no Mercado Pago
                            </button>
                            {mpCurrent && (
                                <span className="text-xs text-blue-700">
                                    MP retornou <strong>{mpCurrent.interest_free_installments}x sem juros</strong> para R$ {Number(mpCurrent.amount).toFixed(2).replace('.', ',')}.
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor mínimo para parcelar (R$)</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={config.min_installment_amount}
                            onChange={(e) => handleChange('min_installment_amount', e.target.value)}
                            onBlur={handleBlur}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">Abaixo deste valor, o produto só pode ser pago à vista (1x). Ex.: 100 = produtos abaixo de R$100 não parcelam. Use 0 para permitir parcelar qualquer valor.</p>
                    </div>
                </div>

                <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-800">
                    Compras a partir de <strong>R$ {Number(previewConfig.min_installment_amount).toFixed(2).replace('.', ',')}</strong> poderão ser parceladas em até <strong>{previewConfig.max_installments}x</strong>; abaixo disso, apenas à vista. As parcelas sem juros exibidas serão as que o <strong>Mercado Pago</strong> retornar para o valor da compra.
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-md flex items-center gap-2 disabled:opacity-70 active:scale-95 transition-all">
                    {isSaving ? <SpinnerIcon className="h-5 w-5"/> : <CheckIcon className="h-5 w-5"/>}
                    Salvar Parcelamento
                </button>
            </div>
        </div>
    );
};
