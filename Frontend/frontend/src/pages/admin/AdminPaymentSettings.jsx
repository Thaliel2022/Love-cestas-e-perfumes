import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { CheckIcon, CreditCardIcon, SpinnerIcon } from '../../components/icons';

export const AdminPaymentSettings = () => {
    const [config, setConfig] = useState({ interest_free_installments: 4, max_installments: 10 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();

    useEffect(() => {
        apiService('/settings/payment-installments')
            .then(data => {
                setConfig({
                    interest_free_installments: Number(data.interest_free_installments) || 4,
                    max_installments: Number(data.max_installments) || 10
                });
            })
            .catch(() => notification.show('Erro ao carregar configurações de parcelamento.', 'error'))
            .finally(() => setIsLoading(false));
    }, []);

    const handleChange = (field, value) => {
        const numericValue = Math.max(1, Number(value) || 1);
        setConfig(prev => {
            const next = { ...prev, [field]: numericValue };
            if (field === 'interest_free_installments' && numericValue > next.max_installments) {
                next.max_installments = numericValue;
            }
            if (field === 'max_installments' && numericValue < next.interest_free_installments) {
                next.interest_free_installments = numericValue;
            }
            return next;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                interest_free_installments: Number(config.interest_free_installments) || 1,
                max_installments: Number(config.max_installments) || 1
            };
            const response = await apiService('/settings/payment-installments', 'PUT', payload);
            const savedConfig = response.config || payload;
            setConfig(savedConfig);
            window.dispatchEvent(new CustomEvent('payment-installments-updated', { detail: savedConfig }));
            notification.show('Configurações de parcelamento salvas com sucesso!');
        } catch (error) {
            notification.show(error.message || 'Erro ao salvar parcelamento.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-10"><SpinnerIcon className="h-8 w-8 text-indigo-600"/></div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Configurações de Parcelamento</h1>
                <p className="text-slate-500">Defina quantas parcelas serão exibidas no site e no checkout.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5 text-indigo-600"/> Parcelas do Cartão
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas sem juros</label>
                        <input
                            type="number"
                            min="1"
                            max="24"
                            value={config.interest_free_installments}
                            onChange={(e) => handleChange('interest_free_installments', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">Exemplo: 4 mostra “até 4x sem juros”.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de parcelas</label>
                        <input
                            type="number"
                            min="1"
                            max="24"
                            value={config.max_installments}
                            onChange={(e) => handleChange('max_installments', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">Parcelas acima do limite sem juros usam os juros retornados pelo Mercado Pago.</p>
                    </div>
                </div>

                <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-800">
                    O site exibirá <strong>{config.interest_free_installments}x sem juros</strong> e permitirá até <strong>{config.max_installments}x</strong> quando o Mercado Pago retornar essas opções para o valor da compra.
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
